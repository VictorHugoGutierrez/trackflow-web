import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3333";

export class AuthController {
  static renderLogin(req: Request, res: Response) {
    const error = req.query.error as string | undefined;
    const success = req.query.success as string | undefined;
    return res.render("login", {
      error: error || null,
      success: success || null,
      pageTitle: "TrackFlow - Entrar",
      apiUrl: API_URL,
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    });
  }

  static async googleAuth(req: Request, res: Response) {
    const { idToken, accessToken } = req.body;
    if (!idToken && !accessToken) {
      return res.status(400).json({
        success: false,
        error: { message: "Token do Google não informado." },
      });
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/google`,
        { idToken, accessToken },
        { timeout: 8000 }
      );

      const data = response.data?.data;
      if (!data || !data.token) {
        throw new Error("Token de sessão não retornado pela API.");
      }

      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("trackflow_session", data.token, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        data: {
          token: data.token,
          user: data.user,
          tenant: data.tenant,
        },
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Falha na autenticação com o Google.";
      return res.status(err.response?.status || 401).json({
        success: false,
        error: { message: msg },
      });
    }
  }

  static setSession(req: Request, res: Response) {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token não fornecido." });
    }

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("trackflow_session", token, {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true });
  }

  static handleLogout(req: Request, res: Response) {
    res.clearCookie("trackflow_session", { path: "/" });
    return res.redirect("/");
  }

  static renderFirstAccess(req: Request, res: Response) {
    if (!req.cookies?.trackflow_session) {
      return res.redirect("/login");
    }
    return res.render("first-access", {
      pageTitle: "Troca de Senha Obrigatória",
      error: req.query.error || null,
    });
  }

  static async handleFirstAccess(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    if (!token) {
      return res.redirect("/login");
    }

    const { password, newPassword, confirmPassword } = req.body || {};
    const pwd = String(newPassword || password || "");

    if (!pwd || pwd.length < 6) {
      return res.redirect(
        `/first-access?error=${encodeURIComponent("A nova senha deve conter no mínimo 6 caracteres.")}`
      );
    }

    if (confirmPassword !== undefined && pwd !== String(confirmPassword)) {
      return res.redirect(
        `/first-access?error=${encodeURIComponent("As senhas informadas não coincidem.")}`
      );
    }

    try {
      const response = await axios.patch(
        `${API_URL}/api/auth/first-access`,
        { newPassword: pwd },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 8000,
        }
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

      return res.redirect("/dashboard?success=Senha+definida+com+sucesso!");
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Falha ao atualizar senha.";
      return res.redirect(`/first-access?error=${encodeURIComponent(msg)}`);
    }
  }

  static devLogin(req: Request, res: Response) {
    if (process.env.NODE_ENV === "production") {
      return res.redirect("/");
    }

    const role = (req.query.role as string) || "OWNER";
    const isSuperAdmin = role === "SUPER_ADMIN";

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).send("JWT_SECRET não configurado.");
    }

    const payload = {
      sub: isSuperAdmin ? "admin-dev-id" : "user-dev-id",
      tenantId: isSuperAdmin ? null : "tenant-dev-id",
      role: isSuperAdmin ? "SUPER_ADMIN" : "OWNER",
      email: isSuperAdmin ? "admin@trackflow.com" : "owner@empresa.com",
      name: isSuperAdmin ? "Super Admin" : "Administrador",
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });

    res.cookie("trackflow_session", token, {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const redirectUrl = isSuperAdmin ? "/control-plane" : "/dashboard";
    return res.redirect(redirectUrl);
  }

  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body || {};
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/forgot-password`,
        { email },
        { timeout: 10000 }
      );
      return res.status(response.status).json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || {
        success: false,
        error: { message: "Erro ao processar recuperação de senha." },
      };
      return res.status(status).json(data);
    }
  }

  static async aiChat(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { message } = req.body || {};
    try {
      const response = await axios.post(
        `${API_URL}/api/ai/chat`,
        { message },
        {
          headers: token
            ? { Authorization: `Bearer ${token}`, Cookie: `trackflow_session=${token}` }
            : {},
          timeout: 30000,
        }
      );
      return res.status(response.status).json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || {
        success: false,
        error: { message: "Erro ao conversar com o Assistente IA." },
      };
      return res.status(status).json(data);
    }
  }
}
