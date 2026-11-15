import { Request, Response } from "express";
import axios from "axios";
import { reaisToCents } from "../utils/formatters.js";

const API_URL = process.env.API_URL || "http://localhost:3333";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  avatarUrl?: string | null;
  hourlyRateCents: number;
  currency: string;
  totalSeconds?: number;
  totalCostCents?: number;
  createdAt: string;
}

export class TeamController {
  static async renderTeam(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    let members: TeamMember[] = [];
    const errorMessage: string | null = (req.query.error as string) || null;
    const successMessage: string | null = (req.query.success as string) || null;

    try {
      if (token) {
        const response = await axios.get(`${API_URL}/api/team`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 2000,
        });

        if (response.data?.success) {
          members = response.data.data || [];
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar equipe via API:", err.response?.data || err.message);
      if (req.user) {
        members = [
          {
            id: req.user.sub,
            name: req.user.name || "Administrador",
            email: req.user.email,
            role: (req.user.role as any) || "OWNER",
            avatarUrl: null,
            hourlyRateCents: 0,
            currency: "BRL",
            createdAt: new Date().toISOString(),
          },
        ];
      }
    }

    return res.render("team/index", {
      pageTitle: "TrackFlow - Gestão de Equipe",
      user: req.user,
      members,
      apiUrl: API_URL,
      success: successMessage,
      error: errorMessage,
    });
  }

  static async createMember(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { name, email, password, role, hourlyRate, hourlyRateCents } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    const resolvedHourlyRateCents =
      hourlyRateCents !== undefined && String(hourlyRateCents).trim() !== ""
        ? Math.max(0, Math.round(Number(hourlyRateCents) || 0))
        : reaisToCents(hourlyRate);

    try {
      const response = await axios.post(
        `${API_URL}/api/team`,
        {
          name,
          email,
          password,
          role,
          hourlyRateCents: resolvedHourlyRateCents,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 5000,
        },
      );

      if (wantsJson) {
        return res.status(201).json(response.data);
      }

      return res.redirect("/team?success=Membro+adicionado+com+sucesso!");
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Falha ao adicionar membro à equipe.";

      if (wantsJson) {
        return res.status(err.response?.status || 400).json({
          success: false,
          error: { message: msg },
        });
      }

      return res.redirect(`/team?error=${encodeURIComponent(msg)}`);
    }
  }

  static async updateMember(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { name, role, hourlyRate, hourlyRateCents } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    let resolvedHourlyRateCents: number | undefined;
    if (hourlyRateCents !== undefined && String(hourlyRateCents).trim() !== "") {
      resolvedHourlyRateCents = Math.max(0, Math.round(Number(hourlyRateCents) || 0));
    } else if (hourlyRate !== undefined && String(hourlyRate).trim() !== "") {
      resolvedHourlyRateCents = reaisToCents(hourlyRate);
    }

    try {
      const response = await axios.patch(
        `${API_URL}/api/team/${id}`,
        {
          name,
          role,
          hourlyRateCents: resolvedHourlyRateCents,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 5000,
        },
      );

      if (wantsJson) {
        return res.status(200).json(response.data);
      }

      return res.redirect("/team?success=Dados+do+membro+atualizados+com+sucesso!");
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Falha ao atualizar dados do membro.";

      if (wantsJson) {
        return res.status(err.response?.status || 400).json({
          success: false,
          error: { message: msg },
        });
      }

      return res.redirect(`/team?error=${encodeURIComponent(msg)}`);
    }
  }

  static async getMemberActivity(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;

    try {
      const response = await axios.get(`${API_URL}/api/team/${id}/activity`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        timeout: 5000,
      });

      return res.status(200).json(response.data);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Falha ao carregar atividade do membro.";

      return res.status(err.response?.status || 400).json({
        success: false,
        error: { message: msg },
      });
    }
  }

  static async deleteMember(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.delete(`${API_URL}/api/team/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        timeout: 5000,
      });

      if (wantsJson) {
        return res.status(200).json(response.data);
      }

      return res.redirect("/team?success=Membro+removido+do+workspace+com+sucesso!");
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Falha ao remover membro da equipe.";

      if (wantsJson) {
        return res.status(err.response?.status || 400).json({
          success: false,
          error: { message: msg },
        });
      }

      return res.redirect(`/team?error=${encodeURIComponent(msg)}`);
    }
  }
}
