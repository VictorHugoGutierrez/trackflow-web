import { Request, Response } from "express";

const API_URL = process.env.API_URL || "http://localhost:3333";

export class DashboardController {
  static renderDashboard(req: Request, res: Response) {
    return res.render("dashboard", {
      pageTitle: "TrackFlow - Painel do Workspace",
      user: req.user,
      apiUrl: API_URL,
    });
  }
}
