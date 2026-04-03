export function formatMeters(cmLike) {
  return `${(cmLike / 100)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1")} m`;
}

export function money(n) {
  return Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export function pct(num, denom) {
  if (!denom || denom === 0) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function monthLabel(isoDate) {
  if (!isoDate) return "";
  const [y, m] = isoDate.split("-");
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function isoMonth(isoDate) {
  return isoDate ? isoDate.slice(0, 7) : "";
}

/** Retorna los últimos N meses como strings "YYYY-MM" */
export function lastNMonths(n = 6) {
  const result = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    result.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return result;
}
