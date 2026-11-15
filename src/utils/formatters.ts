export function formatDuration(seconds?: number | null): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDurationShort(seconds?: number | null): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${s}s`;
}

export function formatCurrencyCents(cents?: number | null): string {
  const reais = (Number(cents) || 0) / 100;
  return `R$ ${reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function reaisToCents(val?: string | number | null): number {
  if (val === null || val === undefined || val === "") {
    return 0;
  }
  const normalized = String(val).trim().replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

export function centsToReaisInput(cents?: number | null): string {
  return ((Number(cents) || 0) / 100).toFixed(2);
}

export function hoursToSeconds(hours?: string | number | null): number {
  if (hours === null || hours === undefined || hours === "") {
    return 0;
  }
  const normalized = String(hours).trim().replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 3600);
}

export function secondsToHoursInput(seconds?: number | null): string {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) {
    return "";
  }
  return Number((total / 3600).toFixed(2)).toString();
}

export function calculateAmountCents(
  durationSeconds: number,
  hourlyRateCents: number,
): number {
  if (
    !Number.isFinite(durationSeconds) ||
    !Number.isFinite(hourlyRateCents) ||
    durationSeconds <= 0 ||
    hourlyRateCents <= 0
  ) {
    return 0;
  }
  return Math.round((durationSeconds * hourlyRateCents) / 3600);
}
