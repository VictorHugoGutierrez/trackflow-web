import { Request, Response } from "express";
import axios from "axios";
import { reaisToCents } from "../utils/formatters.js";

const API_URL = process.env.API_URL || "http://localhost:3333";

export class SettingsController {
  static async render(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const tab = req.query.tab === "preferences" ? "preferences" : "profile";

    let userMe: any = {
      name: req.user?.name || "Usuário",
      email: req.user?.email,
      role: req.user?.role,
      settings: {
        theme: "dark",
        pomodoroWork: 25,
        pomodoroBreak: 5,
        hourlyRateCents: 0,
        currency: "BRL",
      },
      tenant: {
        name: "Workspace",
        plan: "pro",
      },
    };
    let projects: any[] = [];

    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        }
      : {};

    try {
      if (token) {
        const [resMe, resProjects] = await Promise.allSettled([
          axios.get(`${API_URL}/api/auth/me`, { headers, timeout: 2500 }),
          axios.get(`${API_URL}/api/projects`, { headers, timeout: 2500 }),
        ]);
        
        if (resMe.status === "fulfilled" && resMe.value.data?.success && resMe.value.data?.data) {
          userMe = resMe.value.data.data;
        }
        
        if (resProjects.status === "fulfilled" && resProjects.value.data?.success) {
          projects = resProjects.value.data.data || [];
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados em settings:", err.message);
    }

    return res.render("settings/index", {
      pageTitle: "TrackFlow - Configurações",
      activeTab: "settings",
      currentTab: tab,
      user: req.user,
      userMe,
      projects,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  }

  static async updateProfile(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { name } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/auth/profile`,
        { name: name ? name.trim() : undefined },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        },
      );

      const updatedToken = response.data?.data?.token;
      if (updatedToken) {
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("trackflow_session", updatedToken, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/settings?tab=profile&success=Perfil+atualizado+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar perfil.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/settings?tab=profile&error=${encodeURIComponent(msg)}`);
    }
  }

  static async updatePreferences(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { theme, pomodoroWork, pomodoroBreak, hourlyRate, currency } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/auth/settings`,
        {
          theme: theme || undefined,
          pomodoroWork: pomodoroWork ? Number(pomodoroWork) : undefined,
          pomodoroBreak: pomodoroBreak ? Number(pomodoroBreak) : undefined,
          hourlyRateCents:
            hourlyRate !== undefined && String(hourlyRate).trim() !== ""
              ? reaisToCents(hourlyRate)
              : undefined,
          currency: currency || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        },
      );

      const updatedToken = response.data?.data?.token;
      if (updatedToken) {
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("trackflow_session", updatedToken, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/settings?tab=preferences&success=Preferências+salvas+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao salvar preferências.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/settings?tab=preferences&error=${encodeURIComponent(msg)}`);
    }
  }

  static async changePassword(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { oldPassword, newPassword, confirmPassword } = req.body || {};
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    if (!oldPassword || !newPassword) {
      const msg = "Informe sua senha atual e a nova senha.";
      if (wantsJson) return res.status(400).json({ success: false, error: { message: msg } });
      return res.redirect(`/settings?tab=profile&error=${encodeURIComponent(msg)}`);
    }

    if (String(newPassword).length < 6) {
      const msg = "A nova senha deve conter no mínimo 6 caracteres.";
      if (wantsJson) return res.status(400).json({ success: false, error: { message: msg } });
      return res.redirect(`/settings?tab=profile&error=${encodeURIComponent(msg)}`);
    }

    if (confirmPassword !== undefined && String(newPassword) !== String(confirmPassword)) {
      const msg = "A confirmação da nova senha não coincide.";
      if (wantsJson) return res.status(400).json({ success: false, error: { message: msg } });
      return res.redirect(`/settings?tab=profile&error=${encodeURIComponent(msg)}`);
    }

    try {
      const response = await axios.patch(
        `${API_URL}/api/auth/change-password`,
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 5000,
        },
      );

      const updatedToken = response.data?.data?.token;
      if (updatedToken) {
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("trackflow_session", updatedToken, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/settings?tab=profile&success=Senha+alterada+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao alterar senha.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/settings?tab=profile&error=${encodeURIComponent(msg)}`);
    }
  }
}
