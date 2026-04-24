import { useMemo, useState } from "react";
import { money, uid, today, isoMonth } from "../utils.js";
import {
  Panel, SectionHeader, FormSection, FormGrid, Field, inputStyle, selectStyle,
  AddLineBtn, RemoveBtn, TotalBox, PrimaryBtn, CancelBtn, ExportBtn,
  EditBtn, DeleteBtn, SkuPill, EmptyState, Alert, OrigenBadge, PagoBadge, PagosBuilder,
  SearchInput, PillFilter, useConfirm, s,
} from "../ui.jsx";

function exportVentasCSV(ventas, cuentas) {
  const headers = ["Fecha","Cliente","Origen","Forma de pago","Subtotal","Costo","Utilidad","Total"];
  const rows    = ventas.map((v) => [
    v.fecha,
    `"${(v.cliente||"").replace(/"/g,'""')}"`,
    v.origen||"",
    v.formaPago||"",
    v.subtotal||0,
    v.costoTotal||0,
    v.utilidad||0,
    v.total||0,
  ]);
  const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `ventas_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Ventas({
  ventas, catalogo, cuentas,
  editingId,
  form, setForm,
  linea, setLinea,
  items, setItems,
  pagos, setPagos,
  pagoLinea, setPagoLinea,
  onSave, onEdit, onDelete, onCancel,
  onPagarProveedorReventa,
  onSaveProducto,
}) {
  const [pagoProvOpen, setPagoProvOpen] = useState(null);
  const [pagoProvForm, setPagoProvForm] = useState({ fecha: today(), monto:"", cuentaId:"", nota:"", proveedor:"" });
  const [search,    setSearch]    = useState("");
  const [filtOrigen,setFiltOrigen]= useState("todos");
  const [filtPer,   setFiltPer]   = useState("todos");

  // ── Edición inline de ítems ─────────────────────────────────────────────
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemForm,  setEditItemForm]  = useState({ cantidad:"", precioUnitario:"", costoUnitario:"" });

  // ── Crear nuevo producto desde la venta ─────────────────────────────────
  const [showNuevoProd,  setShowNuevoProd]  = useState(false);
  const [nuevoProdForm,  setNuevoProdForm]  = useState({ sku:"", nombre:"", tipo:"Producto", costoBase:"", precioVenta:"" });
  const [nuevoProdError, setNuevoProdError] = useState("");

  const { confirm, modal: confirmModal } = useConfirm();

  async function handleDelete(id) {
    const ok = await confirm("¿Eliminar esta venta? Esta acción no se puede deshacer.");
    if (ok) onDelete(id);
  }

  const ventasFiltradas = useMemo(() => {
    let lista = [...ventas].sort((a,b) => b.fecha.localeCompare(a.fecha));
    const q = search.trim().toLowerCase();
    if (q) lista = lista.filter((v) =>
      (v.cliente||"").toLowerCase().includes(q) ||
      (v.descripcion||"").toLowerCase().includes(q) ||
      (v.origen||"").toLowerCase().includes(q)
    );
    if (filtOrigen !== "todos") lista = lista.filter((v) => (v.origen||"") === filtOrigen);
    if (filtPer === "mes") {
      const d = new Date(); const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      lista = lista.filter((v) => isoMonth(v.fecha) === m);
    } else if (filtPer === "anterior") {
      const d = new Date(); d.setMonth(d.getMonth()-1);
      const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      lista = lista.filter((v) => isoMonth(v.fecha) === m);
    } else if (filtPer === "3m") {
      const d = new Date(); d.setMonth(d.getMonth()-3);
      lista = lista.filter((v) => v.fecha >= d.toISOString().slice(0,10));
    }
    return lista;
  }, [ventas, search, filtOrigen, filtPer]);

  const hasFilters = search || filtOrigen !== "todos" || filtPer !== "todos";
  const origenes   = [...new Set(ventas.map((v) => v.origen).filter(Boolean))];

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

  function startEditItem(item) {
    setEditingItemId(item.id);
    setEditItemForm({
      cantidad: item.cantidad.toString(),
      precioUnitario: item.precioUnitario.toString(),
      costoUnitario: item.costoUnitario.toString(),
    });
  }

  function saveItemEdit(item) {
    const cantidad = Number(editItemForm.cantidad || 0);
    const precio   = Number(editItemForm.precioUnitario || 0);
    const costo    = Number(editItemForm.costoUnitario || 0);
    if (cantidad <= 0 || precio <= 0) return;
    setItems((prev) => prev.map((i) =>
      i.id !== item.id ? i : {
        ...i, cantidad, precioUnitario: precio, costoUnitario: costo,
        subtotalVenta: cantidad * precio,
        subtotalCosto: cantidad * costo,
        utilidad: cantidad * precio - cantidad * costo,
      }
    ));
    setEditingItemId(null);
  }

  function guardarNuevoProducto() {
    const sku = nuevoProdForm.sku.trim().toUpperCase();
    const nombre = nuevoProdForm.nombre.trim();
    if (!sku || !nombre) { setNuevoProdError("SKU y nombre son obligatorios"); return; }
    if (catalogo.some((p) => p.sku === sku)) { setNuevoProdError(`El SKU "${sku}" ya existe`); return; }
    const prod = {
      id: uid(),
      sku,
      nombre,
      tipo: nuevoProdForm.tipo || "Producto",
      costoBase: Number(nuevoProdForm.costoBase || 0),
      precioVenta: Number(nuevoProdForm.precioVenta || 0),
    };
    onSaveProducto?.(prod);
    setLinea({ ...linea, sku: prod.sku, costoUnitario: prod.costoBase.toString(), precioUnitario: prod.precioVenta.toString() });
    setShowNuevoProd(false);
    setNuevoProdForm({ sku:"", nombre:"", tipo:"Producto", costoBase:"", precioVenta:"" });
    setNuevoProdError("");
  }

  const canSave     = form.cliente && items.length > 0;
  const costoAutoLabel = catalogoMap[linea.sku]?.costo
    ? `Auto: ${money(catalogoMap[linea.sku].costo)}`
    : "Vacío = $0";
  const isReventaSku = catalogoMap[linea.sku]?.tipo === "Reventa";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {confirmModal}
      <NuevoProductoModal
        show={showNuevoProd}
        form={nuevoProdForm}
        error={nuevoProdError}
        onFormChange={setNuevoProdForm}
        onGuardar={guardarNuevoProducto}
        onClose={() => { setShowNuevoProd(false); setNuevoProdError(""); }}
      />
      <SectionHeader
        title={editingId ? "Editando venta" : "Nueva venta"}
        subtitle="Registra ventas con múltiples productos y calcula utilidad automáticamente"
        actions={<ExportBtn onClick={() => exportVentasCSV(ventas, cuentas)} label="Exportar CSV" />}
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
                  <div style={{ display:"flex", gap:6 }}>
                    <select style={{ ...selectStyle, flex:1 }} value={linea.sku}
                      onChange={(e) => {
                        const info = catalogoMap[e.target.value];
                        setLinea({ ...linea, sku:e.target.value, esReventa: info?.tipo === "Reventa" });
                      }}>
                      {catalogo.map((p) => (
                        <option key={p.sku} value={p.sku}>{p.sku} · {p.nombre}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { setNuevoProdError(""); setShowNuevoProd(true); }}
                      title="Crear nuevo producto en inventario"
                      style={{ border:"1.5px dashed #cbd5e1", background:"white", color:"#475569", borderRadius:8, padding:"7px 12px", fontWeight:700, cursor:"pointer", fontSize:13, whiteSpace:"nowrap", flexShrink:0 }}>
                      ＋ Nuevo
                    </button>
                  </div>
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

                  // ── Modo edición inline ──────────────────────────────────
                  if (editingItemId === item.id) {
                    const previewTotal = Number(editItemForm.cantidad||0) * Number(editItemForm.precioUnitario||0);
                    return (
                      <div key={item.id} style={{ ...itemRow, background:"#F0F9FF", borderColor:"#7DD3FC", flexDirection:"column", gap:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, color:"#64748b" }}>{item.sku}</span>
                          <span style={{ fontWeight:700, fontSize:13 }}>{item.producto}</span>
                          {item.esReventa && <span style={{ fontSize:11, fontWeight:700, background:"#fef3c7", color:"#92400e", borderRadius:4, padding:"2px 6px" }}>REVENTA</span>}
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
                          <div>
                            <div style={{ fontSize:11, color:"#64748b", marginBottom:3, fontWeight:600 }}>Cantidad</div>
                            <input type="number" autoFocus value={editItemForm.cantidad}
                              onChange={(e) => setEditItemForm({ ...editItemForm, cantidad:e.target.value })}
                              style={{ ...inputStyle, width:80 }} />
                          </div>
                          <div>
                            <div style={{ fontSize:11, color:"#64748b", marginBottom:3, fontWeight:600 }}>Precio unit.</div>
                            <input type="number" value={editItemForm.precioUnitario}
                              onChange={(e) => setEditItemForm({ ...editItemForm, precioUnitario:e.target.value })}
                              style={{ ...inputStyle, width:110 }} />
                          </div>
                          <div>
                            <div style={{ fontSize:11, color:"#64748b", marginBottom:3, fontWeight:600 }}>Costo unit.</div>
                            <input type="number" value={editItemForm.costoUnitario}
                              onChange={(e) => setEditItemForm({ ...editItemForm, costoUnitario:e.target.value })}
                              style={{ ...inputStyle, width:110 }} />
                          </div>
                          {previewTotal > 0 && (
                            <div style={{ fontWeight:700, fontSize:14, color:"#0f172a", paddingBottom:6 }}>
                              = {money(previewTotal)}
                            </div>
                          )}
                          <div style={{ display:"flex", gap:6, paddingBottom:6 }}>
                            <button onClick={() => saveItemEdit(item)}
                              style={{ background:"#0f172a", color:"white", border:"none", borderRadius:7, padding:"7px 14px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                              ✓ Guardar
                            </button>
                            <button onClick={() => setEditingItemId(null)}
                              style={{ background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", borderRadius:7, padding:"7px 12px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── Modo vista normal ────────────────────────────────────
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
                          style={{ border:"1px solid #bfdbfe", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, fontWeight:700, background:"#eff6ff", color:"#1d4ed8" }}
                          onClick={() => startEditItem(item)}
                          title="Editar precio / cantidad / costo">
                          ✎
                        </button>
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
                <strong>💡 Costo de reventa: {money(resumenVivo.costoReventa)}</strong><br/>
                <span style={{ fontSize:12 }}>La caja recibirá el total de la venta. Después de guardar, registra el pago al proveedor directamente desde el historial de esta venta.</span>
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
        <Panel title={`Historial (${ventasFiltradas.length}${hasFilters ? " filtradas" : ""})`}>
          {/* Filtros */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente, descripción u origen..." />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <PillFilter
                value={filtPer}
                onChange={setFiltPer}
                options={[
                  { value:"todos",    label:"Todo" },
                  { value:"mes",      label:"Este mes" },
                  { value:"anterior", label:"Mes ant." },
                  { value:"3m",       label:"3 meses" },
                ]}
              />
              {origenes.length > 1 && (
                <select style={{ ...selectStyle, minWidth:160, flex:1 }} value={filtOrigen}
                  onChange={(e) => setFiltOrigen(e.target.value)}>
                  <option value="todos">Todos los orígenes</option>
                  {origenes.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {hasFilters && (
                <button onClick={() => { setSearch(""); setFiltOrigen("todos"); setFiltPer("todos"); }}
                  style={{ border:"1px solid #EF9A9A", background:"#FFEBEE", color:"#C62828", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  ✕ Limpiar
                </button>
              )}
            </div>
          </div>

          {ventasFiltradas.length === 0 ? (
            <EmptyState icon="📋" text={hasFilters ? "Sin ventas con ese filtro." : "No hay ventas registradas aún."} />
          ) : (
            <div style={histList}>
              {ventasFiltradas.map((item) => {
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
                        <div style={{ fontWeight:700, fontSize:15, color:"#1A1A1A" }}>{item.cliente}</div>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginTop:4 }}>
                          <span style={{ fontSize:13, color:"#9E9E9E" }}>{item.fecha}</span>
                          <OrigenBadge origen={item.origen} />
                          <PagoBadge forma={item.formaPago || "Contado"} />
                          {(item.pagos || []).map((p, i) => (
                            <span key={i} style={{ fontSize:12, color:"#2E7D32", background:"#E8F5E9", borderRadius:6, padding:"2px 8px" }}>
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
                          <ReventaStatus
                            costoReventa={item.costoReventa}
                            pagosProvReventa={item.pagosProvReventa}
                          />
                        )}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {(item.items || []).map((x) => (
                        <SkuPill key={x.id} label={`${x.sku} ×${x.cantidad}`} reventa={x.esReventa} />
                      ))}
                    </div>

                    {/* ── Pago al proveedor de reventa ─────────────────── */}
                    {item.costoReventa > 0 && (
                      <PagoProvReventa
                        venta={item}
                        cuentas={cuentas}
                        isOpen={pagoProvOpen === item.id}
                        form={pagoProvForm}
                        onOpen={() => {
                          const pagadoProv = (item.pagosProvReventa||[]).reduce((a,p)=>a+p.monto,0);
                          const pendienteProv = Math.max(0, item.costoReventa - pagadoProv);
                          setPagoProvOpen(item.id);
                          setPagoProvForm({ fecha:today(), monto:pendienteProv.toString(), cuentaId:"", nota:"", proveedor:"" });
                        }}
                        onClose={() => setPagoProvOpen(null)}
                        onFormChange={(f) => setPagoProvForm(f)}
                        onGuardar={() => {
                          const monto = Number(pagoProvForm.monto||0);
                          if (monto <= 0) return;
                          // Reset PRIMERO para evitar crash de DOM al actualizar ventas
                          setPagoProvOpen(null);
                          setPagoProvForm({ fecha:today(), monto:"", cuentaId:"", nota:"", proveedor:"" });
                          onPagarProveedorReventa(item.id, {
                            fecha: pagoProvForm.fecha,
                            monto,
                            cuentaId: pagoProvForm.cuentaId || null,
                            nota: pagoProvForm.nota,
                            proveedor: pagoProvForm.proveedor || null,
                          });
                        }}
                      />
                    )}

                    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                      <EditBtn onClick={() => onEdit(item)} />
                      <DeleteBtn onClick={() => handleDelete(item.id)} />
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

// ─── Modal: crear nuevo producto desde ventas ─────────────────────────────────
function NuevoProductoModal({ show, form, onFormChange, onGuardar, onClose, error }) {
  if (!show) return null;
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"white", borderRadius:16, padding:28, maxWidth:460, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <h3 style={{ margin:0, fontSize:17, fontWeight:800 }}>📦 Crear producto en inventario</h3>
            <p style={{ margin:"4px 0 0", fontSize:12, color:"#64748b" }}>El producto quedará disponible para futuras ventas y compras</p>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"#f1f5f9", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16, fontWeight:700, color:"#64748b" }}>✕</button>
        </div>
        {error && <div style={{ background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:12, fontWeight:600 }}>{error}</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:4 }}>SKU *</div>
              <input style={inputStyle} placeholder="Ej: MESA-80-60" value={form.sku}
                onChange={(e) => onFormChange({ ...form, sku:e.target.value.toUpperCase() })} autoFocus />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:4 }}>Tipo</div>
              <select style={selectStyle} value={form.tipo} onChange={(e) => onFormChange({ ...form, tipo:e.target.value })}>
                <option value="Producto">Producto</option>
                <option value="Reventa">Reventa</option>
                <option value="Servicio">Servicio</option>
              </select>
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:4 }}>Nombre del producto *</div>
            <input style={inputStyle} placeholder="Ej: Marco metálico 80cm×60cm" value={form.nombre}
              onChange={(e) => onFormChange({ ...form, nombre:e.target.value })} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:4 }}>Costo base</div>
              <input type="number" style={inputStyle} placeholder="0" value={form.costoBase}
                onChange={(e) => onFormChange({ ...form, costoBase:e.target.value })} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:4 }}>Precio de venta</div>
              <input type="number" style={inputStyle} placeholder="0" value={form.precioVenta}
                onChange={(e) => onFormChange({ ...form, precioVenta:e.target.value })} />
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onGuardar}
            style={{ flex:1, background:"#0f172a", color:"white", border:"none", borderRadius:10, padding:"12px", fontWeight:700, cursor:"pointer", fontSize:14 }}>
            ✓ Crear y usar en la venta
          </button>
          <button onClick={onClose}
            style={{ background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componente: estado de reventa (lado derecho del card) ────────────────
// Componente propio para que React tenga tipo estable en reconciliación
function ReventaStatus({ costoReventa, pagosProvReventa }) {
  const pagadoProv    = (pagosProvReventa||[]).reduce((a,p) => a + p.monto, 0);
  const pendienteProv = Math.max(0, costoReventa - pagadoProv);
  return (
    <div style={{ fontSize:12, fontWeight:600, marginTop:4 }}>
      <span style={{ color:"#92400e" }}>Reventa: {money(costoReventa)}</span>
      {pendienteProv > 0
        ? <span style={{ color:"#C62828", display:"block" }}>⚠ Prov: {money(pendienteProv)} pendiente</span>
        : <span style={{ color:"#2E7D32", display:"block" }}>✓ Proveedor pagado</span>
      }
    </div>
  );
}

// ─── Sub-componente: formulario pago proveedor reventa ────────────────────────
// Componente propio = React puede hacer reconciliación estable (sin IIFE)
function PagoProvReventa({ venta, cuentas, isOpen, form, onOpen, onClose, onFormChange, onGuardar }) {
  const pagadoProv    = (venta.pagosProvReventa||[]).reduce((a,p) => a + p.monto, 0);
  const pendienteProv = Math.max(0, venta.costoReventa - pagadoProv);
  const pagoPct       = venta.costoReventa > 0 ? Math.min(100, (pagadoProv / venta.costoReventa) * 100) : 100;

  return (
    <div style={{ marginTop:8, paddingTop:10, borderTop:"1px solid #fde68a" }}>
      {/* Header con estado */}
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
        <span style={{ color:"#92400e", fontWeight:700 }}>Pago al proveedor (reventa)</span>
        <span style={{ fontWeight:700, color: pendienteProv > 0 ? "#C62828" : "#2E7D32" }}>
          {pendienteProv > 0 ? `Pendiente: ${money(pendienteProv)}` : "✓ Cancelado"}
        </span>
      </div>

      {/* Barra de progreso */}
      <div style={{ height:6, background:"#fef3c7", borderRadius:99, marginBottom:6 }}>
        <div style={{ height:"100%", width:`${pagoPct}%`, background: pendienteProv > 0 ? "#f59e0b" : "#10b981", borderRadius:99, transition:"width .4s" }} />
      </div>

      {/* Pagos realizados */}
      {(venta.pagosProvReventa||[]).length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:3, marginBottom:8 }}>
          {venta.pagosProvReventa.map((p) => (
            <div key={p.id} style={{ fontSize:11, color:"#92400e", display:"flex", gap:6 }}>
              <span>✓</span>
              <span>
                {p.fecha}: {money(p.monto)}
                {p.proveedor ? ` [${p.proveedor}]` : ""}
                {p.cuentaId ? ` → ${cuentas.find(c=>c.id===p.cuentaId)?.nombre||"?"}` : ""}
                {p.nota ? ` · ${p.nota}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Botón / Formulario */}
      {pendienteProv > 0 && !isOpen && (
        <button
          style={{ fontSize:12, fontWeight:700, background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", borderRadius:7, padding:"5px 12px", cursor:"pointer" }}
          onClick={onOpen}>
          + Registrar pago al proveedor
        </button>
      )}

      {pendienteProv > 0 && isOpen && (
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#616161", marginBottom:4 }}>Fecha</div>
              <input type="date" style={inputStyle} value={form.fecha}
                onChange={(e) => onFormChange({...form, fecha:e.target.value})} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#616161", marginBottom:4 }}>Monto</div>
              <input type="number" style={inputStyle} value={form.monto}
                onChange={(e) => onFormChange({...form, monto:e.target.value})} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#616161", marginBottom:4 }}>Proveedor</div>
              <input style={inputStyle} autoComplete="off" placeholder="Ej: Comerinv" value={form.proveedor||""}
                onChange={(e) => onFormChange({...form, proveedor:e.target.value})} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#616161", marginBottom:4 }}>Cuenta de salida</div>
              <select style={selectStyle} value={form.cuentaId}
                onChange={(e) => onFormChange({...form, cuentaId:e.target.value})}>
                <option value="">Sin asignar</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#616161", marginBottom:4 }}>Nota</div>
              <input style={inputStyle} autoComplete="off" placeholder="Ej: Transferencia Nequi" value={form.nota}
                onChange={(e) => onFormChange({...form, nota:e.target.value})} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button
              style={{ flex:1, background:"#92400e", color:"white", border:"none", borderRadius:8, padding:"9px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}
              onClick={onGuardar}>
              ✓ Guardar pago
            </button>
            <button
              style={{ background:"#F5F5F5", color:"#616161", border:"none", borderRadius:8, padding:"9px 12px", fontWeight:600, fontSize:13, cursor:"pointer" }}
              onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const histList  = { display:"flex", flexDirection:"column", gap:10 };
const histTop   = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" };
const itemsList = { display:"flex", flexDirection:"column", gap:8, margin:"4px 0" };
const itemRow   = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", gap:12 };
const itemLeft  = { display:"flex", flexDirection:"column", gap:2, flex:1 };
const itemRight = { display:"flex", alignItems:"center", gap:8, flexShrink:0 };
