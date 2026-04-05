import { useMemo, useState } from "react";
import { money, isoMonth, today } from "../utils.js";
import {
  Panel, SectionHeader, FormGrid, Field, inputStyle, selectStyle,
  DarkBtn, DeleteBtn, EditBtn, EmptyState, Alert, CancelBtn, ExportBtn,
  PillFilter, SearchInput, useConfirm, s,
} from "../ui.jsx";
import { GASTO_CATEGORIAS } from "../constants.js";

// ─── Color por categoría de gasto ──────────────────────────────────────────
const CAT_COLORS = {
  "Financiero":    { bg:"#E3F2FD", color:"#1565C0" },
  "Publicidad":    { bg:"#F3E8FF", color:"#6B21A8" },
  "Dominio web":   { bg:"#E0F2FE", color:"#0369A1" },
  "Transporte":    { bg:"#FFF3E0", color:"#E65100" },
  "Herramientas":  { bg:"#E8F5E9", color:"#2E7D32" },
  "Administrativo":{ bg:"#FCE4EC", color:"#AD1457" },
  "Otro":          { bg:"#F5F5F5", color:"#616161" },
};

function CategoriaBadge({ cat }) {
  const c = CAT_COLORS[cat] || { bg:"#F5F5F5", color:"#616161" };
  return (
    <span style={{ background:c.bg, color:c.color, borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>
      {cat}
    </span>
  );
}

function exportCSV(gastos, cuentas) {
  const headers = ["Fecha","Categoría","Descripción","Cuenta","Valor"];
  const rows    = gastos.map((g) => [
    g.fecha,
    g.categoria,
    `"${(g.descripcion||"").replace(/"/g,'""')}"`,
    cuentas.find((c)=>c.id===g.cuentaId)?.nombre || "",
    g.valor,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `gastos_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function prevMonth() {
  const d = new Date(); d.setMonth(d.getMonth()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

export default function Gastos({
  gastos, cuentas,
  form, setForm,
  editingId,
  onSave, onDelete, onEdit, onCancel,
}) {
  const [search,   setSearch]   = useState("");
  const [filtTipo, setFiltTipo] = useState("todos");
  const [filtCat,  setFiltCat]  = useState("");
  const [filtPer,  setFiltPer]  = useState("todos");
  const [page,     setPage]     = useState(1);
  const PER_PAGE = 20;

  const { confirm, modal } = useConfirm();

  async function handleDelete(id) {
    const ok = await confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.");
    if (ok) onDelete(id);
  }

  // ── Totales y categorías ──────────────────────────────────────────────────
  const totalGastos = gastos.reduce((a, g) => a + g.valor, 0);
  const porCategoria = useMemo(() =>
    gastos.reduce((acc, g) => { acc[g.categoria] = (acc[g.categoria]||0)+g.valor; return acc; }, {}),
    [gastos]
  );

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let lista = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));

    // búsqueda
    const q = search.trim().toLowerCase();
    if (q) lista = lista.filter((g) =>
      (g.descripcion||"").toLowerCase().includes(q) ||
      g.categoria.toLowerCase().includes(q)
    );
    // categoría
    if (filtCat) lista = lista.filter((g) => g.categoria === filtCat);
    // período
    if (filtPer === "mes") {
      const m = currentMonth();
      lista = lista.filter((g) => isoMonth(g.fecha) === m);
    } else if (filtPer === "anterior") {
      const m = prevMonth();
      lista = lista.filter((g) => isoMonth(g.fecha) === m);
    } else if (filtPer === "3m") {
      const d = new Date(); d.setMonth(d.getMonth()-3);
      const lim = d.toISOString().slice(0,10);
      lista = lista.filter((g) => g.fecha >= lim);
    }
    return lista;
  }, [gastos, search, filtCat, filtPer]);

  const hasFilters = search || filtCat || filtPer !== "todos";
  const totalPaginas = Math.ceil(filtered.length / PER_PAGE);
  const paginated    = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const canSave = Number(form.valor||0) > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {modal}
      <SectionHeader
        title="Gastos"
        subtitle={`Total registrado: ${money(totalGastos)} · ${gastos.length} registros`}
        actions={
          <ExportBtn onClick={() => exportCSV(gastos, cuentas)} label="Exportar CSV" />
        }
      />

      <div className="pg-380">
        {/* ── Formulario ── */}
        <Panel title={editingId ? "✎ Editar gasto" : "Registrar gasto"}>
          {editingId && <Alert type="info" text="Editando gasto. Modifica los campos y guarda." />}
          {editingId && <div style={{ height:12 }} />}
          <FormGrid>
            <Field label="Fecha">
              <input type="date" style={inputStyle} value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha:e.target.value })} />
            </Field>
            <Field label="Categoría">
              <select style={selectStyle} value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria:e.target.value })}>
                {GASTO_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Valor" hint={form.valor ? money(Number(form.valor)) : ""}>
              <input type="number" style={inputStyle} placeholder="0" value={form.valor}
                onChange={(e) => setForm({ ...form, valor:e.target.value })} />
            </Field>
            <Field label="Cuenta de pago">
              <select style={selectStyle} value={form.cuentaId}
                onChange={(e) => setForm({ ...form, cuentaId:e.target.value })}>
                <option value="">— Sin cuenta —</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Descripción" wide>
              <input style={inputStyle} placeholder="Ej: Flete proveedores, Meta Ads, arriendo..." value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion:e.target.value })} />
            </Field>
          </FormGrid>
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
            <DarkBtn onClick={onSave} disabled={!canSave}>
              {editingId ? "Guardar cambios" : "Registrar gasto"}
            </DarkBtn>
            {editingId && <CancelBtn onClick={onCancel}>Cancelar edición</CancelBtn>}
          </div>
        </Panel>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* ── Resumen por categoría ── */}
          {Object.keys(porCategoria).length > 0 && (
            <Panel title="Por categoría">
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {Object.entries(porCategoria).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => {
                  const maxVal = Math.max(...Object.values(porCategoria));
                  return (
                    <div key={cat}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <CategoriaBadge cat={cat} />
                        <span style={{ fontWeight:700, color:"#C62828", fontSize:13 }}>{money(val)}</span>
                      </div>
                      <div style={{ height:4, background:"#F5F5F5", borderRadius:99 }}>
                        <div style={{ height:"100%", width:`${(val/maxVal)*100}%`, background:"#C62828", opacity:.6, borderRadius:99, transition:"width .4s" }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid #EEEEEE", marginTop:4 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>Total</span>
                  <span style={{ fontWeight:700, color:"#C62828", fontSize:14 }}>{money(totalGastos)}</span>
                </div>
              </div>
            </Panel>
          )}

          {/* ── Filtros ── */}
          <Panel title={`Historial (${filtered.length}${hasFilters?" filtrados":""})`}>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar descripción o categoría..." />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <PillFilter
                  value={filtPer}
                  onChange={(v) => { setFiltPer(v); setPage(1); }}
                  options={[
                    { value:"todos",    label:"Todo" },
                    { value:"mes",      label:"Este mes" },
                    { value:"anterior", label:"Mes ant." },
                    { value:"3m",       label:"3 meses" },
                  ]}
                />
                <select style={{ ...selectStyle, minWidth:160, flex:1 }} value={filtCat}
                  onChange={(e) => { setFiltCat(e.target.value); setPage(1); }}>
                  <option value="">Todas las categorías</option>
                  {GASTO_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {hasFilters && (
                  <button
                    onClick={() => { setSearch(""); setFiltCat(""); setFiltPer("todos"); setPage(1); }}
                    style={{ border:"1px solid #EF9A9A", background:"#FFEBEE", color:"#C62828", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                    ✕ Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* ── Tabla ── */}
            {filtered.length === 0 ? (
              <EmptyState icon="💸" text={hasFilters ? "Sin resultados con ese filtro." : "No hay gastos registrados."} />
            ) : (
              <>
                <div className="table-scroll">
                  <div className="table-inner">
                {/* Cabecera */}
                <div style={tableHead}>
                  <span style={{ flex:"0 0 90px" }}>Fecha</span>
                  <span style={{ flex:1 }}>Descripción</span>
                  <span style={{ flex:"0 0 130px" }}>Categoría</span>
                  <span style={{ flex:"0 0 110px", textAlign:"right" }}>Monto</span>
                  <span style={{ flex:"0 0 80px" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column" }}>
                  {paginated.map((item) => (
                    <div key={item.id} className="tr-hover"
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 4px", borderBottom:"1px solid #F0F0F0",
                               ...(item.id===editingId ? { background:"#FFF8F0", borderLeft:"3px solid #E65100", paddingLeft:8 } : {}) }}>
                      <span style={{ flex:"0 0 90px", fontSize:13, color:"#616161" }}>{item.fecha}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:item.descripcion?600:400, color:item.descripcion?"#1A1A1A":"#9E9E9E", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {item.descripcion || "—"}
                        </div>
                        {item.cuentaId && (
                          <div style={{ fontSize:11, color:"#9E9E9E", marginTop:1 }}>
                            {cuentas.find((c)=>c.id===item.cuentaId)?.nombre}
                          </div>
                        )}
                      </div>
                      <span style={{ flex:"0 0 130px" }}>
                        <CategoriaBadge cat={item.categoria} />
                      </span>
                      <span style={{ flex:"0 0 110px", textAlign:"right", fontWeight:700, fontSize:14, color:"#C62828" }}>
                        −{money(item.valor)}
                      </span>
                      <div className="row-actions" style={{ flex:"0 0 80px", display:"flex", gap:5, justifyContent:"flex-end" }}>
                        <EditBtn onClick={() => onEdit(item)} />
                        <DeleteBtn onClick={() => handleDelete(item.id)} />
                      </div>
                    </div>
                  ))}
                </div>
                  </div>{/* /table-inner */}
                </div>{/* /table-scroll */}

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:14, alignItems:"center" }}>
                    <button style={pgBtn} disabled={page===1} onClick={() => setPage(p=>p-1)}>‹ Ant.</button>
                    <span style={{ fontSize:13, color:"#616161" }}>Pág. {page} de {totalPaginas}</span>
                    <button style={pgBtn} disabled={page===totalPaginas} onClick={() => setPage(p=>p+1)}>Sig. ›</button>
                  </div>
                )}

                {/* Total filtrado */}
                <div style={{ marginTop:12, display:"flex", justifyContent:"flex-end", paddingTop:10, borderTop:"1px solid #EEEEEE" }}>
                  <span style={{ fontSize:13, color:"#616161" }}>
                    {hasFilters ? "Subtotal filtrado: " : "Total: "}
                    <strong style={{ color:"#C62828" }}>{money(filtered.reduce((a,g)=>a+g.valor,0))}</strong>
                  </span>
                </div>
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

const pageGrid  = { display:"grid", gridTemplateColumns:"380px 1fr", gap:20, alignItems:"start" };
const tableHead = { display:"flex", gap:12, padding:"8px 4px", fontSize:11, fontWeight:600, color:"#9E9E9E", textTransform:"uppercase", letterSpacing:".4px", borderBottom:"1px solid #EEEEEE", marginBottom:4 };
const pgBtn     = { border:"1px solid #E0E0E0", background:"white", color:"#616161", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" };
