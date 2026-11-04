import { Request, Response } from "express";

const API_URL = process.env.API_URL || "http://localhost:3333";

export class ControlPlaneController {
  static renderControlPlane(req: Request, res: Response) {
    return res.render("control-plane", {
      pageTitle: "TrackFlow - Control Plane Administrativo",
      user: req.user,
      apiUrl: API_URL,
    });
  }
}
