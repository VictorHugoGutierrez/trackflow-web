import { Router } from "express";
import { ReportController } from "../controllers/report.controller.js";

export const reportRoutes = Router();

reportRoutes.get("/reports", ReportController.render);

reportRoutes.get("/reports/summary", ReportController.getSummary);
reportRoutes.get("/api/reports/summary", ReportController.getSummary);

reportRoutes.get("/api/invoices/:id/pdf", ReportController.streamInvoicePdf);
reportRoutes.get("/reports/invoices/:id/pdf", ReportController.streamInvoicePdf);

reportRoutes.post("/reports/ai-summary", ReportController.generateAiSummary);
reportRoutes.post("/reports/ai-insight", ReportController.generateAiSummary);
reportRoutes.post("/api/reports/ai-insight", ReportController.generateAiSummary);

reportRoutes.post("/reports/invoices", ReportController.createInvoice);
reportRoutes.post("/reports/invoices/generate", ReportController.createInvoice);
reportRoutes.post("/api/invoices/generate", ReportController.createInvoice);

reportRoutes.post("/reports/invoices/:id/send", ReportController.sendInvoice);
reportRoutes.post("/api/invoices/:id/send", ReportController.sendInvoice);

reportRoutes.post("/reports/invoices/:id/status", ReportController.updateInvoiceStatus);
reportRoutes.patch("/reports/invoices/:id/status", ReportController.updateInvoiceStatus);
reportRoutes.patch("/api/invoices/:id/status", ReportController.updateInvoiceStatus);
