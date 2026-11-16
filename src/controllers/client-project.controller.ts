import { Request, Response } from "express";
import axios from "axios";
import { hoursToSeconds, reaisToCents } from "../utils/formatters.js";

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
  budgetCents?: number | null;
  estimatedSeconds?: number | null;
  status: "ACTIVE" | "COMPLETED" | "OVER_BUDGET";
  totalSecondsSpent?: number;
  accumulatedCostCents?: number;
  progressPercent?: number;
  clientId?: string | null;
  client?: Client | null;
  createdAt?: string;
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

        if (clients.length > 0 && projects.length > 0) {
          const clientMap = new Map(clients.map((c) => [c.id, c]));
          projects = projects.map((p) => {
            if (!p.client && p.clientId && clientMap.has(p.clientId)) {
              return { ...p, client: clientMap.get(p.clientId) || null };
            }
            return p;
          });
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar Clientes e Projetos:", err.message);
    }

    const projectMetrics = {
      total: projects.length,
      active: projects.filter((p) => p.status === "ACTIVE").length,
      overBudget: projects.filter((p) => p.status === "OVER_BUDGET").length,
      completed: projects.filter((p) => p.status === "COMPLETED").length,
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
        },
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
        },
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

  static async createProject(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { name, clientId, budgetReais, estimatedHours, status } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    const hasBudget = budgetReais !== undefined && String(budgetReais).trim() !== "";
    const hasEstimated = estimatedHours !== undefined && String(estimatedHours).trim() !== "";

    try {
      const response = await axios.post(
        `${API_URL}/api/projects`,
        {
          name,
          clientId: clientId || undefined,
          budgetCents: hasBudget ? reaisToCents(budgetReais) : null,
          estimatedSeconds: hasEstimated ? hoursToSeconds(estimatedHours) : null,
          status: status || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        },
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
    const { name, clientId, budgetReais, estimatedHours, status } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    const hasBudget = budgetReais !== undefined && String(budgetReais).trim() !== "";
    const hasEstimated = estimatedHours !== undefined && String(estimatedHours).trim() !== "";

    try {
      const response = await axios.patch(
        `${API_URL}/api/projects/${id}`,
        {
          name: name || undefined,
          clientId: clientId || null,
          budgetCents: hasBudget ? reaisToCents(budgetReais) : null,
          estimatedSeconds: hasEstimated ? hoursToSeconds(estimatedHours) : null,
          status: status || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        },
      );

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/projects?tab=projects&success=Projeto+atualizado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar projeto.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/projects?tab=projects&error=${encodeURIComponent(msg)}`);
    }
  }

  static async updateProjectStatus(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { status } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/projects/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        },
      );

      if (wantsJson) return res.status(200).json(response.data);
      const label = status === "COMPLETED" ? "Projeto+concluído+com+sucesso!" : "Projeto+reaberto+com+sucesso!";
      return res.redirect(`/projects?tab=projects&success=${label}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar status do projeto.";
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
}
