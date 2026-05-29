import { round2 } from "./utils.js";

/**
 * Construye el inventario actual.
 * Retorna cada producto con: stock, costo (promedio ponderado), precioVenta, margenPct
 *
 * @param {Array}  baseCatalogo  - catálogo base (CATALOGO_BASE + productosExtra)
 * @param {Array}  compras       - entradas (ítems esLote se ignoran)
 * @param {Array}  ventas        - salidas (ítems esReventa se ignoran)
 * @param {Array}  ajustes       - correcciones manuales de stock
 * @param {Array}  conversiones  - lotes convertidos en piezas
 * @param {Object} precios       - mapa {[sku]: precioVenta} guardado en Supabase
 */
export function buildInventory(
  baseCatalogo,
  compras,
  ventas,
  ajustes = [],
  conversiones = [],
  precios = {},
  transformacionesInv = []
) {
  const map = new Map(
    baseCatalogo.map((item) => {
      const precioVenta = precios[item.sku] ?? item.precioVenta ?? 0;
      return [
        item.sku,
        { ...item, stock: 0, costo: item.costoBase || 0, precioVenta },
      ];
    })
  );

  // Compras → aumentan stock
  for (const compra of compras) {
    for (const linea of compra.items || []) {
      if (linea.esLote) continue;
      const actual = map.get(linea.sku);
      if (!actual) continue;
      const cantNueva  = Number(linea.cantidad || 0);
      const costoNuevo = Number(linea.costoUnitario || 0);
      const nuevoStock = actual.stock + cantNueva;
      // Si stock previo era ≤ 0 (vendido antes de comprar), el costo es el nuevo precio
      // Si ambos positivos, promedio ponderado
      const nuevoCosto = (actual.stock > 0 && nuevoStock > 0)
        ? round2((actual.stock * actual.costo + cantNueva * costoNuevo) / nuevoStock)
        : (costoNuevo || actual.costo);
      map.set(linea.sku, { ...actual, stock: nuevoStock, costo: nuevoCosto });
    }
  }

  // Ventas → disminuyen stock
  for (const venta of ventas) {
    for (const linea of venta.items || []) {
      if (linea.esReventa === true) continue;
      if (linea.esReventa === undefined || linea.esReventa === null) {
        if (venta.origen !== "Inventario propio") continue;
      }
      const actual = map.get(linea.sku);
      if (!actual) continue;
      map.set(linea.sku, {
        ...actual,
        stock: actual.stock - Number(linea.cantidad || 0), // permite negativo
      });
    }
  }

  // Conversiones (lote → piezas) — ANTES de ajustes para que el ajuste final override todo
  for (const conv of conversiones) {
    for (const pieza of conv.piezas || []) {
      const actual = map.get(pieza.sku);
      if (!actual) continue;
      const cantNueva  = Number(pieza.cantidad || 0);
      const costoNuevo = Number(pieza.costoUnitario || 0);
      const nuevoStock = actual.stock + cantNueva;
      // Si stock previo era ≤ 0, el costo es el de la conversión (no promediar con 0 o negativo)
      // Si ambos positivos, promedio ponderado real
      const nuevoCosto = (actual.stock > 0 && nuevoStock > 0)
        ? round2((actual.stock * actual.costo + cantNueva * costoNuevo) / nuevoStock)
        : (costoNuevo || actual.costo);
      map.set(pieza.sku, { ...actual, stock: nuevoStock, costo: nuevoCosto });
    }
  }

  // Transformaciones (terminado → terminado) — redistribuye costo entre productos
  for (const transf of transformacionesInv) {
    // 1. Reducir stock del producto origen
    const origen = map.get(transf.origen?.sku);
    if (origen) {
      map.set(transf.origen.sku, {
        ...origen,
        stock: origen.stock - Number(transf.origen.cantidad || 0),
      });
    }
    // 2. Aumentar stock de cada salida con su costo almacenado
    for (const salida of transf.salidas || []) {
      const actual = map.get(salida.sku);
      if (!actual) continue;
      const cantNueva  = Number(salida.cantidad || 0);
      const costoNuevo = Number(salida.costoUnitario || 0);
      const nuevoStock = actual.stock + cantNueva;
      const nuevoCosto = (actual.stock > 0 && nuevoStock > 0)
        ? round2((actual.stock * actual.costo + cantNueva * costoNuevo) / nuevoStock)
        : (costoNuevo || actual.costo);
      map.set(salida.sku, { ...actual, stock: nuevoStock, costo: nuevoCosto });
    }
  }

  // Ajustes manuales — ÚLTIMO: corrección física que sobreescribe el cálculo anterior
  for (const aj of ajustes) {
    const actual = map.get(aj.sku);
    if (!actual) continue;
    map.set(aj.sku, {
      ...actual,
      stock: actual.stock + Number(aj.cantidad || 0), // permite negativo
    });
  }

  // Calcular margen estimado por producto
  return Array.from(map.values()).map((item) => {
    const margenPct = item.precioVenta > 0 && item.costo > 0
      ? round2(((item.precioVenta - item.costo) / item.precioVenta) * 100)
      : null;
    const valorVenta = item.stock * item.precioVenta;
    return { ...item, margenPct, valorVenta };
  });
}
