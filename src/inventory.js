import { round2 } from "./utils.js";

/**
 * Construye el inventario actual a partir de:
 *  - baseCatalogo: productos base del catálogo
 *  - compras: entradas de stock (ítems esLote se ignoran)
 *  - ventas: salidas de stock (ítems esReventa se ignoran)
 *  - ajustes: correcciones manuales de stock (+/-)
 *  - conversiones: lotes de madera → piezas terminadas
 */
export function buildInventory(baseCatalogo, compras, ventas, ajustes = [], conversiones = []) {
  const map = new Map(
    baseCatalogo.map((item) => [
      item.sku,
      { ...item, stock: 0, costo: item.costoBase || 0 },
    ])
  );

  // Compras incrementan stock (salvo ítems de lote/materia prima)
  for (const compra of compras) {
    for (const linea of compra.items || []) {
      if (linea.esLote) continue;
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

  // Ventas decrementan stock (ítems de reventa no afectan inventario propio)
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
        stock: Math.max(0, actual.stock - Number(linea.cantidad || 0)),
      });
    }
  }

  // Ajustes de stock (correcciones manuales: conteo físico, pérdidas, etc.)
  for (const aj of ajustes) {
    const actual = map.get(aj.sku);
    if (!actual) continue;
    map.set(aj.sku, {
      ...actual,
      stock: Math.max(0, actual.stock + Number(aj.cantidad || 0)),
    });
  }

  // Conversiones de lote (madera cruda → piezas terminadas de catálogo)
  for (const conv of conversiones) {
    for (const pieza of conv.piezas || []) {
      const actual = map.get(pieza.sku);
      if (!actual) continue;
      const cantNueva = Number(pieza.cantidad || 0);
      const costoNuevo = Number(pieza.costoUnitario || 0);
      const costoAnteriorTotal = actual.stock * actual.costo;
      const costoNuevoTotal = cantNueva * costoNuevo;
      const nuevoStock = actual.stock + cantNueva;
      const nuevoCosto =
        nuevoStock > 0
          ? round2((costoAnteriorTotal + costoNuevoTotal) / nuevoStock)
          : actual.costo;
      map.set(pieza.sku, { ...actual, stock: nuevoStock, costo: nuevoCosto });
    }
  }

  return Array.from(map.values());
}
