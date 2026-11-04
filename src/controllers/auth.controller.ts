import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const API_URL = process.env.API_URL || "http://localhost:3333";

export class AuthController {
  static renderLogin(req: Request, res: Response) {
    const error = req.query.error as string | undefined;
    return res.render("login", {
      error: error || null,
      pageTitle: "TrackFlow - Entrar",
      apiUrl: API_URL,
    });
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
}
