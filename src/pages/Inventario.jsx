import { useMemo, useState } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, DataTable, CategoriaBadge, OrigenBadge, StockBadge, EmptyState,
  Field, inputStyle, selectStyle, FormGrid, DarkBtn, DeleteBtn,
} from "../ui.jsx";

export default function Inventario({
  catalogo,
  compras = [],
  ajustes = [],
  conversiones = [],
  productosExtra = [],
  onAjuste,
  onConversion,
  onSaveProducto,
  onDeleteProducto,
  onUpdatePrecio,
}) {
  const [tab, setTab] = useState("catalogo");

  // ── Tab 1: Catálogo ──────────────────────────────────────────────────────
  const [busqueda,        setBusqueda]        = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroStock,     setFiltroStock]     = useState("Todos");
  const [editingPrecio,   setEditingPrecio]   = useState(null); // { sku, valor }

  const categorias = useMemo(
    () => ["Todos", ...new Set(catalogo.map((i) => i.categoria))],
    [catalogo]
  );

  const filtrado = useMemo(() => {
    let items = catalogo;
    if (filtroCategoria !== "Todos") items = items.filter((i) => i.categoria === filtroCategoria);
    if (filtroStock === "Con stock")   items = items.filter((i) => i.stock > 0);
    if (filtroStock === "Sin stock")   items = items.filter((i) => i.stock === 0);
    if (filtroStock === "Crítico")     items = items.filter((i) => i.stock > 0 && i.stock <= 2);
    if (filtroStock === "Sin precio")  items = items.filter((i) => !i.precioVenta || i.precioVenta === 0);
    const q = busqueda.trim().toLowerCase();
    if (q) items = items.filter((i) =>
      i.sku.toLowerCase().includes(q) ||
      i.nombre.toLowerCase().includes(q) ||
      i.categoria.toLowerCase().includes(q)
    );
    return items;
  }, [catalogo, busqueda, filtroCategoria, filtroStock]);

  const valorCosto = filtrado.reduce((a, i) => a + i.stock * i.costo, 0);
  const valorVenta = filtrado.reduce((a, i) => a + i.stock * (i.precioVenta || 0), 0);
  const conStock   = filtrado.filter((i) => i.stock > 0).length;

  function guardarPrecio() {
    if (!editingPrecio) return;
    onUpdatePrecio(editingPrecio.sku, Number(editingPrecio.valor || 0));
    setEditingPrecio(null);
  }

  // ── Tab 2: Ajustes ──────────────────────────────────────────────────────
  const skuBase  = catalogo.filter((i) => i.tipo !== "Servicio")[0]?.sku || "";
  const [ajForm, setAjForm] = useState({ fecha: today(), sku: skuBase, cantidad: "", motivo: "Conteo físico" });

  function guardarAjuste() {
    const cant = Number(ajForm.cantidad);
    if (!ajForm.sku || !cant) return;
    onAjuste({ fecha: ajForm.fecha, sku: ajForm.sku, cantidad: cant, motivo: ajForm.motivo });
    setAjForm({ fecha: today(), sku: skuBase, cantidad: "", motivo: "Conteo físico" });
  }

  const itemActual    = catalogo.find((i) => i.sku === ajForm.sku);
  const stockDespues  = itemActual ? Math.max(0, itemActual.stock + Number(ajForm.cantidad || 0)) : 0;

  // ── Tab 3: Conversiones ──────────────────────────────────────────────────
  const lotes = compras.flatMap((c) =>
    (c.items || [])
      .filter((i) => i.esLote)
      .map((i) => ({
        ...i, compraId: c.id, proveedor: c.proveedor, compraFecha: c.fecha,
        costoTotal: Number(i.subtotal || (Number(i.cantidad||1) * Number(i.costoUnitario||0))),
      }))
  );

  const [convForm,  setConvForm]  = useState({ fecha: today(), loteItemId: "", descripcion: "", piezas: [] });
  const [convLinea, setConvLinea] = useState({ sku: skuBase, cantidad: "", costoUnitario: "" });

  const loteSelec     = lotes.find((l) => l.id === convForm.loteItemId);
  const costoLote     = loteSelec?.costoTotal || 0;
  const costoAsignado = convForm.piezas.reduce((a, p) => a + p.cantidad * p.costoUnitario, 0);

  function agregarPiezaConv() {
    const sku   = convLinea.sku;
    const cant  = Number(convLinea.cantidad || 0);
    const costo = Number(convLinea.costoUnitario || 0);
    if (!sku || cant <= 0) return;
    const info = catalogo.find((i) => i.sku === sku);
    setConvForm((prev) => ({
      ...prev,
      piezas: [...prev.piezas, { id: uid(), sku, producto: info?.nombre || sku, cantidad: cant, costoUnitario: costo }],
    }));
    setConvLinea({ sku: skuBase, cantidad: "", costoUnitario: "" });
  }

  function guardarConversion() {
    if (!convForm.loteItemId || convForm.piezas.length === 0) return;
    onConversion({ fecha: convForm.fecha, loteItemId: convForm.loteItemId, descripcion: convForm.descripcion, piezas: convForm.piezas });
    setConvForm({ fecha: today(), loteItemId: "", descripcion: "", piezas: [] });
  }

  // ── Tab 4: Productos extra ───────────────────────────────────────────────
  const CATEGORIAS_EXTRA = ["Viga","Marco","Galvanizado","Madera económica","Madera premium","Pesada","Servicio","Otro"];
  const TIPOS_EXTRA      = ["Inventario propio","Reventa","Bajo pedido","Servicio"];

  const [prodForm, setProdForm] = useState({
    sku:"", nombre:"", categoria:"Otro", tipo:"Inventario propio", unidad:"und", costoBase:"", precioVenta:""
  });

  function guardarProducto() {
    if (!prodForm.sku.trim() || !prodForm.nombre.trim()) return;
    if (catalogo.some((i) => i.sku === prodForm.sku.trim())) {
      alert("Ya existe un producto con ese SKU.");
      return;
    }
    onSaveProducto({
      id: uid(),
      sku: prodForm.sku.trim().toUpperCase(),
      nombre: prodForm.nombre.trim(),
      categoria: prodForm.categoria,
      tipo: prodForm.tipo,
      unidad: prodForm.unidad,
      costoBase: Number(prodForm.costoBase || 0),
      precioVenta: Number(prodForm.precioVenta || 0),
    });
    setProdForm({ sku:"", nombre:"", categoria:"Otro", tipo:"Inventario propio", unidad:"und", costoBase:"", precioVenta:"" });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="Inventario"
        subtitle={`${catalogo.filter((i)=>i.stock>0).length} productos con stock · costo ${money(catalogo.reduce((a,i)=>a+i.stock*i.costo,0))} · venta est. ${money(catalogo.reduce((a,i)=>a+i.stock*(i.precioVenta||0),0))}`}
      />

      {/* KPIs de inventario */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
        <InvKpi label="Valor @ costo" value={money(catalogo.reduce((a,i)=>a+i.stock*i.costo,0))} sub="Lo que costó" color="#ef4444" />
        <InvKpi label="Valor @ venta" value={money(catalogo.reduce((a,i)=>a+i.stock*(i.precioVenta||0),0))} sub="Potencial de venta" color="#10b981" />
        <InvKpi label="Margen potencial"
          value={(() => {
            const c = catalogo.reduce((a,i)=>a+i.stock*i.costo,0);
            const v = catalogo.reduce((a,i)=>a+i.stock*(i.precioVenta||0),0);
            return v > 0 ? `${(((v-c)/v)*100).toFixed(1)}%` : "—";
          })()}
          sub="Del inventario con stock" color="#6366f1" />
        <InvKpi label="Sin precio" value={`${catalogo.filter((i)=>i.stock>0&&(!i.precioVenta||i.precioVenta===0)).length} SKUs`} sub="Definir precio de venta" color="#f59e0b" />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:"2px solid #e2e8f0", flexWrap:"wrap" }}>
        {[
          ["catalogo",    "📦 Catálogo"],
          ["ajustes",     "✏️ Ajustes de stock"],
          ["conversiones","🪵 Conversión de lotes"],
          ["productos",   "➕ Agregar producto"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ border:"none", background:"transparent", padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer",
              color: tab === id ? "#f97316" : "#64748b",
              borderBottom: tab === id ? "2px solid #f97316" : "2px solid transparent",
              marginBottom:-2, borderRadius:"6px 6px 0 0" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Catálogo ── */}
      {tab === "catalogo" && (
        <Panel>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
            <input style={searchInput} placeholder="Buscar por SKU, nombre o categoría..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {categorias.map((cat) => (
                  <button key={cat} style={{ ...pill, ...(filtroCategoria === cat ? pillActive : {}) }}
                    onClick={() => setFiltroCategoria(cat)}>{cat}
                  </button>
                ))}
              </div>
              <div style={{ width:1, height:24, background:"#e2e8f0", margin:"0 4px" }} />
              {["Todos","Con stock","Sin stock","Crítico","Sin precio"].map((f) => (
                <button key={f} style={{ ...pill, ...(filtroStock === f ? pillStock : {}) }}
                  onClick={() => setFiltroStock(f)}>{f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>
            {filtrado.length} productos · {conStock} con stock · @ costo: <strong>{money(valorCosto)}</strong>
            {valorVenta > 0 && <> · @ venta: <strong style={{ color:"#059669" }}>{money(valorVenta)}</strong></>}
          </div>

          {/* Editor de precio inline */}
          {editingPrecio && (
            <div style={{ marginBottom:14, padding:"12px 16px", background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:10, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontWeight:700, fontSize:13, color:"#92400e" }}>
                Precio de venta para <code style={{ background:"#fef3c7", padding:"2px 6px", borderRadius:4 }}>{editingPrecio.sku}</code>
              </span>
              <input
                type="number"
                style={{ ...inputStyle, width:160, padding:"7px 12px" }}
                value={editingPrecio.valor}
                onChange={(e) => setEditingPrecio({ ...editingPrecio, valor: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") guardarPrecio(); if (e.key === "Escape") setEditingPrecio(null); }}
                autoFocus
                placeholder="0"
              />
              <button style={{ border:"none", background:"#059669", color:"white", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}
                onClick={guardarPrecio}>Guardar</button>
              <button style={{ border:"1px solid #e2e8f0", background:"white", color:"#475569", borderRadius:8, padding:"8px 12px", fontWeight:700, cursor:"pointer", fontSize:13 }}
                onClick={() => setEditingPrecio(null)}>Cancelar</button>
            </div>
          )}

          {filtrado.length === 0 ? (
            <EmptyState text="No hay productos con ese filtro." />
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    {["SKU","Producto","Categoría","Tipo","Stock","Costo prom.","Precio venta","Margen","Acciones"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrado.map((item, idx) => {
                    const isPrecioEdit = editingPrecio?.sku === item.sku;
                    return (
                      <tr key={item.sku} style={{ background: idx % 2 === 0 ? "white" : "#fafafa", ...(isPrecioEdit ? { background:"#fff7ed" } : {}) }}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily:"monospace", color:"#64748b" }}>{item.sku}</span>
                          {item.isCustom && <span style={{ marginLeft:4, fontSize:10, background:"#e0e7ff", color:"#4338ca", borderRadius:4, padding:"1px 5px", fontWeight:700 }}>CUSTOM</span>}
                        </td>
                        <td style={tdStyle}><span style={{ fontWeight:600 }}>{item.nombre}</span></td>
                        <td style={tdStyle}><CategoriaBadge cat={item.categoria} /></td>
                        <td style={tdStyle}><OrigenBadge origen={item.tipo} /></td>
                        <td style={tdStyle}><StockBadge stock={item.stock} tipo={item.tipo} /></td>
                        <td style={tdStyle}>
                          {item.costo > 0
                            ? <span style={{ fontWeight:700 }}>{money(item.costo)}</span>
                            : <span style={{ color:"#94a3b8" }}>—</span>}
                        </td>
                        <td style={tdStyle}>
                          {item.precioVenta > 0
                            ? (
                              <button
                                onClick={() => setEditingPrecio({ sku: item.sku, valor: item.precioVenta })}
                                style={{ border:"none", background:"transparent", cursor:"pointer", fontWeight:700, color:"#059669", fontSize:13, padding:"2px 4px", borderRadius:4, textDecoration:"underline dotted" }}
                                title="Click para editar precio">
                                {money(item.precioVenta)} ✎
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingPrecio({ sku: item.sku, valor: "" })}
                                style={{ border:"1px dashed #cbd5e1", background:"transparent", cursor:"pointer", fontWeight:600, color:"#94a3b8", fontSize:12, padding:"3px 8px", borderRadius:6 }}>
                                + Precio
                              </button>
                            )}
                        </td>
                        <td style={tdStyle}>
                          {item.margenPct !== null && item.margenPct !== undefined
                            ? (
                              <span style={{ fontWeight:700, color: item.margenPct >= 30 ? "#059669" : item.margenPct >= 15 ? "#f59e0b" : "#dc2626" }}>
                                {item.margenPct}%
                              </span>
                            )
                            : <span style={{ color:"#94a3b8" }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, textAlign:"right" }}>
                          {item.isCustom && (
                            <DeleteBtn onClick={() => {
                              if (window.confirm(`¿Eliminar el producto ${item.sku}?`)) onDeleteProducto(item.id);
                            }} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ── Tab 2: Ajustes ── */}
      {tab === "ajustes" && (
        <div className="pg-320">
          <Panel title="Nuevo ajuste de stock">
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px" }}>
              Corrección manual de stock. Usa <strong>positivo</strong> para sumar y <strong>negativo</strong> para restar.
            </p>
            <FormGrid>
              <Field label="Fecha">
                <input type="date" style={inputStyle} value={ajForm.fecha}
                  onChange={(e) => setAjForm({ ...ajForm, fecha: e.target.value })} />
              </Field>
              <Field label="Producto">
                <select style={selectStyle} value={ajForm.sku}
                  onChange={(e) => setAjForm({ ...ajForm, sku: e.target.value })}>
                  {catalogo.filter((i) => i.tipo !== "Servicio").map((i) => (
                    <option key={i.sku} value={i.sku}>{i.sku} · {i.nombre}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad (+/-)">
                <input type="number" style={inputStyle} placeholder="Ej: -2 o +5" value={ajForm.cantidad}
                  onChange={(e) => setAjForm({ ...ajForm, cantidad: e.target.value })} />
              </Field>
              <Field label="Motivo" wide>
                <input style={inputStyle} list="motivos-list" value={ajForm.motivo}
                  onChange={(e) => setAjForm({ ...ajForm, motivo: e.target.value })} />
                <datalist id="motivos-list">
                  {["Conteo físico","Daño o pérdida","Encontrado en bodega","Entrada sin compra","Retiro interno","Otro"].map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
            </FormGrid>

            {itemActual && ajForm.cantidad && (
              <div style={{ marginTop:12, fontSize:13, background:"#f0f9ff", borderRadius:8, padding:"10px 14px", color:"#0369a1", display:"flex", gap:16 }}>
                <span>Stock actual: <strong>{itemActual.stock} und</strong></span>
                <span>→</span>
                <span style={{ color: stockDespues >= itemActual.stock ? "#059669" : "#dc2626" }}>
                  Después: <strong>{stockDespues} und</strong>
                </span>
              </div>
            )}

            <div style={{ marginTop:16 }}>
              <DarkBtn onClick={guardarAjuste}>Guardar ajuste</DarkBtn>
            </div>
          </Panel>

          <Panel title={`Historial de ajustes (${ajustes.length})`}>
            {ajustes.length === 0 ? (
              <EmptyState icon="✏️" text="No hay ajustes. Los ajustes permiten corregir diferencias entre el sistema y la bodega real." />
            ) : (
              <DataTable
                headers={["Fecha","SKU","Δ","Motivo"]}
                rows={[...ajustes].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((aj) => [
                  aj.fecha,
                  <span style={{ fontFamily:"monospace", fontSize:13 }}>{aj.sku}</span>,
                  <span style={{ fontWeight:700, color: Number(aj.cantidad)>=0?"#059669":"#dc2626" }}>
                    {Number(aj.cantidad)>0?"+":""}{aj.cantidad}
                  </span>,
                  aj.motivo || "—",
                ])}
              />
            )}
          </Panel>
        </div>
      )}

      {/* ── Tab 3: Conversiones ── */}
      {tab === "conversiones" && (
        <div className="pg-320">
          <Panel title="Nueva conversión de lote">
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px" }}>
              Registra los productos terminados que obtuviste al cortar/procesar un lote de madera.
            </p>

            {lotes.length === 0 ? (
              <EmptyState icon="🪵" text="No hay lotes. Ve a Compras y registra una compra con tipo 'Libre / Materia prima'." />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <FormGrid>
                  <Field label="Fecha">
                    <input type="date" style={inputStyle} value={convForm.fecha}
                      onChange={(e) => setConvForm({ ...convForm, fecha: e.target.value })} />
                  </Field>
                  <Field label="Lote de madera (origen)">
                    <select style={selectStyle} value={convForm.loteItemId}
                      onChange={(e) => setConvForm({ ...convForm, loteItemId: e.target.value, piezas: [] })}>
                      <option value="">— Selecciona un lote —</option>
                      {lotes.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.compraFecha} · {l.proveedor} · {l.nombreLibre || l.skuLibre || l.sku}
                          {l.costoTotal > 0 ? ` · ${money(l.costoTotal)}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Descripción" wide>
                    <input style={inputStyle} placeholder="Ej: Corte tablas 240×40" value={convForm.descripcion}
                      onChange={(e) => setConvForm({ ...convForm, descripcion: e.target.value })} />
                  </Field>
                </FormGrid>

                {loteSelec && (
                  <div style={{ fontSize:13, background:"#fef9c3", borderRadius:8, padding:"10px 14px", color:"#713f12" }}>
                    <strong>{loteSelec.nombreLibre || loteSelec.sku}</strong> · Costo total: <strong>{money(costoLote)}</strong>
                    {costoAsignado > 0 && <> · Asignado: <strong>{money(costoAsignado)}</strong> · Restante: <strong style={{ color: costoAsignado>costoLote?"#dc2626":"#059669" }}>{money(costoLote-costoAsignado)}</strong></>}
                  </div>
                )}

                <div style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:14 }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>➕ Agregar piezas de salida</div>
                  <FormGrid>
                    <Field label="Producto (catálogo)" wide>
                      <select style={selectStyle} value={convLinea.sku}
                        onChange={(e) => setConvLinea({ ...convLinea, sku: e.target.value })}>
                        <option value="">— Selecciona —</option>
                        {catalogo.filter((i) => i.tipo !== "Servicio" && i.tipo !== "Reventa").map((i) => (
                          <option key={i.sku} value={i.sku}>{i.sku} · {i.nombre}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cantidad">
                      <input type="number" style={inputStyle} value={convLinea.cantidad}
                        onChange={(e) => setConvLinea({ ...convLinea, cantidad: e.target.value })} />
                    </Field>
                    <Field label="Costo unitario">
                      <input type="number" style={inputStyle} value={convLinea.costoUnitario}
                        onChange={(e) => setConvLinea({ ...convLinea, costoUnitario: e.target.value })} />
                    </Field>
                  </FormGrid>
                  <button style={{ ...pill, background:"#f97316", borderColor:"#f97316", color:"white", marginTop:10 }}
                    onClick={agregarPiezaConv}>+ Agregar pieza</button>
                </div>

                {convForm.piezas.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {convForm.piezas.map((p) => (
                      <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", borderRadius:8, padding:"8px 12px", border:"1px solid #e2e8f0" }}>
                        <span style={{ fontSize:13 }}>
                          <span style={{ fontFamily:"monospace", color:"#64748b" }}>{p.sku}</span>
                          <span style={{ marginLeft:8, fontWeight:600 }}>{p.producto}</span>
                          <span style={{ marginLeft:8, color:"#64748b" }}>×{p.cantidad} · {money(p.costoUnitario)}/u</span>
                        </span>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontWeight:700 }}>{money(p.cantidad*p.costoUnitario)}</span>
                          <button style={{ border:"none", background:"#fee2e2", color:"#dc2626", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontWeight:700, fontSize:12 }}
                            onClick={() => setConvForm((prev) => ({ ...prev, piezas: prev.piezas.filter((x)=>x.id!==p.id) }))}>✕</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ textAlign:"right", fontWeight:800, color:"#0f172a" }}>Total: {money(costoAsignado)}</div>
                  </div>
                )}

                <DarkBtn onClick={guardarConversion} disabled={!convForm.loteItemId || convForm.piezas.length===0}>
                  Registrar conversión
                </DarkBtn>
              </div>
            )}
          </Panel>

          <Panel title={`Conversiones registradas (${conversiones.length})`}>
            {conversiones.length === 0 ? (
              <EmptyState icon="🪵" text="Sin conversiones." />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[...conversiones].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((conv) => {
                  const lote = lotes.find((l) => l.id === conv.loteItemId);
                  const totalPiezas = (conv.piezas||[]).reduce((a,p)=>a+p.cantidad*p.costoUnitario,0);
                  return (
                    <div key={conv.id} style={{ background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <div>
                          <div style={{ fontWeight:700 }}>{conv.descripcion || "Conversión de lote"}</div>
                          <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>
                            {conv.fecha} · Lote: {lote?.nombreLibre || lote?.sku || "—"}
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#059669" }}>{conv.piezas?.length||0} SKUs</div>
                          <div style={{ fontSize:12, color:"#64748b" }}>{money(totalPiezas)}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                        {(conv.piezas||[]).map((p) => (
                          <span key={p.id} style={{ fontSize:12, background:"#dbeafe", color:"#1d4ed8", borderRadius:6, padding:"3px 8px", fontWeight:600 }}>
                            {p.sku} ×{p.cantidad}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── Tab 4: Agregar producto ── */}
      {tab === "productos" && (
        <div className="pg-320">
          <Panel title="Agregar nuevo producto al catálogo">
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px" }}>
              Crea productos personalizados que no están en el catálogo base. Aparecerán en Compras, Ventas e Inventario.
            </p>
            <FormGrid>
              <Field label="SKU / Código" hint="Único, sin espacios">
                <input style={inputStyle} placeholder="Ej: EST-PESADA-L200" value={prodForm.sku}
                  onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Nombre completo" wide>
                <input style={inputStyle} placeholder="Ej: Estantería pesada L200 completa" value={prodForm.nombre}
                  onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })} />
              </Field>
              <Field label="Categoría">
                <select style={selectStyle} value={prodForm.categoria}
                  onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })}>
                  {CATEGORIAS_EXTRA.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Tipo">
                <select style={selectStyle} value={prodForm.tipo}
                  onChange={(e) => setProdForm({ ...prodForm, tipo: e.target.value })}>
                  {TIPOS_EXTRA.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Unidad">
                <select style={selectStyle} value={prodForm.unidad}
                  onChange={(e) => setProdForm({ ...prodForm, unidad: e.target.value })}>
                  {["und","m","m²","kg","lote","serv","par"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Costo base" hint="Costo referencia inicial">
                <input type="number" style={inputStyle} placeholder="0" value={prodForm.costoBase}
                  onChange={(e) => setProdForm({ ...prodForm, costoBase: e.target.value })} />
              </Field>
              <Field label="Precio de venta" hint="Precio al que lo vendes">
                <input type="number" style={inputStyle} placeholder="0" value={prodForm.precioVenta}
                  onChange={(e) => setProdForm({ ...prodForm, precioVenta: e.target.value })} />
              </Field>
            </FormGrid>

            {prodForm.costoBase && prodForm.precioVenta && Number(prodForm.precioVenta) > 0 && (
              <div style={{ marginTop:12, fontSize:13, background:"#f0fdf4", borderRadius:8, padding:"10px 14px", color:"#166534" }}>
                Margen estimado: <strong>
                  {(((Number(prodForm.precioVenta) - Number(prodForm.costoBase)) / Number(prodForm.precioVenta)) * 100).toFixed(1)}%
                </strong>
              </div>
            )}

            <div style={{ marginTop:16 }}>
              <DarkBtn onClick={guardarProducto}
                disabled={!prodForm.sku.trim() || !prodForm.nombre.trim()}>
                Crear producto
              </DarkBtn>
            </div>
          </Panel>

          <Panel title={`Productos personalizados (${productosExtra.length})`}>
            {productosExtra.length === 0 ? (
              <EmptyState icon="➕" text="No hay productos personalizados. Crea uno con el formulario de la izquierda." />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {productosExtra.map((p) => {
                  const enCatalogo = catalogo.find((i) => i.sku === p.sku);
                  return (
                    <div key={p.id} style={{ background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#4338ca", background:"#e0e7ff", borderRadius:4, padding:"2px 6px" }}>{p.sku}</span>
                          <span style={{ fontWeight:700 }}>{p.nombre}</span>
                        </div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:4, display:"flex", gap:12 }}>
                          <span>{p.categoria} · {p.tipo}</span>
                          {p.costoBase > 0 && <span>Costo: {money(p.costoBase)}</span>}
                          {p.precioVenta > 0 && <span style={{ color:"#059669" }}>Venta: {money(p.precioVenta)}</span>}
                          {enCatalogo && <span>Stock: {enCatalogo.stock} {p.unidad}</span>}
                        </div>
                      </div>
                      <DeleteBtn onClick={() => {
                        if (window.confirm(`¿Eliminar el producto ${p.sku}? Esto no elimina los movimientos existentes.`)) {
                          onDeleteProducto(p.id);
                        }
                      }} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InvKpi({ label, value, sub, color }) {
  return (
    <div style={{ background:"white", borderRadius:12, padding:"14px 18px", border:"1px solid #e2e8f0" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:900, color: color || "#0f172a", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const searchInput = {
  border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px",
  fontSize:14, outline:"none", background:"#f8fafc", width:"100%", boxSizing:"border-box",
};
const pill      = { border:"1px solid #e2e8f0", background:"white", color:"#475569", borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" };
const pillActive = { background:"#0f172a", border:"1px solid #0f172a", color:"white" };
const pillStock  = { background:"#f97316", border:"1px solid #f97316", color:"white" };
const thStyle   = { textAlign:"left", padding:"10px 12px", fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", borderBottom:"2px solid #f1f5f9", whiteSpace:"nowrap" };
const tdStyle   = { padding:"10px 12px", borderBottom:"1px solid #f8fafc", verticalAlign:"middle" };
