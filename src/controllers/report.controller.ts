import { Request, Response } from "express";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3333";

export interface Invoice {
  id: string;
  clientId: string;
  monthRef: string;
  totalHours: number;
  totalValue: number;
  status: "pendente" | "pago" | "cancelado";
  aiSummary?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
  paidAt?: string | null;
  client?: { id: string; name: string; contact?: string | null } | null;
}

export class ReportController {
  static async render(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const selectedMonth = (req.query.month as string) || currentMonthStr;
    const selectedClientId = (req.query.clientId as string) || "";

    let clients: any[] = [];
    let invoices: Invoice[] = [];
    let timeEntries: any[] = [];
    let hourlyRate = 150.00;
    let currency = "BRL";

    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        }
      : {};

    try {
      if (token) {
        // Obter data de início e fim do mês selecionado
        const [yearStr, monthStr] = selectedMonth.split("-");
        const year = Number(yearStr) || now.getFullYear();
        const monthIndex = (Number(monthStr) || (now.getMonth() + 1)) - 1;
        const startDate = new Date(year, monthIndex, 1).toISOString();
        const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).toISOString();

        let entriesUrl = `${API_URL}/api/time-entries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=200`;
        if (selectedClientId) {
          entriesUrl += `&clientId=${encodeURIComponent(selectedClientId)}`;
        }

        let invoicesUrl = `${API_URL}/api/invoices`;
        if (selectedClientId) {
          invoicesUrl += `?clientId=${encodeURIComponent(selectedClientId)}`;
        }

        const [resClients, resInvoices, resEntries, resMe] = await Promise.allSettled([
          axios.get(`${API_URL}/api/clients`, { headers, timeout: 2500 }),
          axios.get(invoicesUrl, { headers, timeout: 2500 }),
          axios.get(entriesUrl, { headers, timeout: 2500 }),
          axios.get(`${API_URL}/api/auth/me`, { headers, timeout: 2500 }),
        ]);

        if (resClients.status === "fulfilled" && resClients.value.data?.success) {
          clients = resClients.value.data.data || [];
        }

        if (resInvoices.status === "fulfilled" && resInvoices.value.data?.success) {
          invoices = resInvoices.value.data.data || [];
        }

        if (resEntries.status === "fulfilled" && resEntries.value.data?.success) {
          timeEntries = resEntries.value.data.data || [];
        }

        if (resMe.status === "fulfilled" && resMe.value.data?.success) {
          const userMe = resMe.value.data.data;
          if (userMe.settings?.hourlyRate) {
            hourlyRate = Number(userMe.settings.hourlyRate);
          }
          if (userMe.settings?.currency) {
            currency = userMe.settings.currency;
          }
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados de relatórios:", err.message);
    }

    // Calcular totais
    let totalSeconds = 0;
    let totalBillableSeconds = 0;

    timeEntries.forEach((entry) => {
      const dur = entry.duration || 0;
      totalSeconds += dur;
      if (entry.billable) totalBillableSeconds += dur;
    });

    const totalHours = Number((totalSeconds / 3600).toFixed(2));
    const totalBillableHours = Number((totalBillableSeconds / 3600).toFixed(2));
    const totalValue = Number((totalBillableHours * hourlyRate).toFixed(2));

    return res.render("reports/index", {
      pageTitle: "TrackFlow - Relatórios & Faturas",
      activeTab: "reports",
      user: req.user,
      clients,
      invoices,
      timeEntries,
      selectedMonth,
      selectedClientId,
      totalHours,
      totalBillableHours,
      hourlyRate,
      totalValue,
      currency,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  }

  static async generateAiSummary(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { clientId, monthRef, startDate, endDate } = req.body;

    try {
      const response = await axios.post(
        `${API_URL}/api/reports/ai-summary`,
        { clientId, monthRef, startDate, endDate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 25000, // Ollama pode demorar alguns segundos
        }
      );

      return res.json(response.data);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao gerar resumo com IA.";
      return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
    }
  }

  static async createInvoice(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { clientId, monthRef, totalHours, totalValue, aiSummary, sendEmail, recipientEmail } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/invoices`,
        {
          clientId,
          monthRef,
          totalHours: Number(totalHours) || 0,
          totalValue: Number(totalValue) || 0,
          aiSummary: aiSummary || undefined,
          sendEmail: sendEmail === "true" || sendEmail === true || sendEmail === "on",
          recipientEmail: recipientEmail || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 6000,
        }
      );

      if (wantsJson) return res.status(201).json(response.data);
      return res.redirect("/reports?success=Fatura+gerada+com+sucesso!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao emitir fatura.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/reports?error=${encodeURIComponent(msg)}`);
    }
  }

  static async updateInvoiceStatus(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { status } = req.body;
    const wantsJson = req.xhr || req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/invoices/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 4000,
        }
      );

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/reports?success=Status+da+fatura+atualizado!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar status da fatura.";
      if (wantsJson) return res.status(err.response?.status || 400).json({ success: false, error: { message: msg } });
      return res.redirect(`/reports?error=${encodeURIComponent(msg)}`);
    }
  }
}
