import { useMemo } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, FormSection, FormGrid, Field, inputStyle, selectStyle,
  AddLineBtn, RemoveBtn, TotalBox, PrimaryBtn, CancelBtn, DarkBtn,
  EditBtn, DeleteBtn, SkuPill, EmptyState, Alert, PagoBadge, PagosBuilder, s,
} from "../ui.jsx";

export default function Compras({
  compras, catalogo, cuentas,
  editingId, setEditingId,
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
    const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
    const flete = Number(form.flete || 0);
    return { subtotal, flete, total: subtotal + flete };
  }, [items, form.flete]);

  function agregarLinea() {
    if (linea.esLibre) {
      // Ítem libre (lote / materia prima)
      const sku       = linea.skuLibre.trim() || `LOTE-${Date.now()}`;
      const nombre    = linea.nombreLibre.trim() || sku;
      const cantidad  = Number(linea.cantidad || 1);
      const costoUnit = Number(linea.costoUnitario || 0);
      if (costoUnit <= 0) return;
      setItems((prev) => [
        ...prev,
        {
          id: uid(), sku, producto: nombre, cantidad, costoUnitario: costoUnit,
          subtotal: cantidad * costoUnit, esLote: true,
        },
      ]);
      setLinea({ ...linea, cantidad:"1", costoUnitario:"", skuLibre:"", nombreLibre:"" });
    } else {
      const cantidad     = Number(linea.cantidad || 0);
      const costoUnitario = Number(linea.costoUnitario || 0);
      if (!linea.sku || cantidad <= 0 || costoUnitario < 0) return;
      const prod = catalogoMap[linea.sku];
      setItems((prev) => [
        ...prev,
        { id: uid(), sku: linea.sku, producto: prod?.nombre || linea.sku, cantidad, costoUnitario, subtotal: cantidad * costoUnitario },
      ]);
      setLinea({ ...linea, cantidad:"", costoUnitario:"" });
    }
  }

  const canSave = form.proveedor && items.length > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title={editingId ? "Editando compra" : "Nueva compra"} subtitle="Registra una orden de compra con múltiples productos" />

      <div style={pageGrid}>
        {/* Formulario */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Panel title={editingId ? "✎ Editar compra" : "Registrar compra"}>
            {editingId && (
              <Alert type="info" text="Editando compra existente. El inventario se recalcula automáticamente al guardar." />
            )}
            {editingId && <div style={{ height:12 }} />}

            <FormSection label="Datos generales">
              <FormGrid>
                <Field label="Fecha">
                  <input type="date" style={inputStyle} value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </Field>
                <Field label="Proveedor">
                  <input style={inputStyle} placeholder="Ej: Fábrica Acerías, Comerinvrc..." value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
                </Field>
                <Field label="Flete / adicionales">
                  <input type="number" style={inputStyle} placeholder="0" value={form.flete}
                    onChange={(e) => setForm({ ...form, flete: e.target.value })} />
                </Field>
                <Field label="Nota interna">
                  <input style={inputStyle} placeholder="Observación opcional" value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                </Field>
              </FormGrid>
            </FormSection>

            <FormSection label="Agregar productos">
              {/* Toggle: catálogo vs libre */}
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <button
                  style={{ ...toggleBtn, ...(linea.esLibre ? {} : toggleBtnActive) }}
                  onClick={() => setLinea({ ...linea, esLibre:false })}>
                  Catálogo
                </button>
                <button
                  style={{ ...toggleBtn, ...(linea.esLibre ? toggleBtnActive : {}) }}
                  onClick={() => setLinea({ ...linea, esLibre:true })}>
                  Libre / Materia prima
                </button>
              </div>

              {linea.esLibre ? (
                /* Ítem libre: lote de madera, material sin SKU fijo */
                <FormGrid>
                  <Field label="Referencia / SKU">
                    <input style={inputStyle} placeholder="Ej: MADERA-80x80" value={linea.skuLibre}
                      onChange={(e) => setLinea({ ...linea, skuLibre: e.target.value })} />
                  </Field>
                  <Field label="Descripción">
                    <input style={inputStyle} placeholder="Ej: Saldo madera 80x80 sin cortar" value={linea.nombreLibre}
                      onChange={(e) => setLinea({ ...linea, nombreLibre: e.target.value })} />
                  </Field>
                  <Field label="Cantidad (lotes / unidades)">
                    <input type="number" style={inputStyle} placeholder="1" value={linea.cantidad}
                      onChange={(e) => setLinea({ ...linea, cantidad: e.target.value })} />
                  </Field>
                  <Field label="Costo total del lote" hint="Precio total pagado por este material">
                    <input type="number" style={inputStyle} placeholder="0" value={linea.costoUnitario}
                      onChange={(e) => setLinea({ ...linea, costoUnitario: e.target.value })} />
                  </Field>
                </FormGrid>
              ) : (
                /* Ítem de catálogo */
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
                  <Field label="Costo unitario">
                    <input type="number" style={inputStyle} value={linea.costoUnitario}
                      onChange={(e) => setLinea({ ...linea, costoUnitario: e.target.value })} />
                  </Field>
                </FormGrid>
              )}
              <AddLineBtn onClick={agregarLinea}>+ Agregar ítem</AddLineBtn>
            </FormSection>

            {/* Items */}
            {items.length === 0 ? (
              <EmptyState icon="📦" text="Agrega al menos un producto." />
            ) : (
              <div style={itemsList}>
                {items.map((item) => (
                  <div key={item.id} style={itemRow}>
                    <div style={itemLeft}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, color:"#94a3b8" }}>{item.sku}</span>
                        {item.esLote && <span style={{ fontSize:11, fontWeight:700, background:"#fef3c7", color:"#92400e", borderRadius:4, padding:"2px 6px" }}>LOTE</span>}
                      </div>
                      <span style={{ fontWeight:700 }}>{item.producto}</span>
                      <span style={{ fontSize:13, color:"#64748b" }}>{item.cantidad} {item.esLote ? "lote(s)" : "und"} × {money(item.costoUnitario)}</span>
                    </div>
                    <div style={itemRight}>
                      <span style={{ fontWeight:900 }}>{money(item.subtotal)}</span>
                      <RemoveBtn onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales */}
            {items.length > 0 && (
              <TotalBox
                rows={[
                  ["Subtotal productos", money(resumenVivo.subtotal)],
                  ...(resumenVivo.flete > 0 ? [["Flete", money(resumenVivo.flete)]] : []),
                ]}
                finalRow={["Total compra", money(resumenVivo.total)]}
              />
            )}

            {/* Forma de pago */}
            {items.length > 0 && (
              <FormSection label="Forma de pago">
                <PagosBuilder
                  total={resumenVivo.total}
                  pagos={pagos}
                  setPagos={setPagos}
                  pagoLinea={pagoLinea}
                  setPagoLinea={setPagoLinea}
                  cuentas={cuentas}
                  labelCredito="cuenta por pagar (proveedor)"
                />
              </FormSection>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
              <PrimaryBtn onClick={onSave} disabled={!canSave}>
                {editingId ? "Guardar cambios" : "Registrar compra"}
              </PrimaryBtn>
              {editingId && <CancelBtn onClick={onCancel}>Cancelar edición</CancelBtn>}
            </div>
          </Panel>
        </div>

        {/* Historial */}
        <Panel title={`Historial (${compras.length})`}>
          {compras.length === 0 ? (
            <EmptyState icon="📋" text="No hay compras registradas aún." />
          ) : (
            <div style={histList}>
              {compras.map((item) => {
                // Compute pending amount
                const creditoBase = item.pagos?.length > 0
                  ? Math.max(0, item.total - item.pagos.reduce((a,p)=>a+p.monto,0))
                  : item.formaPago === "Crédito" ? item.total : 0;
                const pagadoProv = (item.pagosProv||[]).reduce((a,p)=>a+p.monto,0);
                const pendiente  = Math.max(0, creditoBase - pagadoProv);

                return (
                  <div key={item.id} style={s.histCard}>
                    <div style={histTop}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{item.proveedor}</div>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:4, flexWrap:"wrap" }}>
                          <span style={{ fontSize:13, color:"#94a3b8" }}>{item.fecha}</span>
                          <PagoBadge forma={item.formaPago || "Contado"} />
                          {/* Show pagos */}
                          {(item.pagos||[]).map((p,i) => (
                            <span key={i} style={{ fontSize:12, color:"#064e3b", background:"#d1fae5", borderRadius:6, padding:"2px 8px" }}>
                              {cuentas.find(c=>c.id===p.cuentaId)?.nombre}: {money(p.monto)}
                            </span>
                          ))}
                          {!item.pagos?.length && item.cuentaId && (
                            <span style={{ fontSize:12, color:"#64748b" }}>→ {cuentas.find((c)=>c.id===item.cuentaId)?.nombre}</span>
                          )}
                        </div>
                        {item.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{item.descripcion}</div>}
                        {/* Pagos proveedor */}
                        {(item.pagosProv||[]).length > 0 && (
                          <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:3 }}>
                            {item.pagosProv.map((p) => (
                              <div key={p.id} style={{ fontSize:12, color:"#64748b" }}>
                                ✓ Pago proveedor {p.fecha}: {money(p.monto)}
                                {p.cuentaId && ` → ${cuentas.find(c=>c.id===p.cuentaId)?.nombre}`}
                                {p.nota && ` · ${p.nota}`}
                              </div>
                            ))}
                          </div>
                        )}
                        {pendiente > 0 && (
                          <div style={{ marginTop:4, fontSize:12, fontWeight:700, color:"#dc2626" }}>
                            Pendiente proveedor: {money(pendiente)}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:900, fontSize:18 }}>{money(item.total)}</div>
                        {item.flete > 0 && <div style={{ fontSize:12, color:"#94a3b8" }}>inc. flete {money(item.flete)}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {(item.items || []).map((x) => <SkuPill key={x.id} label={`${x.sku} ×${x.cantidad}${x.esLote?" (lote)":""}`} />)}
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

const pageGrid  = { display:"grid", gridTemplateColumns:"460px 1fr", gap:20, alignItems:"start" };
const histList  = { display:"flex", flexDirection:"column", gap:10 };
const histTop   = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 };
const itemsList = { display:"flex", flexDirection:"column", gap:8, margin:"4px 0" };
const itemRow   = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", gap:12 };
const itemLeft  = { display:"flex", flexDirection:"column", gap:2, flex:1 };
const itemRight = { display:"flex", alignItems:"center", gap:10, flexShrink:0 };

const toggleBtn = {
  border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 14px",
  background:"white", color:"#475569", fontWeight:600, cursor:"pointer", fontSize:13,
};
const toggleBtnActive = { background:"#0f172a", borderColor:"#0f172a", color:"white" };
