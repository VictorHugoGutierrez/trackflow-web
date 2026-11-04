import { Request, Response } from "express";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3333";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  avatarUrl?: string | null;
  hourlyRate: number;
  currency: string;
  createdAt: string;
}

export class TeamController {
  static async renderTeam(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    let members: TeamMember[] = [];
    let errorMessage: string | null = (req.query.error as string) || null;
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
      // Fallback gracioso com o usuário logado para a interface não quebrar
      if (req.user) {
        members = [
          {
            id: req.user.sub,
            name: req.user.name || req.user.email.split("@")[0] || "Administrador",
            email: req.user.email,
            role: (req.user.role as any) || "OWNER",
            avatarUrl: null,
            hourlyRate: 0,
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
    const { name, email, password, role, hourlyRate } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/team`,
        { name, email, password, role, hourlyRate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 5000,
        }
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
    const { name, role, hourlyRate } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/team/${id}`,
        { name, role, hourlyRate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 5000,
        }
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
