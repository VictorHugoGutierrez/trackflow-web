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

    if (!payload.name && isProtectedRoute) {
      try {
        const meRes = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3000,
        });
        const fetchedName = meRes.data?.data?.name || meRes.data?.data?.user?.name;
        if (typeof fetchedName === "string" && fetchedName.trim()) {
          payload.name = fetchedName.trim();
        }
      } catch {
        // Fallback silencioso caso a API esteja indisponível
      }
    }

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
