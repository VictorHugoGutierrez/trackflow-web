import { Router } from "express";
import { ReportController } from "../controllers/report.controller.js";

export const reportRoutes = Router();

// SSR Page
reportRoutes.get("/reports", ReportController.render);

// 1. Resumo de Horas e Faturamento por Projeto (GET /api/reports/summary)
reportRoutes.get("/reports/summary", ReportController.getSummary);
reportRoutes.get("/api/reports/summary", ReportController.getSummary);

// 2. Insight Executivo com IA - Ollama Cloud gpt-oss:120b (POST /api/reports/ai-insight)
reportRoutes.post("/reports/ai-summary", ReportController.generateAiSummary);
reportRoutes.post("/reports/ai-insight", ReportController.generateAiSummary);
reportRoutes.post("/api/reports/ai-insight", ReportController.generateAiSummary);

// 3. Gerar Fatura + PDF Base64 + IA opcional + Envio opcional (POST /api/invoices/generate)
reportRoutes.post("/reports/invoices", ReportController.createInvoice);
reportRoutes.post("/reports/invoices/generate", ReportController.createInvoice);
reportRoutes.post("/api/invoices/generate", ReportController.createInvoice);

// 4. Disparar Fatura por E-mail via Resend (POST /api/invoices/:id/send)
reportRoutes.post("/reports/invoices/:id/send", ReportController.sendInvoice);
reportRoutes.post("/api/invoices/:id/send", ReportController.sendInvoice);

// 5. Atualizar Status de Pagamento da Fatura (PATCH /api/invoices/:id/status)
reportRoutes.post("/reports/invoices/:id/status", ReportController.updateInvoiceStatus);
reportRoutes.patch("/reports/invoices/:id/status", ReportController.updateInvoiceStatus);
reportRoutes.patch("/api/invoices/:id/status", ReportController.updateInvoiceStatus);
