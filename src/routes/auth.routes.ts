import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

export const authRoutes = Router();

authRoutes.get("/", AuthController.renderLogin);
authRoutes.get("/login", AuthController.renderLogin);
authRoutes.post("/api/auth/forgot-password", AuthController.forgotPassword);
authRoutes.post("/api/ai/chat", AuthController.aiChat);
authRoutes.post("/auth/google", AuthController.googleAuth);
authRoutes.post("/session", AuthController.setSession);
authRoutes.get("/logout", AuthController.handleLogout);
authRoutes.post("/logout", AuthController.handleLogout);
authRoutes.get("/dev-login", AuthController.devLogin);
authRoutes.get("/first-access", AuthController.renderFirstAccess);
authRoutes.post("/first-access", AuthController.handleFirstAccess);
