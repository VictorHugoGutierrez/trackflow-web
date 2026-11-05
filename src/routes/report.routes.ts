import { Router } from "express";
import { ReportController } from "../controllers/report.controller.js";

export const reportRoutes = Router();

reportRoutes.get("/reports", ReportController.render);
reportRoutes.post("/reports/ai-summary", ReportController.generateAiSummary);
reportRoutes.post("/reports/invoices", ReportController.createInvoice);
reportRoutes.post("/reports/invoices/:id/status", ReportController.updateInvoiceStatus);
reportRoutes.patch("/reports/invoices/:id/status", ReportController.updateInvoiceStatus);
