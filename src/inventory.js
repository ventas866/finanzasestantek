import { round2 } from "./utils.js";

export function buildInventory(baseCatalogo, compras, ventas) {
  const map = new Map(
    baseCatalogo.map((item) => [
      item.sku,
      { ...item, stock: 0, costo: item.costoBase || 0 },
    ])
  );

  for (const compra of compras) {
    for (const linea of compra.items || []) {
      if (linea.esLote) continue; // lotes de materia prima no afectan inventario de catálogo
      const actual = map.get(linea.sku);
      if (!actual) continue;
      const cantNueva = Number(linea.cantidad || 0);
      const costoNuevo = Number(linea.costoUnitario || 0);
      const costoAnteriorTotal = actual.stock * actual.costo;
      const costoNuevoTotal = cantNueva * costoNuevo;
      const nuevoStock = actual.stock + cantNueva;
      const nuevoCosto =
        nuevoStock > 0
          ? round2((costoAnteriorTotal + costoNuevoTotal) / nuevoStock)
          : actual.costo;
      map.set(linea.sku, { ...actual, stock: nuevoStock, costo: nuevoCosto });
    }
  }

  for (const venta of ventas) {
    for (const linea of venta.items || []) {
      // Item-level reventa flag takes precedence (new records)
      if (linea.esReventa === true) continue;
      // Legacy: use global origin for items without explicit flag
      if (linea.esReventa === undefined || linea.esReventa === null) {
        if (venta.origen !== "Inventario propio") continue;
      }
      const actual = map.get(linea.sku);
      if (!actual) continue;
      map.set(linea.sku, {
        ...actual,
        stock: Math.max(0, actual.stock - Number(linea.cantidad || 0)),
      });
    }
  }

  return Array.from(map.values());
}
