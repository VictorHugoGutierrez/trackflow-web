import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import type { JWTPayload, UserRole } from "../types/auth.js";
import {
  formatDuration,
  formatDurationShort,
  formatCurrencyCents,
  centsToReaisInput,
  secondsToHoursInput,
  calculateAmountCents,
} from "../utils/formatters.js";

const API_URL = process.env.API_URL || "http://localhost:3333";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/control-plane",
  "/team",
  "/clients",
  "/projects",
  "/reports",
  "/settings",
  "/api/reports",
  "/api/invoices",
];

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.formatDuration = formatDuration;
  res.locals.formatDurationShort = formatDurationShort;
  res.locals.formatCurrencyCents = formatCurrencyCents;
  res.locals.centsToReaisInput = centsToReaisInput;
  res.locals.secondsToHoursInput = secondsToHoursInput;
  res.locals.calculateAmountCents = calculateAmountCents;

  const token = req.cookies?.trackflow_session;
  const pathname = req.path;
  
  // 1. Skip middleware for static assets
  const staticAssets = ['/css', '/js', '/img', '/public', '/favicon.ico'];
  if (staticAssets.some(asset => pathname.startsWith(asset))) {
    return next();
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isApiRoute = pathname.startsWith("/api/");
  
  // Define public paths that don't require session check or trigger redirects
  const publicPaths = ['/login', '/logout', '/first-access', '/api/auth', '/forgot-password'];
  const isExempt = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/';

  const jwtSecret = process.env.JWT_SECRET || "";

  if (!token) {
    if (isProtectedRoute && !isExempt) {
      if (isApiRoute) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sessão expirada ou não autenticada." },
        });
      }
      return res.redirect("/");
    }
    return next();
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as JWTPayload;

    // ... (rest of the payload handling) ...

    req.user = payload;
    res.locals.user = payload;

    // Check for mandatory password change
    if (payload.mustChangePassword === true && !isExempt && req.accepts('html')) {
      return res.redirect("/first-access");
    }

    const role = payload.role as UserRole;

    // Role-based Access Control
    if (role === "MEMBER" && pathname.startsWith("/team")) {
      return res.redirect("/dashboard");
    }

    if (role === "MEMBER" && pathname.startsWith("/control-plane")) {
      return res.redirect("/dashboard");
    }

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
  } catch (error: any) {
    console.warn("[authMiddleware] Erro de validação de token:", error.message);
    
    // Clear only if token is explicitly invalid or expired
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.clearCookie("trackflow_session", { path: "/" });
    }

    if (isProtectedRoute) {
      if (isApiRoute) {
        return res.status(401).json({
          success: false,
          error: { code: "INVALID_TOKEN", message: "Token inválido ou expirado." },
        });
      }
      return res.redirect("/");
    }
    return next();
  }
}
