import { Router } from "express";
import { ControlPlaneController } from "../controllers/control-plane.controller.js";

export const controlPlaneRoutes = Router();

controlPlaneRoutes.get("/control-plane", ControlPlaneController.renderOverview);
controlPlaneRoutes.get("/control-plane/tenants", ControlPlaneController.renderTenants);
controlPlaneRoutes.get("/control-plane/logs", ControlPlaneController.renderLogs);
