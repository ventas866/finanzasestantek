import { useMemo, useState } from "react";
import { money } from "../utils.js";
import {
  Panel, SectionHeader, DataTable, CategoriaBadge, OrigenBadge, StockBadge, EmptyState,
} from "../ui.jsx";

export default function Inventario({ catalogo }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroStock, setFiltroStock] = useState("Todos");

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

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="Inventario"
        subtitle={`${filtrado.length} productos · ${conStock} con stock · valorizado ${money(valorTotal)}`}
      />

      <Panel>
        {/* Controles */}
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
              item.costo > 0 ? <span style={{ fontWeight:700 }}>{money(item.costo)}</span>
                : <span style={{ color:"#94a3b8" }}>Sin costo</span>,
              item.stock > 0
                ? <span style={{ fontWeight:700 }}>{money(item.stock * item.costo)}</span>
                : <span style={{ color:"#94a3b8" }}>—</span>,
            ])}
          />
        )}
      </Panel>
    </div>
  );
}

const searchInput = {
  border:"1px solid #e2e8f0",
  borderRadius:10,
  padding:"10px 14px",
  fontSize:14,
  outline:"none",
  background:"#f8fafc",
  width:"100%",
  boxSizing:"border-box",
};

const pill = {
  border:"1px solid #e2e8f0",
  background:"white",
  color:"#475569",
  borderRadius:20,
  padding:"5px 12px",
  fontSize:12,
  fontWeight:600,
  cursor:"pointer",
};

const pillActive = {
  background:"#0f172a",
  border:"1px solid #0f172a",
  color:"white",
};

const pillStock = {
  background:"#f97316",
  border:"1px solid #f97316",
  color:"white",
};
