import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JWTPayload, UserRole } from "../types/auth.js";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/control-plane",
  "/team",
  "/clients",
  "/projects",
  "/reports",
  "/settings",
];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.trackflow_session;
  const pathname = req.path;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const jwtSecret = process.env.JWT_SECRET || "";

  if (!token) {
    if (isProtectedRoute) {
      return res.redirect("/");
    }
    return next();
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = payload;
    res.locals.user = payload;

    const role = payload.role as UserRole;

    if (
      role === "SUPER_ADMIN" &&
      !pathname.startsWith("/control-plane") &&
      pathname !== "/logout" &&
      pathname !== "/session"
    ) {
      return res.redirect("/control-plane");
    }

    if (pathname.startsWith("/control-plane") && role !== "SUPER_ADMIN") {
      return res.redirect("/dashboard");
    }

    if (pathname === "/") {
      const dest = role === "SUPER_ADMIN" ? "/control-plane" : "/dashboard";
      return res.redirect(dest);
    }

    return next();
  } catch (error) {
    res.clearCookie("trackflow_session", { path: "/" });
    if (isProtectedRoute) {
      return res.redirect("/");
    }
    return next();
  }
}
