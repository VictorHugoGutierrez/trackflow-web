import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller.js";

export const settingsRoutes = Router();

settingsRoutes.get("/settings", SettingsController.render);
settingsRoutes.post("/settings/profile", SettingsController.updateProfile);
settingsRoutes.post("/settings/preferences", SettingsController.updatePreferences);
