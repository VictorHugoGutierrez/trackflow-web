import { Router } from "express";
import { ClientProjectController } from "../controllers/client-project.controller.js";

export const clientProjectRoutes = Router();

// Render
clientProjectRoutes.get("/projects", ClientProjectController.render);
clientProjectRoutes.get("/clients", (_req, res) => res.redirect("/projects?tab=clients"));

// Clients Actions
clientProjectRoutes.post("/clients", ClientProjectController.createClient);
clientProjectRoutes.post("/clients/:id/update", ClientProjectController.updateClient);
clientProjectRoutes.patch("/clients/:id", ClientProjectController.updateClient);
clientProjectRoutes.post("/clients/:id/delete", ClientProjectController.deleteClient);
clientProjectRoutes.delete("/clients/:id", ClientProjectController.deleteClient);

// Projects Actions
clientProjectRoutes.post("/projects", ClientProjectController.createProject);
clientProjectRoutes.post("/projects/:id/update", ClientProjectController.updateProject);
clientProjectRoutes.patch("/projects/:id", ClientProjectController.updateProject);
clientProjectRoutes.post("/projects/:id/delete", ClientProjectController.deleteProject);
clientProjectRoutes.delete("/projects/:id", ClientProjectController.deleteProject);

// Tasks Actions
clientProjectRoutes.get("/api/projects/:projectId/tasks", ClientProjectController.getTasksByProject);
clientProjectRoutes.post("/tasks", ClientProjectController.createTask);
clientProjectRoutes.post("/tasks/:id/delete", ClientProjectController.deleteTask);
clientProjectRoutes.delete("/tasks/:id", ClientProjectController.deleteTask);
