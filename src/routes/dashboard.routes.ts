import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/dashboard", DashboardController.renderDashboard);
dashboardRoutes.post("/time-entries/start", DashboardController.startTimeEntry);
dashboardRoutes.post("/time-entries/stop", DashboardController.stopTimeEntry);
dashboardRoutes.patch("/time-entries/:id/stop", DashboardController.stopTimeEntry);
dashboardRoutes.post("/projects", DashboardController.createProject);
dashboardRoutes.post("/tasks", DashboardController.createTask);
