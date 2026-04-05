import { useMemo, useState } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, FormSection, FormGrid, Field, inputStyle, selectStyle,
  AddLineBtn, RemoveBtn, TotalBox, PrimaryBtn, CancelBtn, ExportBtn,
  EditBtn, DeleteBtn, SkuPill, EmptyState, Alert, PagoBadge, PagosBuilder,
  useConfirm, s,
} from "../ui.jsx";

function exportComprasCSV(compras, cuentas) {
  const headers = ["Fecha","Proveedor","Forma de pago","Flete","Subtotal","Total","Nota"];
  const rows    = compras.map((c) => [
    c.fecha,
    `"${(c.proveedor||"").replace(/"/g,'""')}"`,
    c.formaPago||"",
    c.flete||0,
    c.subtotal||0,
    c.total||0,
    `"${(c.descripcion||"").replace(/"/g,'""')}"`,
  ]);
  const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `compras_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

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

  const [histTab,     setHistTab]     = useState("todas");
  const [searchProv,  setSearchProv]  = useState("");
  const [filtProv,    setFiltProv]    = useState("");
  const { confirm, modal: confirmModal } = useConfirm();

  async function handleDelete(id) {
    const ok = await confirm("¿Eliminar esta compra? Esta acción no se puede deshacer.");
    if (ok) onDelete(id);
  }

  const resumenVivo = useMemo(() => {
    const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
    const flete    = Number(form.flete || 0);
    return { subtotal, flete, total: subtotal + flete };
  }, [items, form.flete]);

  function agregarLinea() {
    if (linea.esLibre) {
      const sku       = linea.skuLibre.trim() || `LOTE-${Date.now()}`;
      const nombre    = linea.nombreLibre.trim() || sku;
      const cantidad  = Number(linea.cantidad || 1);
      const costoUnit = Number(linea.costoUnitario || 0);
      if (costoUnit <= 0) return;
      setItems((prev) => [
        ...prev,
        { id: uid(), sku, producto: nombre, cantidad, costoUnitario: costoUnit,
          subtotal: cantidad * costoUnit, esLote: true },
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

  // ── Stats historial ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalComprado  = compras.reduce((a, c) => a + c.total, 0);
    const proveedores    = [...new Set(compras.map((c) => c.proveedor))];
    const pendientePagar = compras.reduce((a, c) => {
      const creditoBase = c.pagos?.length > 0
        ? Math.max(0, c.total - c.pagos.reduce((s,p)=>s+p.monto,0))
        : c.formaPago === "Crédito" ? c.total : 0;
      const pagado = (c.pagosProv||[]).reduce((s,p)=>s+p.monto,0);
      return a + Math.max(0, creditoBase - pagado);
    }, 0);
    const completadas = compras.filter((c) => {
      const creditoBase = c.pagos?.length > 0
        ? Math.max(0, c.total - c.pagos.reduce((s,p)=>s+p.monto,0))
        : c.formaPago === "Crédito" ? c.total : 0;
      const pagado = (c.pagosProv||[]).reduce((s,p)=>s+p.monto,0);
      return Math.max(0, creditoBase - pagado) === 0;
    }).length;
    return { totalComprado, numProveedores: proveedores.length, pendientePagar, completadas, proveedores };
  }, [compras]);

  // ── Filtrado historial ────────────────────────────────────────────────────
  const histFiltrado = useMemo(() => {
    let lista = compras;
    const q = searchProv.trim().toLowerCase();
    if (q) lista = lista.filter((c) => c.proveedor.toLowerCase().includes(q) || (c.descripcion||"").toLowerCase().includes(q));
    if (filtProv) lista = lista.filter((c) => c.proveedor === filtProv);
    if (histTab === "pendiente") {
      lista = lista.filter((c) => {
        const creditoBase = c.pagos?.length > 0
          ? Math.max(0, c.total - c.pagos.reduce((s,p)=>s+p.monto,0))
          : c.formaPago === "Crédito" ? c.total : 0;
        const pagado = (c.pagosProv||[]).reduce((s,p)=>s+p.monto,0);
        return Math.max(0, creditoBase - pagado) > 0;
      });
    } else if (histTab === "pagadas") {
      lista = lista.filter((c) => {
        const creditoBase = c.pagos?.length > 0
          ? Math.max(0, c.total - c.pagos.reduce((s,p)=>s+p.monto,0))
          : c.formaPago === "Crédito" ? c.total : 0;
        const pagado = (c.pagosProv||[]).reduce((s,p)=>s+p.monto,0);
        return Math.max(0, creditoBase - pagado) === 0;
      });
    }
    return lista;
  }, [compras, histTab, searchProv, filtProv]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {confirmModal}
      <SectionHeader
        title={editingId ? "Editando compra" : "Nueva compra"}
        subtitle="Registra órdenes de compra con múltiples productos y forma de pago"
        actions={<ExportBtn onClick={() => exportComprasCSV(compras, cuentas)} label="Exportar CSV" />}
      />

      {/* Stats summary */}
      {compras.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
          <StatBox label="Total comprado" value={money(stats.totalComprado)} color="#0f172a" />
          <StatBox label="Proveedores" value={stats.numProveedores} color="#6366f1" />
          <StatBox label="Por pagar" value={money(stats.pendientePagar)} color={stats.pendientePagar > 0 ? "#dc2626" : "#10b981"} />
          <StatBox label="Completadas" value={`${stats.completadas}/${compras.length}`} color="#10b981" />
        </div>
      )}

      <div className="pg-2col">
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
                  <input style={inputStyle} list="proveedores-list" placeholder="Ej: Fábrica Acerías, Comerinvrc..." value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
                  <datalist id="proveedores-list">
                    {stats.proveedores.map((p) => <option key={p} value={p} />)}
                  </datalist>
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
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <button style={{ ...toggleBtn, ...(linea.esLibre ? {} : toggleBtnActive) }}
                  onClick={() => setLinea({ ...linea, esLibre: false })}>Catálogo</button>
                <button style={{ ...toggleBtn, ...(linea.esLibre ? toggleBtnActive : {}) }}
                  onClick={() => setLinea({ ...linea, esLibre: true })}>Libre / Materia prima</button>
              </div>

              {linea.esLibre ? (
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
                  <Field label="Costo total del lote" hint="Precio total pagado">
                    <input type="number" style={inputStyle} placeholder="0" value={linea.costoUnitario}
                      onChange={(e) => setLinea({ ...linea, costoUnitario: e.target.value })} />
                  </Field>
                </FormGrid>
              ) : (
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

            {items.length > 0 && (
              <TotalBox
                rows={[
                  ["Subtotal productos", money(resumenVivo.subtotal)],
                  ...(resumenVivo.flete > 0 ? [["Flete", money(resumenVivo.flete)]] : []),
                ]}
                finalRow={["Total compra", money(resumenVivo.total)]}
              />
            )}

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
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Barra de búsqueda + filtro proveedor */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <input
              style={{ ...inputStyle, flex:1, minWidth:180 }}
              placeholder="Buscar proveedor o nota..."
              value={searchProv}
              onChange={(e) => setSearchProv(e.target.value)}
            />
            <select style={{ ...selectStyle, minWidth:160 }} value={filtProv}
              onChange={(e) => setFiltProv(e.target.value)}>
              <option value="">Todos los proveedores</option>
              {stats.proveedores.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Tabs de estado */}
          <div style={{ display:"flex", gap:0, borderBottom:"2px solid #e2e8f0" }}>
            {[
              ["todas",    "Todas",      compras.length],
              ["pendiente","Por pagar",  compras.length - stats.completadas],
              ["pagadas",  "Completadas",stats.completadas],
            ].map(([id, label, count]) => (
              <button key={id} onClick={() => setHistTab(id)}
                style={{ border:"none", background:"transparent", padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer",
                  color: histTab === id ? "#f97316" : "#64748b",
                  borderBottom: histTab === id ? "2px solid #f97316" : "2px solid transparent",
                  marginBottom:-2, borderRadius:"6px 6px 0 0" }}>
                {label}
                <span style={{ marginLeft:6, fontSize:11, background: histTab===id?"#f97316":"#e2e8f0", color: histTab===id?"white":"#64748b", borderRadius:10, padding:"2px 7px", fontWeight:800 }}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <Panel title={`${histFiltrado.length} compras`} noPad>
            {histFiltrado.length === 0 ? (
              <div style={{ padding:20 }}><EmptyState icon="📋" text="No hay compras con ese filtro." /></div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column" }}>
                {histFiltrado.map((item, idx) => {
                  const creditoBase = item.pagos?.length > 0
                    ? Math.max(0, item.total - item.pagos.reduce((a,p)=>a+p.monto,0))
                    : item.formaPago === "Crédito" ? item.total : 0;
                  const pagadoProv  = (item.pagosProv||[]).reduce((a,p)=>a+p.monto,0);
                  const pendiente   = Math.max(0, creditoBase - pagadoProv);
                  const pagoPct     = creditoBase > 0 ? Math.min(100, (pagadoProv / creditoBase) * 100) : 100;
                  const estado      = pendiente === 0
                    ? { label:"Pagada", bg:"#d1fae5", color:"#065f46" }
                    : pagadoProv > 0
                      ? { label:"Parcial", bg:"#fef3c7", color:"#92400e" }
                      : creditoBase > 0
                        ? { label:"Pendiente", bg:"#fee2e2", color:"#991b1b" }
                        : { label:"Pagada", bg:"#d1fae5", color:"#065f46" };

                  return (
                    <div key={item.id} style={{ ...compraCard, borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                      {/* Indicador de estado izquierdo */}
                      <div style={{ width:4, background: pendiente > 0 ? "#ef4444" : "#10b981", borderRadius:"4px 0 0 4px", flexShrink:0 }} />

                      <div style={{ flex:1, padding:"14px 16px" }}>
                        {/* Header */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                          <div>
                            {/* Proveedor con inicial */}
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:34, height:34, borderRadius:10, background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:"white", flexShrink:0 }}>
                                {item.proveedor.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{item.proveedor}</div>
                                <div style={{ fontSize:12, color:"#94a3b8" }}>{item.fecha}</div>
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontWeight:900, fontSize:18, color:"#0f172a" }}>{money(item.total)}</div>
                            {item.flete > 0 && <div style={{ fontSize:11, color:"#94a3b8" }}>+{money(item.flete)} flete</div>}
                          </div>
                        </div>

                        {/* Badges */}
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10, alignItems:"center" }}>
                          <span style={{ fontSize:11, fontWeight:700, background:estado.bg, color:estado.color, borderRadius:6, padding:"3px 9px" }}>
                            {estado.label}
                          </span>
                          <PagoBadge forma={item.formaPago || "Contado"} />
                          {(item.pagos||[]).map((p,i) => (
                            <span key={i} style={{ fontSize:11, color:"#064e3b", background:"#d1fae5", borderRadius:6, padding:"2px 8px" }}>
                              {cuentas.find(c=>c.id===p.cuentaId)?.nombre}: {money(p.monto)}
                            </span>
                          ))}
                          {!item.pagos?.length && item.cuentaId && (
                            <span style={{ fontSize:11, color:"#64748b" }}>→ {cuentas.find((c)=>c.id===item.cuentaId)?.nombre}</span>
                          )}
                        </div>

                        {/* Nota */}
                        {item.descripcion && (
                          <div style={{ fontSize:12, color:"#64748b", marginTop:6, fontStyle:"italic" }}>"{item.descripcion}"</div>
                        )}

                        {/* Ítems */}
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:10 }}>
                          {(item.items||[]).map((x) => (
                            <SkuPill key={x.id} label={`${x.sku} ×${x.cantidad}${x.esLote?" (lote)":""}`} />
                          ))}
                        </div>

                        {/* Barra progreso pago proveedor */}
                        {creditoBase > 0 && (
                          <div style={{ marginTop:12 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                              <span style={{ color:"#64748b", fontWeight:600 }}>Pago a proveedor</span>
                              <span style={{ fontWeight:700, color: pendiente > 0 ? "#dc2626" : "#059669" }}>
                                {pendiente > 0 ? `Pendiente: ${money(pendiente)}` : "✓ Cancelado"}
                              </span>
                            </div>
                            <div style={{ height:6, background:"#f1f5f9", borderRadius:99 }}>
                              <div style={{ height:"100%", width:`${pagoPct}%`, background: pendiente > 0 ? "#f59e0b" : "#10b981", borderRadius:99, transition:"width .4s" }} />
                            </div>
                            {/* Abonos proveedor */}
                            {(item.pagosProv||[]).length > 0 && (
                              <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:3 }}>
                                {item.pagosProv.map((p) => (
                                  <div key={p.id} style={{ fontSize:11, color:"#64748b", display:"flex", gap:6 }}>
                                    <span>✓</span>
                                    <span>{p.fecha}: {money(p.monto)}{p.cuentaId ? ` → ${cuentas.find(c=>c.id===p.cuentaId)?.nombre}` : ""}{p.nota ? ` · ${p.nota}` : ""}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Acciones */}
                        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
                          <EditBtn onClick={() => onEdit(item)} />
                          <DeleteBtn onClick={() => handleDelete(item.id)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatBox({ label, value, color }) {
  return (
    <div style={{ background:"white", borderRadius:12, padding:"14px 16px", border:"1px solid #e2e8f0" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color: color || "#0f172a" }}>{value}</div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const itemsList = { display:"flex", flexDirection:"column", gap:8, margin:"4px 0" };
const itemRow   = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", gap:12 };
const itemLeft  = { display:"flex", flexDirection:"column", gap:2, flex:1 };
const itemRight = { display:"flex", alignItems:"center", gap:10, flexShrink:0 };
const toggleBtn = { border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 14px", background:"white", color:"#475569", fontWeight:600, cursor:"pointer", fontSize:13 };
const toggleBtnActive = { background:"#0f172a", borderColor:"#0f172a", color:"white" };
const compraCard = { display:"flex", background:"white", transition:"background .15s" };
