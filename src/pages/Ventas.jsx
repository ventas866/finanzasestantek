import { useMemo } from "react";
import { money, pct, uid } from "../utils.js";
import {
  Panel, SectionHeader, FormSection, FormGrid, Field, inputStyle, selectStyle,
  AddLineBtn, RemoveBtn, TotalBox, PrimaryBtn, CancelBtn,
  EditBtn, DeleteBtn, SkuPill, EmptyState, Alert, OrigenBadge, PagoBadge, s,
} from "../ui.jsx";

export default function Ventas({
  ventas, catalogo, cuentas,
  editingId,
  form, setForm,
  linea, setLinea,
  items, setItems,
  onSave, onEdit, onDelete, onCancel,
}) {
  const catalogoMap = useMemo(
    () => Object.fromEntries(catalogo.map((p) => [p.sku, p])),
    [catalogo]
  );

  const resumenVivo = useMemo(() => {
    const subtotal  = items.reduce((a, i) => a + i.subtotalVenta, 0);
    const costo     = items.reduce((a, i) => a + i.subtotalCosto, 0);
    const utilidad  = subtotal - costo;
    const iva       = Number(form.iva || 0);
    const total     = subtotal + iva;
    const margen    = subtotal > 0 ? (utilidad / subtotal) * 100 : 0;
    return { subtotal, costo, utilidad, iva, total, margen };
  }, [items, form.iva]);

  function agregarLinea() {
    const cantidad       = Number(linea.cantidad || 0);
    const precio         = Number(linea.precioUnitario || 0);
    const skuInfo        = catalogoMap[linea.sku];
    const costo          = Number(linea.costoUnitario || skuInfo?.costo || 0);
    if (!linea.sku || cantidad <= 0 || precio <= 0) return;
    setItems((prev) => [
      ...prev,
      {
        id: uid(), sku: linea.sku, producto: skuInfo?.nombre || linea.sku,
        cantidad, precioUnitario: precio, costoUnitario: costo,
        subtotalVenta: cantidad * precio,
        subtotalCosto: cantidad * costo,
        utilidad: cantidad * precio - cantidad * costo,
      },
    ]);
    setLinea({ sku: linea.sku, cantidad:"", precioUnitario:"", costoUnitario:"" });
  }

  const canSave = form.cliente && items.length > 0;
  const costoAutoLabel = catalogoMap[linea.sku]?.costo
    ? `Auto: ${money(catalogoMap[linea.sku].costo)}`
    : "Vacío = $0";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title={editingId ? "Editando venta" : "Nueva venta"} subtitle="Registra ventas con múltiples productos y calcula utilidad automáticamente" />

      <div style={pageGrid}>
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
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </Field>
                <Field label="Cliente">
                  <input style={inputStyle} list="clientes-list" placeholder="Nombre del cliente" value={form.cliente}
                    onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
                  <datalist id="clientes-list">
                    {[...new Set(ventas.map((v) => v.cliente).filter(Boolean))].map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Origen de la venta">
                  <select style={selectStyle} value={form.origen}
                    onChange={(e) => setForm({ ...form, origen: e.target.value })}>
                    <option value="Inventario propio">Inventario propio</option>
                    <option value="Reventa">Reventa (Comerinvrc)</option>
                    <option value="Bajo pedido">Bajo pedido</option>
                  </select>
                </Field>
                <Field label="Forma de cobro">
                  <select style={selectStyle} value={form.formaPago}
                    onChange={(e) => setForm({ ...form, formaPago: e.target.value })}>
                    <option value="Contado">Contado</option>
                    <option value="Crédito">Crédito (pendiente de cobro)</option>
                  </select>
                </Field>
                {form.formaPago === "Contado" && (
                  <Field label="Cuenta donde entra">
                    <select style={selectStyle} value={form.cuentaId}
                      onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}>
                      <option value="">— Sin cuenta —</option>
                      {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="IVA">
                  <input type="number" style={inputStyle} placeholder="0" value={form.iva}
                    onChange={(e) => setForm({ ...form, iva: e.target.value })} />
                </Field>
                <Field label="Nota" wide>
                  <input style={inputStyle} placeholder="Observación general" value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                </Field>
              </FormGrid>
              {form.origen && (
                <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#64748b" }}>
                  <OrigenBadge origen={form.origen} />
                  {form.origen === "Inventario propio" && "Descuenta stock al guardar."}
                  {form.origen === "Reventa" && "No afecta stock propio."}
                  {form.origen === "Bajo pedido" && "No afecta stock propio."}
                </div>
              )}
            </FormSection>

            <FormSection label="Agregar productos">
              <FormGrid>
                <Field label="Producto / SKU" wide>
                  <select style={selectStyle} value={linea.sku}
                    onChange={(e) => setLinea({ ...linea, sku: e.target.value })}>
                    {catalogo.map((p) => (
                      <option key={p.sku} value={p.sku}>{p.sku} · {p.nombre}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cantidad">
                  <input type="number" style={inputStyle} value={linea.cantidad}
                    onChange={(e) => setLinea({ ...linea, cantidad: e.target.value })} />
                </Field>
                <Field label="Precio unitario">
                  <input type="number" style={inputStyle} value={linea.precioUnitario}
                    onChange={(e) => setLinea({ ...linea, precioUnitario: e.target.value })} />
                </Field>
                <Field label="Costo unitario" hint={costoAutoLabel}>
                  <input type="number" style={inputStyle} placeholder="Vacío = costo prom." value={linea.costoUnitario}
                    onChange={(e) => setLinea({ ...linea, costoUnitario: e.target.value })} />
                </Field>
              </FormGrid>
              <AddLineBtn onClick={agregarLinea}>+ Agregar ítem</AddLineBtn>
            </FormSection>

            {/* Items */}
            {items.length === 0 ? (
              <EmptyState icon="🏷️" text="Agrega al menos un producto." />
            ) : (
              <div style={itemsList}>
                {items.map((item) => {
                  const m = item.subtotalVenta > 0 ? (item.utilidad / item.subtotalVenta) * 100 : 0;
                  return (
                    <div key={item.id} style={itemRow}>
                      <div style={itemLeft}>
                        <span style={{ fontFamily:"monospace", fontSize:12, color:"#94a3b8" }}>{item.sku}</span>
                        <span style={{ fontWeight:700 }}>{item.producto}</span>
                        <div style={{ display:"flex", gap:16, fontSize:13 }}>
                          <span style={{ color:"#64748b" }}>{item.cantidad} und × {money(item.precioUnitario)}</span>
                          <span style={{ fontWeight:700, color: item.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                            +{money(item.utilidad)} ({m.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div style={itemRight}>
                        <span style={{ fontWeight:900 }}>{money(item.subtotalVenta)}</span>
                        <RemoveBtn onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Totales */}
            {items.length > 0 && (
              <TotalBox
                rows={[
                  ["Subtotal", money(resumenVivo.subtotal)],
                  ["Costo total", money(resumenVivo.costo), "#ef4444"],
                  ...(resumenVivo.iva > 0 ? [["IVA", money(resumenVivo.iva)]] : []),
                  ["Utilidad", `${money(resumenVivo.utilidad)} (${resumenVivo.margen.toFixed(1)}%)`,
                    resumenVivo.utilidad >= 0 ? "#059669" : "#dc2626"],
                ]}
                finalRow={["Total", money(resumenVivo.total)]}
              />
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
                const margen = item.subtotal > 0 ? (item.utilidad / item.subtotal) * 100 : 0;
                return (
                  <div key={item.id} style={s.histCard}>
                    <div style={histTop}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{item.cliente}</div>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginTop:4 }}>
                          <span style={{ fontSize:13, color:"#94a3b8" }}>{item.fecha}</span>
                          <OrigenBadge origen={item.origen} />
                          <PagoBadge forma={item.formaPago || "Contado"} />
                        </div>
                        {item.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{item.descripcion}</div>}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:900, fontSize:18 }}>{money(item.total)}</div>
                        <div style={{ fontSize:13, fontWeight:700, color: item.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                          {money(item.utilidad)} · {margen.toFixed(1)}%
                        </div>
                        {item.formaPago === "Crédito" && (() => {
                          const abonado  = (item.abonos||[]).reduce((a,x)=>a+x.valor,0);
                          const pendiente = Math.max(0, item.total - abonado);
                          return <div style={{ fontSize:12, color: pendiente > 0 ? "#f59e0b" : "#10b981", fontWeight:700 }}>
                            {pendiente > 0 ? `Pendiente: ${money(pendiente)}` : "✓ Cobrado"}
                          </div>;
                        })()}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {(item.items||[]).map((x) => <SkuPill key={x.id} label={`${x.sku} ×${x.cantidad}`} />)}
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

const pageGrid  = { display:"grid", gridTemplateColumns:"440px 1fr", gap:20, alignItems:"start" };
const histList  = { display:"flex", flexDirection:"column", gap:10 };
const histTop   = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 };
const itemsList = { display:"flex", flexDirection:"column", gap:8, margin:"4px 0" };
const itemRow   = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", gap:12 };
const itemLeft  = { display:"flex", flexDirection:"column", gap:2, flex:1 };
const itemRight = { display:"flex", alignItems:"center", gap:10, flexShrink:0 };
