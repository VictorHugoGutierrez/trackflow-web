import { Request, Response } from "express";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3333";

export interface Client {
  id: string;
  name: string;
  contact?: string | null;
  active: boolean;
  createdAt?: string;
  projects?: { id: string; name: string }[];
}

export interface Project {
  id: string;
  name: string;
  budgetHours?: number | null;
  status: "em_andamento" | "concluido" | "arquivado";
  clientId?: string | null;
  client?: Client | null;
  createdAt?: string;
  tasks?: any[];
}

export class ClientProjectController {
  static async render(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const tab = req.query.tab === "clients" ? "clients" : "projects";

    let clients: Client[] = [];
    let projects: Project[] = [];

    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        }
      : {};

    try {
      if (token) {
        const [resClients, resProjects] = await Promise.allSettled([
          axios.get(`${API_URL}/api/clients`, { headers, timeout: 2500 }),
          axios.get(`${API_URL}/api/projects`, { headers, timeout: 2500 }),
        ]);

        if (resClients.status === "fulfilled" && resClients.value.data?.success) {
          clients = resClients.value.data.data || [];
        }

        if (resProjects.status === "fulfilled" && resProjects.value.data?.success) {
          projects = resProjects.value.data.data || [];
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar Clientes e Projetos:", err.message);
    }

    // Calcular Métricas
    const projectMetrics = {
      total: projects.length,
      inProgress: projects.filter((p) => p.status === "em_andamento").length,
      completed: projects.filter((p) => p.status === "concluido").length,
      archived: projects.filter((p) => p.status === "arquivado").length,
    };

    const clientMetrics = {
      total: clients.length,
      active: clients.filter((c) => c.active !== false).length,
      inactive: clients.filter((c) => c.active === false).length,
    };

    return res.render("projects/index", {
      pageTitle: "TrackFlow - Clientes & Projetos",
      activeTab: "projects",
      currentTab: tab,
      user: req.user,
      clients,
      projects,
      projectMetrics,
      clientMetrics,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  }

  // --- Clientes ---
  static async createClient(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { name, contact } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/clients`,
        { name, contact: contact || undefined },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) return res.status(201).json(response.data);
      return res.redirect("/projects?tab=clients&success=Cliente+cadastrado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao cadastrar cliente.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=clients&error=${encodeURIComponent(msg)}`);
    }
  }

  static async updateClient(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { name, contact, active } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/clients/${id}`,
        {
          name: name || undefined,
          contact: contact !== undefined ? contact : undefined,
          active: active !== undefined ? (active === "true" || active === true || active === "on") : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/projects?tab=clients&success=Cliente+atualizado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar cliente.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=clients&error=${encodeURIComponent(msg)}`);
    }
  }

  static async deleteClient(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      await axios.delete(`${API_URL}/api/clients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        timeout: 4000,
      });

      if (wantsJson) return res.status(200).json({ success: true });
      return res.redirect("/projects?tab=clients&success=Cliente+removido+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao remover cliente.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=clients&error=${encodeURIComponent(msg)}`);
    }
  }

  // --- Projetos ---
  static async createProject(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { name, clientId, budgetHours, status } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/projects`,
        {
          name,
          clientId: clientId || undefined,
          budgetHours: budgetHours ? Number(budgetHours) : undefined,
          status: status || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) return res.status(201).json(response.data);
      return res.redirect("/projects?tab=projects&success=Projeto+criado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao criar projeto.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=projects&error=${encodeURIComponent(msg)}`);
    }
  }

  static async updateProject(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { name, clientId, budgetHours, status } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/projects/${id}`,
        {
          name: name || undefined,
          clientId: clientId || null,
          budgetHours: budgetHours !== undefined && budgetHours !== "" ? Number(budgetHours) : null,
          status: status || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/projects?tab=projects&success=Projeto+atualizado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar projeto.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=projects&error=${encodeURIComponent(msg)}`);
    }
  }

  static async deleteProject(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      await axios.delete(`${API_URL}/api/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        timeout: 4000,
      });

      if (wantsJson) return res.status(200).json({ success: true });
      return res.redirect("/projects?tab=projects&success=Projeto+removido+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao remover projeto.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=projects&error=${encodeURIComponent(msg)}`);
    }
  }

  // --- Tarefas ---
  static async getTasksByProject(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { projectId } = req.params;

    try {
      const response = await axios.get(`${API_URL}/api/tasks?projectId=${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        timeout: 4000,
      });

      return res.json(response.data);
    } catch (err: any) {
      return res.status(err.response?.status || 400).json({ success: false, error: { message: "Erro ao buscar tarefas." } });
    }
  }

  static async createTask(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { projectId, title, estimatedHours, status } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/tasks`,
        {
          projectId,
          title,
          estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
          status: status || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) return res.status(201).json(response.data);
      return res.redirect("/projects?tab=projects&success=Tarefa+adicionada+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao criar tarefa.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=projects&error=${encodeURIComponent(msg)}`);
    }
  }

  static async deleteTask(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      await axios.delete(`${API_URL}/api/tasks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        timeout: 4000,
      });

      if (wantsJson) return res.status(200).json({ success: true });
      return res.redirect("/projects?tab=projects&success=Tarefa+removida+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao remover tarefa.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=projects&error=${encodeURIComponent(msg)}`);
    }
  }
}
