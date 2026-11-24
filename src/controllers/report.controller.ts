import { Request, Response } from "express";
import axios from "axios";
import { calculateAmountCents, hoursToSeconds, reaisToCents } from "../utils/formatters.js";

const API_URL = process.env.API_URL || "http://localhost:3333";

export interface Invoice {
  id: string;
  clientId: string;
  monthRef: string;
  durationSeconds: number;
  amountCents: number;
  totalHours?: number;
  totalValue?: number;
  status: "pendente" | "pago" | "cancelado";
  aiSummary?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
  paidAt?: string | null;
  client?: { id: string; name: string; contact?: string | null } | null;
}

export interface ProjectReportSummary {
  projectId: string | null;
  projectName: string;
  clientId: string | null;
  clientName: string;
  budgetHours: number | null;
  budgetCents?: number | null;
  estimatedSeconds?: number | null;
  totalSeconds: number;
  billableSeconds: number;
  totalHours: number;
  billableHours: number;
  hourlyRate: number;
  hourlyRateCents: number;
  totalValue: number;
  amountCents: number;
  entriesCount: number;
}

function getCurrentMonthBRT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date())
    .slice(0, 7);
}

function getMonthDateRange(monthStr: string) {
  const fallback = getCurrentMonthBRT();
  const match = /^(\d{4})-(\d{2})$/.exec((monthStr || "").trim());
  const [yStr, mStr] = match ? [match[1], match[2]] : fallback.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  const startDate = new Date(`${year}-${mm}-01T00:00:00.000-03:00`).toISOString();
  const endDate = new Date(`${year}-${mm}-${dd}T23:59:59.999-03:00`).toISOString();
  return { startDate, endDate };
}

export class ReportController {
  static async render(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const isFinanceManager =
      req.user?.role === "OWNER" ||
      req.user?.role === "MANAGER" ||
      req.user?.role === "SUPER_ADMIN";

    const currentMonthStr = getCurrentMonthBRT();
    const selectedMonth = (req.query.month as string) || currentMonthStr;
    const selectedClientId = (req.query.clientId as string) || "";
    const selectedProjectId = (req.query.projectId as string) || "";

    const { startDate, endDate } = getMonthDateRange(selectedMonth);

    let clients: any[] = [];
    let projects: any[] = [];
    let summaryProjects: ProjectReportSummary[] = [];
    let invoices: Invoice[] = [];
    let timeEntries: any[] = [];
    let hourlyRateCents = 0;
    let currency = "BRL";
    let summaryTotalHours: number | null = null;
    let summaryBillableHours: number | null = null;
    let summaryTotalValue: number | null = null;
    let summaryTotalSeconds: number | null = null;
    let summaryBillableSeconds: number | null = null;
    let summaryAmountCents: number | null = null;

    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        }
      : {};

