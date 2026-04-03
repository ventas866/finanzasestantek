import { useMemo } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, FormSection, FormGrid, Field, inputStyle, selectStyle,
  AddLineBtn, RemoveBtn, TotalBox, PrimaryBtn, CancelBtn, DarkBtn,
  EditBtn, DeleteBtn, SkuPill, EmptyState, Alert, PagoBadge, s,
} from "../ui.jsx";

export default function Compras({
  compras, catalogo, cuentas,
  editingId, setEditingId,
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
    const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
    const flete = Number(form.flete || 0);
    return { subtotal, flete, total: subtotal + flete };
  }, [items, form.flete]);

  function agregarLinea() {
    const cantidad = Number(linea.cantidad || 0);
    const costoUnitario = Number(linea.costoUnitario || 0);
    if (!linea.sku || cantidad <= 0 || costoUnitario < 0) return;
    const prod = catalogoMap[linea.sku];
    setItems((prev) => [
      ...prev,
      { id: uid(), sku: linea.sku, producto: prod?.nombre || linea.sku, cantidad, costoUnitario, subtotal: cantidad * costoUnitario },
    ]);
    setLinea({ sku: linea.sku, cantidad:"", costoUnitario:"" });
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
                <Field label="Forma de pago">
                  <select style={selectStyle} value={form.formaPago}
                    onChange={(e) => setForm({ ...form, formaPago: e.target.value })}>
                    <option value="Contado">Contado</option>
                    <option value="Crédito">Crédito (pago pendiente)</option>
                  </select>
                </Field>
                {form.formaPago === "Contado" && (
                  <Field label="Cuenta de pago">
                    <select style={selectStyle} value={form.cuentaId}
                      onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}>
                      <option value="">— Sin cuenta —</option>
                      {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </Field>
                )}
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
                      <span style={{ fontFamily:"monospace", fontSize:12, color:"#94a3b8" }}>{item.sku}</span>
                      <span style={{ fontWeight:700 }}>{item.producto}</span>
                      <span style={{ fontSize:13, color:"#64748b" }}>{item.cantidad} und × {money(item.costoUnitario)}</span>
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
              {compras.map((item) => (
                <div key={item.id} style={s.histCard}>
                  <div style={histTop}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{item.proveedor}</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:4 }}>
                        <span style={{ fontSize:13, color:"#94a3b8" }}>{item.fecha}</span>
                        <PagoBadge forma={item.formaPago || "Contado"} />
                        {item.cuentaId && (
                          <span style={{ fontSize:12, color:"#64748b" }}>→ {cuentas.find((c)=>c.id===item.cuentaId)?.nombre}</span>
                        )}
                      </div>
                      {item.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{item.descripcion}</div>}
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900, fontSize:18 }}>{money(item.total)}</div>
                      {item.flete > 0 && <div style={{ fontSize:12, color:"#94a3b8" }}>inc. flete {money(item.flete)}</div>}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {(item.items || []).map((x) => <SkuPill key={x.id} label={`${x.sku} ×${x.cantidad}`} />)}
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <EditBtn onClick={() => onEdit(item)} />
                    <DeleteBtn onClick={() => onDelete(item.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

const pageGrid = { display:"grid", gridTemplateColumns:"440px 1fr", gap:20, alignItems:"start" };
const histList = { display:"flex", flexDirection:"column", gap:10 };
const histTop  = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 };
const itemsList = { display:"flex", flexDirection:"column", gap:8, margin:"4px 0" };
const itemRow = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", gap:12 };
const itemLeft = { display:"flex", flexDirection:"column", gap:2, flex:1 };
const itemRight = { display:"flex", alignItems:"center", gap:10, flexShrink:0 };
