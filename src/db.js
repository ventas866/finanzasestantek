/**
 * Capa de base de datos — Supabase (única fuente de verdad).
 * Sin fallback local. Si las credenciales no están, la app muestra error de configuración.
 */
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const dbReady = Boolean(
  URL && KEY && URL.startsWith("https://") && KEY.length > 20
);

export const supabase = dbReady ? createClient(URL, KEY) : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Carga todos los registros de una tabla como objetos JS */
export async function fetchTable(table) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from(table)
    .select("data")
    .order("fecha", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data.map((r) => r.data);
}

/** Guarda o actualiza un registro (upsert) */
export async function saveRecord(table, record) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from(table).upsert({
    id: record.id,
    fecha: record.fecha || null,
    data: record,
  });
  if (error) console.error(`saveRecord(${table}):`, error);
}

/** Elimina un registro por id */
export async function deleteRecord(table, id) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(`deleteRecord(${table}):`, error);
}

/** Para cuentas (no tienen fecha) */
export async function saveCuenta(cuenta) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("cuentas").upsert({
    id: cuenta.id,
    data: cuenta,
  });
  if (error) console.error("saveCuenta:", error);
}

export async function fetchCuentas() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("cuentas").select("data");
  if (error) throw error;
  return data.map((r) => r.data);
}

/** Para transferencias (sin fecha en row, se guarda en data) */
export async function fetchTransferencias() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("transferencias").select("data");
  if (error) throw error;
  return data.map((r) => r.data);
}

export async function saveTransferencia(tr) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("transferencias").upsert({
    id: tr.id,
    data: tr,
  });
  if (error) console.error("saveTransferencia:", error);
}