    try {
      if (token) {
        const summaryParams = new URLSearchParams({
          startDate,
          endDate,
        });
        if (selectedClientId) summaryParams.set("clientId", selectedClientId);
        if (selectedProjectId) summaryParams.set("projectId", selectedProjectId);

        const entriesParams = new URLSearchParams({
          startDate,
          endDate,
          limit: "200",
        });
        if (isFinanceManager) entriesParams.set("scope", "tenant");
        if (selectedClientId) entriesParams.set("clientId", selectedClientId);
        if (selectedProjectId) entriesParams.set("projectId", selectedProjectId);

        let invoicesUrl = `${API_URL}/api/invoices`;
        if (selectedClientId) {
          invoicesUrl += `?clientId=${encodeURIComponent(selectedClientId)}`;
        }

        const [resSummary, resClients, resProjects, resInvoices, resEntries, resMe] =
          await Promise.allSettled([
            isFinanceManager
              ? axios.get(`${API_URL}/api/reports/summary?${summaryParams.toString()}`, {
                  headers,
                  timeout: 4000,
                })
              : Promise.resolve({ data: { success: false } } as any),
            axios.get(`${API_URL}/api/clients`, { headers, timeout: 3000 }),
            axios.get(`${API_URL}/api/projects`, { headers, timeout: 3000 }),
            isFinanceManager
              ? axios.get(invoicesUrl, { headers, timeout: 3000 })
              : Promise.resolve({ data: { success: false } } as any),
            axios.get(`${API_URL}/api/time-entries?${entriesParams.toString()}`, {
              headers,
              timeout: 3000,
            }),
            axios.get(`${API_URL}/api/auth/me`, { headers, timeout: 2500 }),
          ]);

        if (resClients.status === "fulfilled" && resClients.value.data?.success) {
          clients = resClients.value.data.data || [];
        }

        if (resProjects.status === "fulfilled" && resProjects.value.data?.success) {
          projects = resProjects.value.data.data || [];
        }

        if (isFinanceManager && resInvoices.status === "fulfilled" && resInvoices.value.data?.success) {
          invoices = (resInvoices.value.data.data || []).map((inv: any) => ({
            ...inv,
            durationSeconds:
              inv.durationSeconds !== undefined && inv.durationSeconds !== null
                ? Number(inv.durationSeconds)
                : hoursToSeconds(inv.totalHours),
            amountCents:
              inv.amountCents !== undefined && inv.amountCents !== null
                ? Number(inv.amountCents)
                : reaisToCents(inv.totalValue),
          }));
        }

        if (resEntries.status === "fulfilled" && resEntries.value.data?.success) {
          timeEntries = resEntries.value.data.data || [];
        }

        if (isFinanceManager && resMe.status === "fulfilled" && resMe.value.data?.success) {
          const userMe = resMe.value.data.data;
          if (userMe?.settings?.hourlyRateCents !== undefined) {
            hourlyRateCents = Number(userMe.settings.hourlyRateCents) || 0;
          } else if (userMe?.settings?.hourlyRate !== undefined) {
            hourlyRateCents = reaisToCents(userMe.settings.hourlyRate);
          }
          if (userMe?.settings?.currency) {
            currency = userMe.settings.currency;
          }
        }

        const projectById = new Map<string, any>();
        projects.forEach((p: any) => {
          if (p?.id) projectById.set(p.id, p);
        });

        if (resSummary.status === "fulfilled" && resSummary.value.data?.success) {
          const sumData = resSummary.value.data.data;
          if (sumData) {
            if (sumData.hourlyRateCents !== undefined) {
              hourlyRateCents = Number(sumData.hourlyRateCents) || hourlyRateCents;
            } else if (sumData.hourlyRate !== undefined && hourlyRateCents === 0) {
              hourlyRateCents = reaisToCents(sumData.hourlyRate);
            }
            if (sumData.currency) currency = sumData.currency;

            if (sumData.totalHours !== undefined) summaryTotalHours = Number(sumData.totalHours);
            if (sumData.billableHours !== undefined) summaryBillableHours = Number(sumData.billableHours);
            if (sumData.totalValue !== undefined) summaryTotalValue = Number(sumData.totalValue);
            if (sumData.totalSeconds !== undefined) summaryTotalSeconds = Number(sumData.totalSeconds);
            if (sumData.billableSeconds !== undefined) summaryBillableSeconds = Number(sumData.billableSeconds);
            if (sumData.amountCents !== undefined) summaryAmountCents = Number(sumData.amountCents);

            summaryProjects = (sumData.projects || []).map((p: any) => {
              const linkedProj = p.projectId ? projectById.get(p.projectId) : null;
              const pTotalSec = Number(
                p.totalSeconds ?? hoursToSeconds(p.totalHours)
              );
              const pBillSec = Number(
                p.billableSeconds ?? hoursToSeconds(p.billableHours)
              );
              const pRateCents =
                p.hourlyRateCents !== undefined
                  ? Number(p.hourlyRateCents)
                  : p.hourlyRate !== undefined
                    ? reaisToCents(p.hourlyRate)
                    : hourlyRateCents;
              const pAmountCents =
                p.amountCents !== undefined
                  ? Number(p.amountCents)
                  : p.totalValue !== undefined
                    ? reaisToCents(p.totalValue)
                    : calculateAmountCents(pBillSec, pRateCents);

              return {
                projectId: p.projectId ?? null,
                projectName: p.projectName || linkedProj?.name || "Sem Projeto",
                clientId: p.clientId ?? linkedProj?.clientId ?? null,
                clientName: p.clientName || linkedProj?.client?.name || "Sem Cliente",
                budgetHours: p.budgetHours ?? null,
                budgetCents: p.budgetCents ?? linkedProj?.budgetCents ?? null,
                estimatedSeconds: p.estimatedSeconds ?? linkedProj?.estimatedSeconds ?? null,
                totalSeconds: pTotalSec,
                billableSeconds: pBillSec,
                totalHours: Number(p.totalHours ?? (pTotalSec / 3600).toFixed(2)),
                billableHours: Number(p.billableHours ?? (pBillSec / 3600).toFixed(2)),
                hourlyRate: Number((pRateCents / 100).toFixed(2)),
                hourlyRateCents: pRateCents,
                totalValue: Number(p.totalValue ?? (pAmountCents / 100).toFixed(2)),
                amountCents: pAmountCents,
                entriesCount: Number(p.entriesCount || 0),
              };
            });
          }
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados de relatórios:", err.message);
    }

    let entriesTotalSeconds = 0;
    let entriesBillableSeconds = 0;
    let entriesAmountCents = 0;

    timeEntries.forEach((entry) => {
      const dur = Number(entry.durationSeconds ?? entry.duration ?? 0);
      entriesTotalSeconds += dur;
      if (entry.billable && isFinanceManager) {
        entriesBillableSeconds += dur;
        const entryAmount =
          entry.amountCents !== undefined && entry.amountCents !== null && Number(entry.amountCents) > 0
            ? Number(entry.amountCents)
            : calculateAmountCents(dur, hourlyRateCents);
        entriesAmountCents += entryAmount;
      } else if (entry.billable) {
        entriesBillableSeconds += dur;
      }
    });

    if (summaryProjects.length === 0 && timeEntries.length > 0) {
      const projectById = new Map<string, any>();
      projects.forEach((p: any) => {
        if (p?.id) projectById.set(p.id, p);
      });
      const clientById = new Map<string, any>();
      clients.forEach((c: any) => {
        if (c?.id) clientById.set(c.id, c);
      });

      const groupMap = new Map<string, ProjectReportSummary>();
      timeEntries.forEach((entry) => {
        const key = entry.projectId || "unassigned";
        const linkedProj = entry.projectId ? projectById.get(entry.projectId) : null;
        const resolvedClientId = entry.project?.clientId || linkedProj?.clientId || null;
        const resolvedClientName =
          entry.project?.client?.name ||
          linkedProj?.client?.name ||
          (resolvedClientId ? clientById.get(resolvedClientId)?.name : null) ||
          "Sem Cliente";

        const dur = Number(entry.durationSeconds ?? entry.duration ?? 0);
        const billDur = entry.billable ? dur : 0;
        const entryAmt =
          entry.billable && isFinanceManager
            ? entry.amountCents !== undefined && entry.amountCents !== null && Number(entry.amountCents) > 0
              ? Number(entry.amountCents)
              : calculateAmountCents(dur, hourlyRateCents)
            : 0;

        const existing = groupMap.get(key);
        if (!existing) {
          const estSec = linkedProj?.estimatedSeconds ?? entry.project?.estimatedSeconds ?? null;
          groupMap.set(key, {
            projectId: entry.projectId ?? null,
            projectName: entry.project?.name || linkedProj?.name || "Sem Projeto",
            clientId: resolvedClientId,
            clientName: resolvedClientName,
            budgetHours: estSec ? Number((estSec / 3600).toFixed(2)) : null,
            budgetCents: linkedProj?.budgetCents ?? entry.project?.budgetCents ?? null,
            estimatedSeconds: estSec,
            totalSeconds: dur,
            billableSeconds: billDur,
            totalHours: 0,
            billableHours: 0,
            hourlyRate: Number((hourlyRateCents / 100).toFixed(2)),
            hourlyRateCents,
            totalValue: 0,
            amountCents: entryAmt,
            entriesCount: 1,
          });
        } else {
          existing.totalSeconds += dur;
          existing.billableSeconds += billDur;
          existing.amountCents += entryAmt;
          existing.entriesCount += 1;
        }
      });

      summaryProjects = Array.from(groupMap.values()).map((g) => ({
        ...g,
        totalHours: Number((g.totalSeconds / 3600).toFixed(2)),
        billableHours: Number((g.billableSeconds / 3600).toFixed(2)),
        totalValue: Number((g.amountCents / 100).toFixed(2)),
      }));
    }

    const totalSeconds =
      summaryTotalSeconds !== null
        ? summaryTotalSeconds
        : entriesTotalSeconds > 0
          ? entriesTotalSeconds
          : hoursToSeconds(summaryTotalHours);

    const totalBillableSeconds =
      summaryBillableSeconds !== null
        ? summaryBillableSeconds
        : entriesBillableSeconds > 0
          ? entriesBillableSeconds
          : hoursToSeconds(summaryBillableHours);

    const totalAmountCents =
      summaryAmountCents !== null
        ? summaryAmountCents
        : entriesAmountCents > 0
          ? entriesAmountCents
          : reaisToCents(summaryTotalValue);

    const hourlyRate = Number((hourlyRateCents / 100).toFixed(2));
    const totalHours =
      summaryTotalHours !== null ? summaryTotalHours : Number((totalSeconds / 3600).toFixed(2));
    const totalBillableHours =
      summaryBillableHours !== null
        ? summaryBillableHours
        : Number((totalBillableSeconds / 3600).toFixed(2));
    const totalValue =
      summaryTotalValue !== null ? summaryTotalValue : Number((totalAmountCents / 100).toFixed(2));

    return res.render("reports/index", {
      pageTitle: isFinanceManager ? "TrackFlow - Relatórios & Faturas" : "TrackFlow - Meus Relatórios",
      activeTab: "reports",
      user: req.user,
      isFinanceManager,
      clients,
      projects,
      summaryProjects,
      invoices,
      timeEntries,
      selectedMonth,
      selectedClientId,
      selectedProjectId,
      startDate,
      endDate,
      totalSeconds,
      totalBillableSeconds,
      hourlyRateCents,
      totalAmountCents,
      totalHours,
      totalBillableHours,
      hourlyRate,
      totalValue,
      currency,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  }

  static async exportCsv(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { month, clientId, projectId, startDate, endDate } = req.query;

    const params = new URLSearchParams();
    if (typeof month === "string" && month) params.set("month", month);
    if (typeof clientId === "string" && clientId) params.set("clientId", clientId);
    if (typeof projectId === "string" && projectId) params.set("projectId", projectId);
    if (typeof startDate === "string" && startDate) params.set("startDate", startDate);
    if (typeof endDate === "string" && endDate) params.set("endDate", endDate);

    try {
      const response = await axios.get(`${API_URL}/api/reports/export/csv?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        responseType: "arraybuffer",
        timeout: 10000,
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=relatorio.csv");
      return res.send(Buffer.from(response.data));
    } catch (err: any) {
      console.error("Erro ao exportar CSV:", err.message);
      return res.status(err.response?.status || 500).send("Erro ao exportar CSV.");
    }
  }

  static async getSummary(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { clientId, projectId, startDate, endDate, hourlyRate, month } = req.query;

    const params = new URLSearchParams();
    if (typeof clientId === "string" && clientId) params.set("clientId", clientId);
    if (typeof projectId === "string" && projectId) params.set("projectId", projectId);
    if (typeof hourlyRate === "string" && hourlyRate) params.set("hourlyRate", hourlyRate);

    if (typeof startDate === "string" && startDate) {
      params.set("startDate", startDate);
    } else if (typeof month === "string" && month) {
      const range = getMonthDateRange(month);
      params.set("startDate", range.startDate);
      params.set("endDate", range.endDate);
    }

    if (typeof endDate === "string" && endDate) {
      params.set("endDate", endDate);
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/reports/summary?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 8000,
        }
      );

      return res.status(200).json(response.data);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message || "Erro ao consultar resumo financeiro por projeto.";
      return res
        .status(err.response?.status || 400)
        .json({ success: false, error: { message: msg } });
    }
  }

  static async generateAiSummary(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { clientId, projectId, monthRef, startDate, endDate, prompt, activities } =
      req.body || {};

    let finalStartDate = startDate;
    let finalEndDate = endDate;

    if (
      !finalStartDate &&
      !finalEndDate &&
      typeof monthRef === "string" &&
      /^\d{4}-\d{2}$/.test(monthRef)
    ) {
      const range = getMonthDateRange(monthRef);
      finalStartDate = range.startDate;
      finalEndDate = range.endDate;
    }

    const requestHeaders = {
      Authorization: `Bearer ${token}`,
      Cookie: `trackflow_session=${token}`,
    };

    try {
      const response = await axios.post(
        `${API_URL}/api/reports/ai-insight`,
        {
          clientId: clientId || undefined,
          projectId: projectId || undefined,
          monthRef,
          startDate: finalStartDate,
          endDate: finalEndDate,
          prompt,
          activities,
        },
        {
          headers: requestHeaders,
          timeout: 60000,
        }
      );

      return res.status(200).json(response.data);
    } catch (err: any) {
      if (
        err.response?.status === 404 &&
        err.response?.data?.error?.code === "NOT_FOUND" &&
        clientId
      ) {
        try {
          const fallbackRes = await axios.post(
            `${API_URL}/api/reports/ai-summary`,
            { clientId, monthRef, startDate: finalStartDate, endDate: finalEndDate },
            { headers: requestHeaders, timeout: 25000 }
          );
          return res.status(200).json(fallbackRes.data);
        } catch (fallbackErr: any) {
          const fallbackStatus = fallbackErr.response?.status || 500;
          const fallbackPayload = fallbackErr.response?.data || {
            success: false,
            error: { message: "Erro ao gerar resumo executivo com IA." },
          };
          return res.status(fallbackStatus).json(fallbackPayload);
        }
      }

      const status = err.response?.status || 500;
      const payload = err.response?.data || {
        success: false,
        error: { message: "Erro ao gerar resumo executivo com IA." },
      };
      return res.status(status).json(payload);
    }
  }

  static async createInvoice(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const {
      clientId,
      monthRef,
      startDate,
      endDate,
      durationSeconds,
      amountCents,
      totalHours,
      totalValue,
      hourlyRate,
      aiSummary,
      generateAi,
      sendEmail,
      recipientEmail,
    } = req.body || {};

    const wantsJson =
      req.path.startsWith("/api/") ||
      req.xhr ||
      req.headers.accept?.includes("application/json");

    let finalStartDate = startDate;
    let finalEndDate = endDate;
    if (
      !finalStartDate &&
      !finalEndDate &&
      typeof monthRef === "string" &&
      /^\d{4}-\d{2}$/.test(monthRef)
    ) {
      const range = getMonthDateRange(monthRef);
      finalStartDate = range.startDate;
      finalEndDate = range.endDate;
    }

    const resolvedDurationSeconds =
      durationSeconds !== undefined && durationSeconds !== null && String(durationSeconds).trim() !== ""
        ? Math.max(0, Math.round(Number(durationSeconds) || 0))
        : totalHours !== undefined && totalHours !== null && String(totalHours).trim() !== ""
          ? hoursToSeconds(totalHours)
          : undefined;

    const resolvedAmountCents =
      amountCents !== undefined && amountCents !== null && String(amountCents).trim() !== ""
        ? Math.max(0, Math.round(Number(amountCents) || 0))
        : totalValue !== undefined && totalValue !== null && String(totalValue).trim() !== ""
          ? reaisToCents(totalValue)
          : undefined;

    const resolvedTotalHours =
      totalHours !== undefined && String(totalHours).trim() !== ""
        ? Number(totalHours)
        : resolvedDurationSeconds !== undefined
          ? Number((resolvedDurationSeconds / 3600).toFixed(2))
          : undefined;

    const resolvedTotalValue =
      totalValue !== undefined && String(totalValue).trim() !== ""
        ? Number(totalValue)
        : resolvedAmountCents !== undefined
          ? Number((resolvedAmountCents / 100).toFixed(2))
          : undefined;

    const payload = {
      clientId,
      monthRef,
      startDate: finalStartDate,
      endDate: finalEndDate,
      durationSeconds: resolvedDurationSeconds,
      amountCents: resolvedAmountCents,
      totalHours: resolvedTotalHours,
      totalValue: resolvedTotalValue,
      hourlyRate:
        hourlyRate !== undefined && hourlyRate !== "" ? Number(hourlyRate) : undefined,
      aiSummary: aiSummary || undefined,
      generateAi: generateAi === "true" || generateAi === true || generateAi === "on",
      sendEmail: sendEmail === "true" || sendEmail === true || sendEmail === "on",
      recipientEmail: recipientEmail || undefined,
    };

    const requestHeaders = {
      Authorization: `Bearer ${token}`,
      Cookie: `trackflow_session=${token}`,
    };

    try {
      const response = await axios.post(`${API_URL}/api/invoices/generate`, payload, {
        headers: requestHeaders,
        timeout: 60000,
      });

      if (wantsJson) return res.status(201).json(response.data);
      return res.redirect("/reports?success=Fatura+gerada+com+sucesso!");
    } catch (err: any) {
      if (err.response?.status === 404) {
        try {
          const fallbackRes = await axios.post(`${API_URL}/api/invoices`, payload, {
            headers: requestHeaders,
            timeout: 10000,
          });
          if (wantsJson) return res.status(201).json(fallbackRes.data);
          return res.redirect("/reports?success=Fatura+gerada+com+sucesso!");
        } catch (fallbackErr: any) {
          const fallbackMsg =
            fallbackErr.response?.data?.error?.message || "Erro ao emitir fatura.";
          if (wantsJson) {
            return res
              .status(fallbackErr.response?.status || 400)
              .json({ success: false, error: { message: fallbackMsg } });
          }
          return res.redirect(`/reports?error=${encodeURIComponent(fallbackMsg)}`);
        }
      }

      const msg = err.response?.data?.error?.message || "Erro ao emitir fatura.";
      if (wantsJson) {
        return res
          .status(err.response?.status || 400)
          .json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/reports?error=${encodeURIComponent(msg)}`);
    }
  }

  static async sendInvoice(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { to, recipientEmail, subject } = req.body || {};
    const wantsJson =
      req.path.startsWith("/api/") ||
      req.xhr ||
      req.headers.accept?.includes("application/json");

    try {
      const response = await axios.post(
        `${API_URL}/api/invoices/${id}/send`,
        {
          to: to || recipientEmail || undefined,
          recipientEmail: recipientEmail || to || undefined,
          subject: subject || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 15000,
        }
      );

      if (wantsJson) return res.status(200).json(response.data);
      const sentTo = response.data?.data?.to || to || recipientEmail || "cliente";
      return res.redirect(
        `/reports?success=${encodeURIComponent(`Fatura enviada por e-mail para ${sentTo} com sucesso!`)}`
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message || "Erro ao disparar fatura por e-mail via Resend.";
      if (wantsJson) {
        return res
          .status(err.response?.status || 400)
          .json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/reports?error=${encodeURIComponent(msg)}`);
    }
  }

  static async updateInvoiceStatus(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;
    const { status } = req.body || {};
    const wantsJson =
      req.path.startsWith("/api/") ||
      req.xhr ||
      req.headers.accept?.includes("application/json");

    try {
      const response = await axios.patch(
        `${API_URL}/api/invoices/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `trackflow_session=${token}`,
          },
          timeout: 6000,
        }
      );

      if (wantsJson) return res.status(200).json(response.data);
      return res.redirect("/reports?success=Status+da+fatura+atualizado!");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Erro ao atualizar status da fatura.";
      if (wantsJson) {
        return res
          .status(err.response?.status || 400)
          .json({ success: false, error: { message: msg } });
      }
      return res.redirect(`/reports?error=${encodeURIComponent(msg)}`);
    }
  }

  static async streamInvoicePdf(req: Request, res: Response) {
    const token = req.cookies?.trackflow_session;
    const { id } = req.params;

    if (!token) {
      return res.redirect("/");
    }

    try {
      const response = await axios.get(`${API_URL}/api/invoices/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `trackflow_session=${token}`,
        },
        responseType: "arraybuffer",
        timeout: 60000,
      });

      const contentType = (response.headers["content-type"] as string) || "application/pdf";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="fatura-${id}.pdf"`
      );
      return res.status(200).send(Buffer.from(response.data));
    } catch (err: any) {
      let msg = "Erro ao gerar PDF da fatura.";
      if (err.response?.data) {
        try {
          const parsed = JSON.parse(
            Buffer.from(err.response.data).toString("utf-8")
          );
          msg = parsed?.error?.message || msg;
        } catch {
        }
      }
      return res.redirect(`/reports?error=${encodeURIComponent(msg)}`);
    }
  }
}
