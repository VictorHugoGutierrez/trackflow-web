import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/dashboard", DashboardController.renderDashboard);
dashboardRoutes.post("/time-entries/start", DashboardController.startTimeEntry);
dashboardRoutes.post("/time-entries/stop", DashboardController.stopTimeEntry);
dashboardRoutes.patch("/time-entries/:id/stop", DashboardController.stopTimeEntry);

// Manual, Edit & Delete entries
dashboardRoutes.post("/time-entries/manual", DashboardController.createManualEntry);
dashboardRoutes.post("/time-entries/:id/update", DashboardController.updateTimeEntry);
dashboardRoutes.patch("/time-entries/:id", DashboardController.updateTimeEntry);
dashboardRoutes.post("/time-entries/:id/delete", DashboardController.deleteTimeEntry);
dashboardRoutes.delete("/time-entries/:id", DashboardController.deleteTimeEntry);

// Quick projects & tasks
dashboardRoutes.post("/projects/quick", DashboardController.createProject);
dashboardRoutes.post("/tasks/quick", DashboardController.createTask);
