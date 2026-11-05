import { Request, Response } from "express";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3333";

export class SettingsController {
  static async render(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const tab = req.query.tab || "profile";

    let userMe: any = {
      name: req.user?.name || req.user?.email.split("@")[0],
      email: req.user?.email,
      role: req.user?.role,
      settings: {
        theme: "dark",
        pomodoroWork: 25,
        pomodoroBreak: 5,
        hourlyRate: 150.00,
        currency: "BRL",
      },
      tenant: {
        name: "Workspace",
        plan: "pro",
      },
    };

    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        }
      : {};

    try {
      if (token) {
        const response = await axios.get(`${API_URL}/api/auth/me`, { headers, timeout: 2500 });
        if (response.data?.success && response.data?.data) {
          userMe = response.data.data;
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados do usuário em settings:", err.message);
    }

    return res.render("settings/index", {
      pageTitle: "TrackFlow - Configurações",
      activeTab: "settings",
      currentTab: tab,
      user: req.user,
      userMe,
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
        }
      );

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
          hourlyRate: hourlyRate !== undefined && hourlyRate !== "" ? Number(hourlyRate) : undefined,
          currency: currency || undefined,
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
      return res.redirect("/settings?tab=preferences&success=Preferências+salvas+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao salvar preferências.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/settings?tab=preferences&error=${encodeURIComponent(msg)}`);
    }
  }
}
