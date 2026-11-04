import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authMiddleware } from "./middlewares/auth.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { controlPlaneRoutes } from "./routes/control-plane.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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
app.use(controlPlaneRoutes);

app.use((_req, res) => {
  return res.status(404).render("login", {
    error: "Página não encontrada.",
    pageTitle: "TrackFlow - 404",
  });
});

const PORT = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`TrackFlow Web rodando na porta ${PORT}`);
  });
}

export default app;
