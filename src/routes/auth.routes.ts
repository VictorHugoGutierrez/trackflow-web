import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

export const authRoutes = Router();

authRoutes.get("/", AuthController.renderLogin);
authRoutes.get("/logout", AuthController.handleLogout);
authRoutes.post("/logout", AuthController.handleLogout);
authRoutes.get("/dev-login", AuthController.devLogin);
