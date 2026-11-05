import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authMiddleware } from "./middlewares/auth.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { controlPlaneRoutes } from "./routes/control-plane.routes.js";
import { teamRoutes } from "./routes/team.routes.js";
import { clientProjectRoutes } from "./routes/client-project.routes.js";
import { reportRoutes } from "./routes/report.routes.js";
import { settingsRoutes } from "./routes/settings.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

const viewsDir = fs.existsSync(path.join(__dirname, "views"))
  ? path.join(__dirname, "views")
  : path.join(process.cwd(), "src", "views");

app.set("view engine", "ejs");
app.set("views", viewsDir);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

app.use(authMiddleware);

app.get("/ping", (_req, res) => {
  return res.json({ status: "ok", service: "trackflow-web" });
});

app.use(authRoutes);
app.use(dashboardRoutes);
app.use(teamRoutes);
app.use(clientProjectRoutes);
app.use(reportRoutes);
app.use(settingsRoutes);
app.use(controlPlaneRoutes);

app.use((_req, res) => {
  return res.status(404).render("login", {
    error: "Página não encontrada.",
    pageTitle: "TrackFlow - 404",
  });
});

const PORT = Number(process.env.PORT) || 3000;

const isDirectRun = Boolean(
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
);

if (isDirectRun && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`TrackFlow Web rodando na porta ${PORT}`);
  });
}

export default app;
