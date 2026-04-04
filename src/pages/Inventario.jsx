import { useMemo, useState } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, DataTable, CategoriaBadge, OrigenBadge, StockBadge, EmptyState,
  Field, inputStyle, selectStyle, FormGrid, DarkBtn,
} from "../ui.jsx";

export default function Inventario({
  catalogo,
  compras = [],
  ajustes = [],
  conversiones = [],
  onAjuste,
  onConversion,
}) {
  const [tab, setTab] = useState("catalogo");

  // ── Tab 1: Catálogo ──────────────────────────────────────────────────────
  const [busqueda, setBusqueda]         = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroStock, setFiltroStock]   = useState("Todos");

  const categorias = useMemo(
    () => ["Todos", ...new Set(catalogo.map((i) => i.categoria))],
    [catalogo]
  );

  const filtrado = useMemo(() => {
    let items = catalogo;
    if (filtroCategoria !== "Todos") items = items.filter((i) => i.categoria === filtroCategoria);
    if (filtroStock === "Con stock") items = items.filter((i) => i.stock > 0);
    if (filtroStock === "Sin stock") items = items.filter((i) => i.stock === 0);
    if (filtroStock === "Crítico")   items = items.filter((i) => i.stock > 0 && i.stock <= 2);
    const q = busqueda.trim().toLowerCase();
    if (q) items = items.filter((i) =>
      i.sku.toLowerCase().includes(q) ||
      i.nombre.toLowerCase().includes(q) ||
      i.categoria.toLowerCase().includes(q)
    );
    return items;
  }, [catalogo, busqueda, filtroCategoria, filtroStock]);

  const valorTotal = filtrado.reduce((a, i) => a + i.stock * i.costo, 0);
  const conStock   = filtrado.filter((i) => i.stock > 0).length;

  // ── Tab 2: Ajustes ──────────────────────────────────────────────────────
  const skuBase = catalogo.filter((i) => i.tipo !== "Servicio")[0]?.sku || "";
  const [ajForm, setAjForm] = useState({ fecha: today(), sku: skuBase, cantidad: "", motivo: "Conteo físico" });

  function guardarAjuste() {
    const cant = Number(ajForm.cantidad);
    if (!ajForm.sku || !cant) return;
    onAjuste({ fecha: ajForm.fecha, sku: ajForm.sku, cantidad: cant, motivo: ajForm.motivo });
    setAjForm({ fecha: today(), sku: skuBase, cantidad: "", motivo: "Conteo físico" });
  }

  const itemActual = catalogo.find((i) => i.sku === ajForm.sku);
  const stockDespues = itemActual ? Math.max(0, itemActual.stock + Number(ajForm.cantidad || 0)) : 0;

  // ── Tab 3: Conversiones ──────────────────────────────────────────────────
  const lotes = compras.flatMap((c) =>
    (c.items || [])
      .filter((i) => i.esLote)
      .map((i) => ({
        ...i,
        compraId: c.id,
        proveedor: c.proveedor,
        compraFecha: c.fecha,
        costoTotal: Number(i.subtotal || (Number(i.cantidad || 1) * Number(i.costoUnitario || 0))),
      }))
  );

  const [convForm, setConvForm]   = useState({ fecha: today(), loteItemId: "", descripcion: "", piezas: [] });
  const [convLinea, setConvLinea] = useState({ sku: skuBase, cantidad: "", costoUnitario: "" });

  const loteSelec    = lotes.find((l) => l.id === convForm.loteItemId);
  const costoLote    = loteSelec?.costoTotal || 0;
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
    onConversion({
      fecha: convForm.fecha,
      loteItemId: convForm.loteItemId,
      descripcion: convForm.descripcion,
      piezas: convForm.piezas,
    });
    setConvForm({ fecha: today(), loteItemId: "", descripcion: "", piezas: [] });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="Inventario"
        subtitle={`${catalogo.filter((i) => i.stock > 0).length} productos con stock · valorizado ${money(catalogo.reduce((a, i) => a + i.stock * i.costo, 0))}`}
      />

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:"2px solid #e2e8f0", flexWrap:"wrap" }}>
        {[
          ["catalogo",    "📦 Catálogo"],
          ["ajustes",     "✏️ Ajustes de stock"],
          ["conversiones","🪵 Conversión de lotes"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              border:"none", background:"transparent",
              padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer",
              color: tab === id ? "#f97316" : "#64748b",
              borderBottom: tab === id ? "2px solid #f97316" : "2px solid transparent",
              marginBottom: -2, borderRadius:"6px 6px 0 0",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Catálogo ── */}
      {tab === "catalogo" && (
        <Panel>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
            <input
              style={searchInput}
              placeholder="Buscar por SKU, nombre o categoría..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {categorias.map((cat) => (
                  <button key={cat} style={{ ...pill, ...(filtroCategoria === cat ? pillActive : {}) }}
                    onClick={() => setFiltroCategoria(cat)}>{cat}
                  </button>
                ))}
              </div>
              <div style={{ width:1, height:24, background:"#e2e8f0", margin:"0 4px" }} />
              {["Todos","Con stock","Sin stock","Crítico"].map((f) => (
                <button key={f} style={{ ...pill, ...(filtroStock === f ? pillStock : {}) }}
                  onClick={() => setFiltroStock(f)}>{f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>
            {filtrado.length} productos · {conStock} con stock · valor: <strong>{money(valorTotal)}</strong>
          </div>

          {filtrado.length === 0 ? (
            <EmptyState text="No hay productos con ese filtro." />
          ) : (
            <DataTable
              headers={["SKU","Producto","Categoría","Tipo","Stock","Costo prom.","Valor stock"]}
              rows={filtrado.map((item) => [
                <span style={{ fontFamily:"monospace", fontSize:13, color:"#64748b" }}>{item.sku}</span>,
                item.nombre,
                <CategoriaBadge cat={item.categoria} />,
                <OrigenBadge origen={item.tipo} />,
                <StockBadge stock={item.stock} tipo={item.tipo} />,
                item.costo > 0
                  ? <span style={{ fontWeight:700 }}>{money(item.costo)}</span>
                  : <span style={{ color:"#94a3b8" }}>Sin costo</span>,
                item.stock > 0
                  ? <span style={{ fontWeight:700 }}>{money(item.stock * item.costo)}</span>
                  : <span style={{ color:"#94a3b8" }}>—</span>,
              ])}
            />
          )}
        </Panel>
      )}

      {/* ── Tab 2: Ajustes de stock ── */}
      {tab === "ajustes" && (
        <div className="pg-320">
          <Panel title="Nuevo ajuste de stock">
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px" }}>
              Corrige el stock por conteo físico, pérdida, daño, hallazgo, etc.
              Usa un valor <strong>positivo</strong> para sumar y <strong>negativo</strong> para restar.
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
                  {["Conteo físico","Daño o pérdida","Encontrado en bodega","Entrada sin compra","Retiro para uso interno","Otro"].map((m) => (
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
              <EmptyState icon="✏️" text="No hay ajustes registrados. Los ajustes permiten corregir diferencias entre el sistema y la bodega real." />
            ) : (
              <DataTable
                headers={["Fecha","SKU","Δ Stock","Motivo"]}
                rows={[...ajustes]
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((aj) => [
                    aj.fecha,
                    <span style={{ fontFamily:"monospace", fontSize:13 }}>{aj.sku}</span>,
                    <span style={{ fontWeight:700, color: Number(aj.cantidad) >= 0 ? "#059669" : "#dc2626" }}>
                      {Number(aj.cantidad) > 0 ? "+" : ""}{aj.cantidad}
                    </span>,
                    aj.motivo || "—",
                  ])}
              />
            )}
          </Panel>
        </div>
      )}

      {/* ── Tab 3: Conversión de lotes ── */}
      {tab === "conversiones" && (
        <div className="pg-320">
          <Panel title="Nueva conversión de lote">
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px" }}>
              Registra los productos terminados que obtuviste al cortar/procesar un lote de madera.
              Estas piezas entran automáticamente al inventario del catálogo.
            </p>

            {lotes.length === 0 ? (
              <EmptyState icon="🪵" text="No hay lotes de madera registrados. Ve a Compras y registra una compra con el tipo 'Libre / Materia prima'." />
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
                    <input style={inputStyle} placeholder="Ej: Corte de tablas 240×40, lote enero" value={convForm.descripcion}
                      onChange={(e) => setConvForm({ ...convForm, descripcion: e.target.value })} />
                  </Field>
                </FormGrid>

                {loteSelec && (
                  <div style={{ fontSize:13, background:"#fef9c3", borderRadius:8, padding:"10px 14px", color:"#713f12" }}>
                    <strong>{loteSelec.nombreLibre || loteSelec.sku}</strong> ·
                    Costo total del lote: <strong>{money(costoLote)}</strong>
                    {costoAsignado > 0 && (
                      <>
                        {" "} · Asignado a piezas: <strong>{money(costoAsignado)}</strong>
                        {" "} · Sin asignar: <strong style={{ color: costoAsignado > costoLote ? "#dc2626" : "#059669" }}>
                          {money(costoLote - costoAsignado)}
                        </strong>
                        {costoAsignado > costoLote && <span style={{ marginLeft:8 }}>⚠️ Supera el costo del lote</span>}
                      </>
                    )}
                  </div>
                )}

                {/* Agregar piezas */}
                <div style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:"14px" }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:"#374151" }}>➕ Agregar piezas de salida</div>
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
                      <input type="number" style={inputStyle} placeholder="0" value={convLinea.cantidad}
                        onChange={(e) => setConvLinea({ ...convLinea, cantidad: e.target.value })} />
                    </Field>
                    <Field label="Costo unitario" hint={loteSelec && convLinea.cantidad > 0 ? `Lote: ${money(costoLote)} ÷ piezas` : ""}>
                      <input type="number" style={inputStyle} placeholder="0" value={convLinea.costoUnitario}
                        onChange={(e) => setConvLinea({ ...convLinea, costoUnitario: e.target.value })} />
                    </Field>
                  </FormGrid>
                  <button
                    style={{ ...pill, background:"#f97316", borderColor:"#f97316", color:"white", marginTop:10 }}
                    onClick={agregarPiezaConv}>
                    + Agregar pieza
                  </button>
                </div>

                {/* Lista piezas */}
                {convForm.piezas.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".08em" }}>Piezas a registrar</div>
                    {convForm.piezas.map((p) => (
                      <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc", borderRadius:8, padding:"8px 12px", border:"1px solid #e2e8f0" }}>
                        <div style={{ fontSize:13 }}>
                          <span style={{ fontFamily:"monospace", color:"#64748b" }}>{p.sku}</span>
                          <span style={{ marginLeft:8, fontWeight:600 }}>{p.producto}</span>
                          <span style={{ marginLeft:8, color:"#64748b" }}>×{p.cantidad} · {money(p.costoUnitario)}/u</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontWeight:700 }}>{money(p.cantidad * p.costoUnitario)}</span>
                          <button
                            style={{ border:"none", background:"#fee2e2", color:"#dc2626", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontWeight:700, fontSize:12 }}
                            onClick={() => setConvForm((prev) => ({ ...prev, piezas: prev.piezas.filter((x) => x.id !== p.id) }))}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ textAlign:"right", fontWeight:800, fontSize:14, color:"#0f172a" }}>
                      Total asignado: {money(costoAsignado)}
                    </div>
                  </div>
                )}

                <DarkBtn
                  onClick={guardarConversion}
                  disabled={!convForm.loteItemId || convForm.piezas.length === 0}>
                  Registrar conversión
                </DarkBtn>
              </div>
            )}
          </Panel>

          <Panel title={`Conversiones registradas (${conversiones.length})`}>
            {conversiones.length === 0 ? (
              <EmptyState icon="🪵" text="No hay conversiones registradas." />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[...conversiones]
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((conv) => {
                    const lote = lotes.find((l) => l.id === conv.loteItemId);
                    const totalPiezas = (conv.piezas || []).reduce((a, p) => a + p.cantidad * p.costoUnitario, 0);
                    return (
                      <div key={conv.id} style={{ background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <div style={{ fontWeight:700 }}>{conv.descripcion || "Conversión de lote"}</div>
                            <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>
                              {conv.fecha} · Lote: {lote?.nombreLibre || lote?.sku || "—"}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#059669" }}>{conv.piezas?.length || 0} SKU</div>
                            <div style={{ fontSize:12, color:"#64748b" }}>{money(totalPiezas)}</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                          {(conv.piezas || []).map((p) => (
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
    </div>
  );
}

// ─── Local styles ─────────────────────────────────────────────────────────────
const searchInput = {
  border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px",
  fontSize:14, outline:"none", background:"#f8fafc", width:"100%", boxSizing:"border-box",
};

const pill = {
  border:"1px solid #e2e8f0", background:"white", color:"#475569",
  borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer",
};

const pillActive = { background:"#0f172a", border:"1px solid #0f172a", color:"white" };
const pillStock  = { background:"#f97316", border:"1px solid #f97316", color:"white" };
