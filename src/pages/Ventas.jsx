import { useMemo } from "react";
import { money, uid } from "../utils.js";
import {
  Panel, SectionHeader, FormSection, FormGrid, Field, inputStyle, selectStyle,
  AddLineBtn, RemoveBtn, TotalBox, PrimaryBtn, CancelBtn,
  EditBtn, DeleteBtn, SkuPill, EmptyState, Alert, OrigenBadge, PagoBadge, PagosBuilder, s,
} from "../ui.jsx";

export default function Ventas({
  ventas, catalogo, cuentas,
  editingId,
  form, setForm,
  linea, setLinea,
  items, setItems,
  pagos, setPagos,
  pagoLinea, setPagoLinea,
  onSave, onEdit, onDelete, onCancel,
}) {
  const catalogoMap = useMemo(
    () => Object.fromEntries(catalogo.map((p) => [p.sku, p])),
    [catalogo]
  );

  const resumenVivo = useMemo(() => {
    const subtotal     = items.reduce((a, i) => a + i.subtotalVenta, 0);
    const costo        = items.reduce((a, i) => a + i.subtotalCosto, 0);
    const costoReventa = items.filter((i) => i.esReventa).reduce((a, i) => a + i.subtotalCosto, 0);
    const costoPropio  = costo - costoReventa;
    const utilidad     = subtotal - costo;
    const total        = subtotal;
    const margen       = subtotal > 0 ? (utilidad / subtotal) * 100 : 0;
    return { subtotal, costo, costoReventa, costoPropio, utilidad, total, margen };
  }, [items]);

  function agregarLinea() {
    const cantidad  = Number(linea.cantidad || 0);
    const precio    = Number(linea.precioUnitario || 0);
    const skuInfo   = catalogoMap[linea.sku];
    const costo     = Number(linea.costoUnitario || skuInfo?.costo || 0);
    const esReventa = linea.esReventa !== undefined ? linea.esReventa : (skuInfo?.tipo === "Reventa");
    if (!linea.sku || cantidad <= 0 || precio <= 0) return;
    setItems((prev) => [
      ...prev,
      {
        id: uid(), sku: linea.sku, producto: skuInfo?.nombre || linea.sku,
        cantidad, precioUnitario: precio, costoUnitario: costo,
        subtotalVenta: cantidad * precio,
        subtotalCosto: cantidad * costo,
        utilidad: cantidad * precio - cantidad * costo,
        esReventa,
      },
    ]);
    const nextSku     = linea.sku;
    const nextSkuInfo = catalogoMap[nextSku];
    setLinea({ sku: nextSku, cantidad:"", precioUnitario:"", costoUnitario:"", esReventa: nextSkuInfo?.tipo === "Reventa" });
  }

  function toggleItemReventa(itemId) {
    setItems((prev) => prev.map((i) =>
      i.id === itemId ? { ...i, esReventa: !i.esReventa } : i
    ));
  }

  const canSave     = form.cliente && items.length > 0;
  const costoAutoLabel = catalogoMap[linea.sku]?.costo
    ? `Auto: ${money(catalogoMap[linea.sku].costo)}`
    : "Vacío = $0";
  const isReventaSku = catalogoMap[linea.sku]?.tipo === "Reventa";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title={editingId ? "Editando venta" : "Nueva venta"}
        subtitle="Registra ventas con múltiples productos y calcula utilidad automáticamente"
      />

      <div className="pg-2col">
        {/* Formulario */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Panel title={editingId ? "✎ Editar venta" : "Registrar venta"}>
            {editingId && (
              <Alert type="info" text="Editando venta existente. El inventario se recalcula automáticamente." />
            )}
            {editingId && <div style={{ height:12 }} />}

            <FormSection label="Datos generales">
              <FormGrid>
                <Field label="Fecha">
                  <input type="date" style={inputStyle} value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha:e.target.value })} />
                </Field>
                <Field label="Cliente">
                  <input style={inputStyle} list="clientes-list" placeholder="Nombre del cliente" value={form.cliente}
                    onChange={(e) => setForm({ ...form, cliente:e.target.value })} />
                  <datalist id="clientes-list">
                    {[...new Set(ventas.map((v) => v.cliente).filter(Boolean))].map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Nota" wide>
                  <input style={inputStyle} placeholder="Observación general" value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion:e.target.value })} />
                </Field>
              </FormGrid>
            </FormSection>

            <FormSection label="Agregar productos">
              <FormGrid>
                <Field label="Producto / SKU" wide>
                  <select style={selectStyle} value={linea.sku}
                    onChange={(e) => {
                      const info = catalogoMap[e.target.value];
                      setLinea({ ...linea, sku:e.target.value, esReventa: info?.tipo === "Reventa" });
                    }}>
                    {catalogo.map((p) => (
                      <option key={p.sku} value={p.sku}>{p.sku} · {p.nombre}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cantidad">
                  <input type="number" style={inputStyle} value={linea.cantidad}
                    onChange={(e) => setLinea({ ...linea, cantidad:e.target.value })} />
                </Field>
                <Field label="Precio unitario">
                  <input type="number" style={inputStyle} value={linea.precioUnitario}
                    onChange={(e) => setLinea({ ...linea, precioUnitario:e.target.value })} />
                </Field>
                <Field label="Costo unitario" hint={costoAutoLabel}>
                  <input type="number" style={inputStyle} placeholder="Vacío = costo prom." value={linea.costoUnitario}
                    onChange={(e) => setLinea({ ...linea, costoUnitario:e.target.value })} />
                </Field>
              </FormGrid>
              <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}>
                  <input type="checkbox" checked={!!linea.esReventa}
                    onChange={(e) => setLinea({ ...linea, esReventa:e.target.checked })} />
                  <span style={{ fontSize:13, fontWeight:600, color: linea.esReventa ? "#92400e" : "#64748b" }}>
                    {linea.esReventa ? "Reventa (Comerinvrc / proveedor externo)" : "Inventario propio"}
                  </span>
                </label>
                {isReventaSku && !linea.esReventa && (
                  <span style={{ fontSize:11, color:"#94a3b8" }}>(SKU de reventa, marcado como propio)</span>
                )}
              </div>
              <AddLineBtn onClick={agregarLinea}>+ Agregar ítem</AddLineBtn>
            </FormSection>

            {items.length === 0 ? (
              <EmptyState icon="🏷️" text="Agrega al menos un producto." />
            ) : (
              <div style={itemsList}>
                {items.map((item) => {
                  const m = item.subtotalVenta > 0 ? (item.utilidad / item.subtotalVenta) * 100 : 0;
                  return (
                    <div key={item.id} style={{ ...itemRow, ...(item.esReventa ? { background:"#fffbeb", borderColor:"#fde68a" } : {}) }}>
                      <div style={itemLeft}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, color:"#94a3b8" }}>{item.sku}</span>
                          {item.esReventa && <span style={{ fontSize:11, fontWeight:700, background:"#fef3c7", color:"#92400e", borderRadius:4, padding:"2px 6px" }}>REVENTA</span>}
                        </div>
                        <span style={{ fontWeight:700 }}>{item.producto}</span>
                        <div style={{ display:"flex", gap:16, fontSize:13, flexWrap:"wrap" }}>
                          <span style={{ color:"#64748b" }}>{item.cantidad} und × {money(item.precioUnitario)}</span>
                          <span style={{ fontWeight:700, color: item.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                            +{money(item.utilidad)} ({m.toFixed(0)}%)
                          </span>
                          {item.esReventa && item.costoUnitario > 0 && (
                            <span style={{ color:"#92400e", fontSize:12 }}>costo: {money(item.subtotalCosto)}</span>
                          )}
                        </div>
                      </div>
                      <div style={itemRight}>
                        <span style={{ fontWeight:900 }}>{money(item.subtotalVenta)}</span>
                        <button
                          style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, fontWeight:700, background: item.esReventa ? "#fef3c7" : "#f1f5f9", color: item.esReventa ? "#92400e" : "#475569" }}
                          onClick={() => toggleItemReventa(item.id)}
                          title={item.esReventa ? "Cambiar a inventario propio" : "Cambiar a reventa"}>
                          {item.esReventa ? "↩ Rev" : "⊞ Prop"}
                        </button>
                        <RemoveBtn onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {items.length > 0 && (
              <TotalBox
                rows={[
                  ["Subtotal", money(resumenVivo.subtotal)],
                  ["Costo propio (inventario)", money(resumenVivo.costoPropio), "#ef4444"],
                  ...(resumenVivo.costoReventa > 0 ? [["Costo reventa (proveedor)", money(resumenVivo.costoReventa), "#b45309"]] : []),
                  ["Utilidad", `${money(resumenVivo.utilidad)} (${resumenVivo.margen.toFixed(1)}%)`,
                    resumenVivo.utilidad >= 0 ? "#059669" : "#dc2626"],
                ]}
                finalRow={["Total", money(resumenVivo.total)]}
              />
            )}

            {resumenVivo.costoReventa > 0 && (
              <div style={{ marginTop:8, padding:"10px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, fontSize:13, color:"#92400e" }}>
                <strong>Costo de reventa: {money(resumenVivo.costoReventa)}</strong><br/>
                Recuerda registrar el pago al proveedor (Comerinvrc) en Cartera → Cuentas por pagar.
              </div>
            )}

            {items.length > 0 && (
              <FormSection label="Forma de cobro">
                <PagosBuilder
                  total={resumenVivo.total}
                  pagos={pagos}
                  setPagos={setPagos}
                  pagoLinea={pagoLinea}
                  setPagoLinea={setPagoLinea}
                  cuentas={cuentas}
                  labelCredito="cuenta por cobrar (crédito cliente)"
                />
              </FormSection>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
              <PrimaryBtn onClick={onSave} disabled={!canSave}>
                {editingId ? "Guardar cambios" : "Registrar venta"}
              </PrimaryBtn>
              {editingId && <CancelBtn onClick={onCancel}>Cancelar edición</CancelBtn>}
            </div>
          </Panel>
        </div>

        {/* Historial */}
        <Panel title={`Historial (${ventas.length})`}>
          {ventas.length === 0 ? (
            <EmptyState icon="📋" text="No hay ventas registradas aún." />
          ) : (
            <div style={histList}>
              {ventas.map((item) => {
                const margen      = item.subtotal > 0 ? (item.utilidad / item.subtotal) * 100 : 0;
                const creditoBase = item.pagos?.length > 0
                  ? Math.max(0, item.total - item.pagos.reduce((a, p) => a + p.monto, 0))
                  : item.formaPago === "Crédito" ? item.total : 0;
                const abonado   = (item.abonos || []).reduce((a, x) => a + x.valor, 0);
                const pendiente = Math.max(0, creditoBase - abonado);

                return (
                  <div key={item.id} style={s.histCard}>
                    <div style={histTop}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{item.cliente}</div>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginTop:4 }}>
                          <span style={{ fontSize:13, color:"#94a3b8" }}>{item.fecha}</span>
                          <OrigenBadge origen={item.origen} />
                          <PagoBadge forma={item.formaPago || "Contado"} />
                          {(item.pagos || []).map((p, i) => (
                            <span key={i} style={{ fontSize:12, color:"#064e3b", background:"#d1fae5", borderRadius:6, padding:"2px 8px" }}>
                              {cuentas.find((c) => c.id === p.cuentaId)?.nombre}: {money(p.monto)}
                            </span>
                          ))}
                        </div>
                        {item.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{item.descripcion}</div>}
                        {(item.abonos || []).length > 0 && (
                          <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:3 }}>
                            {item.abonos.map((ab) => (
                              <div key={ab.id} style={{ fontSize:12, color:"#64748b" }}>
                                ✓ Abono {ab.fecha}: {money(ab.valor)}
                                {ab.cuentaId && ` → ${cuentas.find((c) => c.id === ab.cuentaId)?.nombre}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:900, fontSize:18 }}>{money(item.total)}</div>
                        <div style={{ fontSize:13, fontWeight:700, color: item.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                          {money(item.utilidad)} · {margen.toFixed(1)}%
                        </div>
                        {creditoBase > 0 && (
                          <div style={{ fontSize:12, color: pendiente > 0 ? "#f59e0b" : "#10b981", fontWeight:700 }}>
                            {pendiente > 0 ? `Por cobrar: ${money(pendiente)}` : "✓ Cobrado"}
                          </div>
                        )}
                        {item.costoReventa > 0 && (
                          <div style={{ fontSize:12, color:"#92400e", fontWeight:600 }}>
                            Reventa: {money(item.costoReventa)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {(item.items || []).map((x) => (
                        <SkuPill key={x.id} label={`${x.sku} ×${x.cantidad}`} reventa={x.esReventa} />
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                      <EditBtn onClick={() => onEdit(item)} />
                      <DeleteBtn onClick={() => onDelete(item.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

const histList  = { display:"flex", flexDirection:"column", gap:10 };
const histTop   = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 };
const itemsList = { display:"flex", flexDirection:"column", gap:8, margin:"4px 0" };
const itemRow   = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", gap:12 };
const itemLeft  = { display:"flex", flexDirection:"column", gap:2, flex:1 };
const itemRight = { display:"flex", alignItems:"center", gap:8, flexShrink:0 };
