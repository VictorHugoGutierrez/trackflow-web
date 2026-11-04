import { Router } from "express";
import { TeamController } from "../controllers/team.controller.js";

export const teamRoutes = Router();

teamRoutes.get("/team", TeamController.renderTeam);
teamRoutes.post("/team", TeamController.createMember);
teamRoutes.post("/team/:id/update", TeamController.updateMember);
teamRoutes.patch("/team/:id", TeamController.updateMember);
teamRoutes.post("/team/:id/delete", TeamController.deleteMember);
teamRoutes.delete("/team/:id", TeamController.deleteMember);
