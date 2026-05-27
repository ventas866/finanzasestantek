/**
 * Capa de base de datos — Supabase (única fuente de verdad).
 */
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const dbReady = Boolean(
  URL && KEY && URL.startsWith("https://") && KEY.length > 20
);

export const supabase = dbReady ? createClient(URL, KEY) : null;

// ─── Generic helpers ──────────────────────────────────────────────────────────

/** Carga todos los registros de una tabla. Retorna [] si la tabla no existe. */
export async function fetchTable(table) {
  if (!supabase) throw new Error("Supabase no configurado");
  try {
    // Intenta con orden por fecha
    const { data, error } = await supabase
      .from(table)
      .select("data")
      .order("fecha", { ascending: false, nullsFirst: false });
    if (!error) return data.map((r) => r.data);

    // Fallback: la tabla puede no tener columna "fecha" — cargar sin orden
    console.warn(`fetchTable(${table}) con orden falló (${error.message}), reintentando sin orden...`);
    const { data: d2, error: e2 } = await supabase.from(table).select("data");
    if (e2) { console.warn(`fetchTable(${table}):`, e2.message); return []; }
    return d2.map((r) => r.data);
  } catch (e) {
    console.warn(`fetchTable(${table}) exception:`, e);
    return [];
  }
}

export async function saveRecord(table, record) {
  if (!supabase) throw new Error("Supabase no configurado");
  // Intenta guardar con columna "fecha" (para ordenamiento en DB)
  const { error } = await supabase.from(table).upsert({
    id: record.id,
    fecha: record.fecha || null,
    data: record,
  });
  if (!error) return;

  // Fallback: la tabla puede no tener columna "fecha"
  console.warn(`saveRecord(${table}) con fecha falló (${error.message}), reintentando sin fecha...`);
  const { error: e2 } = await supabase.from(table).upsert({ id: record.id, data: record });
  if (e2) {
    const msg = `No se pudo guardar en tabla "${table}": ${e2.message}`;
    console.error(msg, e2);
    throw new Error(msg);
  }
}

export async function deleteRecord(table, id) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(`deleteRecord(${table}):`, error);
}

// ─── Cuentas ──────────────────────────────────────────────────────────────────

export async function saveCuenta(cuenta) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("cuentas").upsert({ id: cuenta.id, data: cuenta });
  if (error) console.error("saveCuenta:", error);
}

export async function fetchCuentas() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.from("cuentas").select("data");
  if (error) throw error;
  return data.map((r) => r.data);
}

// ─── Transferencias ───────────────────────────────────────────────────────────

export async function fetchTransferencias() {
  if (!supabase) throw new Error("Supabase no configurado");
  try {
    const { data, error } = await supabase.from("transferencias").select("data");
    if (error) { console.warn("fetchTransferencias:", error.message); return []; }
    return data.map((r) => r.data);
  } catch (e) { console.warn("fetchTransferencias exception:", e); return []; }
}

export async function saveTransferencia(tr) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("transferencias").upsert({ id: tr.id, data: tr });
  if (error) console.error("saveTransferencia:", error);
}

// ─── Precios de venta (mapa sku → precioVenta) ────────────────────────────────

/** Retorna un objeto {[sku]: precioVenta} */
export async function fetchPrecios() {
  if (!supabase) throw new Error("Supabase no configurado");
  try {
    const { data, error } = await supabase.from("precios").select("data");
    if (error) { console.warn("fetchPrecios:", error.message); return {}; }
    return data.reduce((acc, r) => {
      if (r.data?.sku) acc[r.data.sku] = r.data.precioVenta || 0;
      return acc;
    }, {});
  } catch (e) { console.warn("fetchPrecios exception:", e); return {}; }
}

export async function savePrecio(sku, precioVenta) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("precios").upsert({ id: sku, data: { sku, precioVenta } });
  if (error) console.error("savePrecio:", error);
}

// ─── Productos extra (catálogo personalizado) ─────────────────────────────────

export async function fetchProductos() {
  if (!supabase) throw new Error("Supabase no configurado");
  try {
    const { data, error } = await supabase.from("productos").select("data");
    if (error) { console.warn("fetchProductos:", error.message); return []; }
    return data.map((r) => r.data);
  } catch (e) { console.warn("fetchProductos exception:", e); return []; }
}

export async function saveProducto(p) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("productos").upsert({ id: p.id, data: p });
  if (error) console.error("saveProducto:", error);
}

export async function deleteProducto(id) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) console.error("deleteProducto:", error);
}
