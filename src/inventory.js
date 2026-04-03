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
    if (venta.origen !== "Inventario propio") continue;
    for (const linea of venta.items || []) {
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
