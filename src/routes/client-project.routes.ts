import { Router } from "express";
import { ClientProjectController } from "../controllers/client-project.controller.js";

export const clientProjectRoutes = Router();

clientProjectRoutes.get("/projects", ClientProjectController.render);
clientProjectRoutes.get("/clients", (_req, res) => res.redirect("/projects?tab=clients"));

clientProjectRoutes.post("/clients", ClientProjectController.createClient);
clientProjectRoutes.post("/clients/:id/update", ClientProjectController.updateClient);
clientProjectRoutes.patch("/clients/:id", ClientProjectController.updateClient);
clientProjectRoutes.post("/clients/:id/delete", ClientProjectController.deleteClient);
clientProjectRoutes.delete("/clients/:id", ClientProjectController.deleteClient);

clientProjectRoutes.post("/projects", ClientProjectController.createProject);
clientProjectRoutes.post("/projects/:id/update", ClientProjectController.updateProject);
clientProjectRoutes.patch("/projects/:id", ClientProjectController.updateProject);
clientProjectRoutes.post("/projects/:id/status", ClientProjectController.updateProjectStatus);
clientProjectRoutes.patch("/projects/:id/status", ClientProjectController.updateProjectStatus);
clientProjectRoutes.post("/projects/:id/delete", ClientProjectController.deleteProject);
clientProjectRoutes.delete("/projects/:id", ClientProjectController.deleteProject);
