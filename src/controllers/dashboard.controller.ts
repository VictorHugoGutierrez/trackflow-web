import { Request, Response } from "express";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3333";

export interface Project {
  id: string;
  name: string;
  budgetHours?: number | null;
  status?: string;
  clientId?: string | null;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status?: string;
  estimatedHours?: number | null;
}

export interface TimeEntry {
  id: string;
  start: string;
  end?: string | null;
  duration?: number | null;
  description?: string | null;
  billable: boolean;
  projectId?: string | null;
  taskId?: string | null;
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
}

export class DashboardController {
  static async renderDashboard(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    let activeEntry: TimeEntry | null = null;
    let timeEntries: TimeEntry[] = [];
    let projects: Project[] = [];
    let tasks: Task[] = [];

    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        }
      : {};

    try {
      if (token) {
        const [resActive, resEntries, resProjects, resTasks] = await Promise.allSettled([
          axios.get(`${API_URL}/api/time-entries/active`, { headers, timeout: 2500 }),
          axios.get(`${API_URL}/api/time-entries?limit=30`, { headers, timeout: 2500 }),
          axios.get(`${API_URL}/api/projects`, { headers, timeout: 2500 }),
          axios.get(`${API_URL}/api/tasks`, { headers, timeout: 2500 }),
        ]);

        if (resActive.status === "fulfilled" && resActive.value.data?.success) {
          activeEntry = resActive.value.data.data;
        }

        if (resEntries.status === "fulfilled" && resEntries.value.data?.success) {
          timeEntries = resEntries.value.data.data || [];
        }

        if (resProjects.status === "fulfilled" && resProjects.value.data?.success) {
          projects = resProjects.value.data.data || [];
        }

        if (resTasks.status === "fulfilled" && resTasks.value.data?.success) {
          tasks = resTasks.value.data.data || [];
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados operacionais do workspace:", err.message);
    }

    // Calcular métricas
    let totalSecondsToday = 0;
    let billableSecondsToday = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    timeEntries.forEach((entry) => {
      const isToday = entry.start && entry.start.startsWith(todayStr);
      const dur = entry.duration || 0;
      if (isToday) {
        totalSecondsToday += dur;
        if (entry.billable) billableSecondsToday += dur;
      }
    });

    const hoursToday = (totalSecondsToday / 3600).toFixed(1);
    const billablePercent =
      totalSecondsToday > 0
        ? Math.round((billableSecondsToday / totalSecondsToday) * 100)
        : 100;

    return res.render("dashboard", {
      pageTitle: "TrackFlow - Painel Operacional",
      activeTab: "dashboard",
      user: req.user,
      activeEntry,
      timeEntries,
      projects,
      tasks,
      metrics: {
        hoursToday,
        billablePercent,
        entriesCountToday: timeEntries.filter((e) => e.start && e.start.startsWith(todayStr)).length,
        projectsCount: projects.length,
      },
      apiUrl: API_URL,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  }

  static async startTimeEntry(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { description, projectId, taskId, billable } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/time-entries/start`,
        {
          description: description || undefined,
          projectId: projectId || undefined,
          taskId: taskId || undefined,
          billable: billable === "true" || billable === true || billable === "on",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) {
        return res.status(201).json(response.data);
      }
      return res.redirect("/dashboard?success=Cronômetro+iniciado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao iniciar cronômetro.";
      if (wantsJson) {
        return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  static async stopTimeEntry(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id, description, projectId, taskId, billable } = req.body;
    const targetId = id || req.params.id;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/time-entries/${targetId}/stop`,
        {
          description: description || undefined,
          projectId: projectId || undefined,
          taskId: taskId || undefined,
          billable: billable !== undefined ? billable === "true" || billable === true || billable === "on" : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) {
        return res.status(200).json(response.data);
      }
      return res.redirect("/dashboard?success=Apontamento+salvo+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao parar cronômetro.";
      if (wantsJson) {
        return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  static async createManualEntry(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { description, projectId, taskId, start, end, billable } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/time-entries`,
        {
          description: description || undefined,
          projectId: projectId || undefined,
          taskId: taskId || undefined,
          start,
          end,
          billable: billable === "true" || billable === true || billable === "on",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) {
        return res.status(201).json(response.data);
      }
      return res.redirect("/dashboard?success=Apontamento+manual+registrado!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao registrar apontamento manual.";
      if (wantsJson) {
        return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  static async updateTimeEntry(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { description, projectId, taskId, start, end, billable } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/time-entries/${id}`,
        {
          description: description !== undefined ? description : undefined,
          projectId: projectId || null,
          taskId: taskId || null,
          start: start || undefined,
          end: end || undefined,
          billable: billable !== undefined ? (billable === "true" || billable === true || billable === "on") : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) {
        return res.status(200).json(response.data);
      }
      return res.redirect("/dashboard?success=Apontamento+atualizado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar apontamento.";
      if (wantsJson) {
        return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  static async deleteTimeEntry(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      await axios.delete(`${API_URL}/api/time-entries/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        timeout: 4000,
      });

      if (wantsJson) {
        return res.status(200).json({ success: true });
      }
      return res.redirect("/dashboard?success=Apontamento+excluído+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao excluir apontamento.";
      if (wantsJson) {
        return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  static async createProject(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { name, budgetHours, clientId } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/projects`,
        {
          name,
          budgetHours: budgetHours ? Number(budgetHours) : undefined,
          clientId: clientId || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) {
        return res.status(201).json(response.data);
      }
      return res.redirect("/dashboard?success=Projeto+criado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao criar projeto.";
      if (wantsJson) {
        return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  static async createTask(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { projectId, title, estimatedHours } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/tasks`,
        { projectId, title, estimatedHours: estimatedHours ? Number(estimatedHours) : undefined },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) {
        return res.status(201).json(response.data);
      }
      return res.redirect("/dashboard?success=Tarefa+criada+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao criar tarefa.";
      if (wantsJson) {
        return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }
}
