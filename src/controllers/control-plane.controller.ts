import { Request, Response } from "express";

const API_URL = process.env.API_URL || "http://localhost:3333";

export class ControlPlaneController {
  static renderOverview(req: Request, res: Response) {
    return res.render("control-plane/overview", {
      pageTitle: "TrackFlow - Visão Geral do SaaS",
      user: req.user,
      apiUrl: API_URL,
      activeTab: "overview",
      breadcrumb: "Visão Geral",
    });
  }

  static renderTenants(req: Request, res: Response) {
    return res.render("control-plane/tenants", {
      pageTitle: "TrackFlow - Gestão de Tenants",
      user: req.user,
      apiUrl: API_URL,
      activeTab: "tenants",
      breadcrumb: "Gestão de Tenants",
    });
  }

  static renderLogs(req: Request, res: Response) {
    return res.render("control-plane/logs", {
      pageTitle: "TrackFlow - Monitoramento e Logs",
      user: req.user,
      apiUrl: API_URL,
      activeTab: "logs",
      breadcrumb: "Monitoramento & Logs",
    });
  }
}
