import { useEffect, useMemo, useState } from "react";
import { readLS, saveLS, uid, today } from "./utils.js";
import { buildInventory } from "./inventory.js";
import { CATALOGO_BASE, NAV_ITEMS, DEFAULT_CUENTAS } from "./constants.js";

import Dashboard    from "./pages/Dashboard.jsx";
import Inventario   from "./pages/Inventario.jsx";
import Compras      from "./pages/Compras.jsx";
import Ventas       from "./pages/Ventas.jsx";
import Caja         from "./pages/Caja.jsx";
import Cartera      from "./pages/Cartera.jsx";
import Gastos       from "./pages/Gastos.jsx";
import Inversiones  from "./pages/Inversiones.jsx";
import Rentabilidad from "./pages/Rentabilidad.jsx";

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Datos principales ────────────────────────────────────────────────────
  const [compras,     setCompras]     = useState(() => readLS("compras",     []));
  const [ventas,      setVentas]      = useState(() => readLS("ventas",      []));
  const [gastos,      setGastos]      = useState(() => readLS("gastos",      []));
  const [inversiones, setInversiones] = useState(() => readLS("inversiones", []));
  const [cuentas,     setCuentas]     = useState(() => readLS("cuentas", DEFAULT_CUENTAS));

  // ── Navegación ───────────────────────────────────────────────────────────
  const [pagina, setPagina] = useState("Dashboard");
  const [navOpen, setNavOpen] = useState(false);

  // ── Inventario calculado ─────────────────────────────────────────────────
  const [catalogo, setCatalogo] = useState(() =>
    buildInventory(CATALOGO_BASE, compras, ventas)
  );

  // ── Compras: estado del formulario ───────────────────────────────────────
  const [editingCompraId, setEditingCompraId] = useState(null);
  const [formCompra, setFormCompra] = useState({
    fecha: today(), proveedor:"", flete:"", descripcion:"", formaPago:"Contado", cuentaId:"",
  });
  const [compraLinea, setCompraLinea] = useState({ sku:"VIG-240", cantidad:"", costoUnitario:"" });
  const [compraItems, setCompraItems] = useState([]);

  // ── Ventas: estado del formulario ────────────────────────────────────────
  const [editingVentaId, setEditingVentaId] = useState(null);
  const [formVenta, setFormVenta] = useState({
    fecha: today(), cliente:"", origen:"Inventario propio", iva:"", descripcion:"",
    formaPago:"Contado", cuentaId:"",
  });
  const [ventaLinea, setVentaLinea] = useState({ sku:"VIG-240", cantidad:"", precioUnitario:"", costoUnitario:"" });
  const [ventaItems, setVentaItems] = useState([]);

  // ── Gastos: estado del formulario ────────────────────────────────────────
  const [formGasto, setFormGasto] = useState({
    fecha: today(), categoria:"Financiero", valor:"", descripcion:"", cuentaId:"",
  });

  // ── Inversiones: estado del formulario ───────────────────────────────────
  const [formInversion, setFormInversion] = useState({
    fecha: today(), socio:"Raúl", valor:"", descripcion:"", cuentaId:"",
  });

  // ── Persistencia ─────────────────────────────────────────────────────────
  useEffect(() => saveLS("compras",     compras),     [compras]);
  useEffect(() => saveLS("ventas",      ventas),      [ventas]);
  useEffect(() => saveLS("gastos",      gastos),      [gastos]);
  useEffect(() => saveLS("inversiones", inversiones), [inversiones]);
  useEffect(() => saveLS("cuentas",     cuentas),     [cuentas]);

  useEffect(() => {
    setCatalogo(buildInventory(CATALOGO_BASE, compras, ventas));
  }, [compras, ventas]);

  // ── Handlers de compras ──────────────────────────────────────────────────

  function limpiarCompraForm() {
    setEditingCompraId(null);
    setFormCompra({ fecha: today(), proveedor:"", flete:"", descripcion:"", formaPago:"Contado", cuentaId:"" });
    setCompraLinea({ sku:"VIG-240", cantidad:"", costoUnitario:"" });
    setCompraItems([]);
  }

  function guardarCompra() {
    const flete = Number(formCompra.flete || 0);
    if (!formCompra.proveedor || compraItems.length === 0) return;
    const subtotal = compraItems.reduce((a, i) => a + i.subtotal, 0);
    const total    = subtotal + flete;
    const compra   = {
      id: editingCompraId || uid(),
      fecha: formCompra.fecha,
      proveedor: formCompra.proveedor,
      descripcion: formCompra.descripcion,
      formaPago: formCompra.formaPago,
      cuentaId: formCompra.formaPago === "Contado" ? formCompra.cuentaId : null,
      flete, items: compraItems, subtotal, total,
    };
    if (editingCompraId) {
      setCompras((prev) => prev.map((x) => x.id === editingCompraId ? compra : x));
    } else {
      setCompras((prev) => [compra, ...prev]);
    }
    limpiarCompraForm();
  }

  function editarCompra(compra) {
    setEditingCompraId(compra.id);
    setFormCompra({
      fecha: compra.fecha, proveedor: compra.proveedor,
      flete: compra.flete?.toString() || "", descripcion: compra.descripcion || "",
      formaPago: compra.formaPago || "Contado", cuentaId: compra.cuentaId || "",
    });
    setCompraItems(compra.items || []);
    setPagina("Compras");
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function eliminarCompra(id) {
    if (!window.confirm("¿Eliminar esta compra? El inventario se recalcula automáticamente.")) return;
    setCompras((prev) => prev.filter((x) => x.id !== id));
    if (editingCompraId === id) limpiarCompraForm();
  }

  // ── Handlers de ventas ───────────────────────────────────────────────────

  function limpiarVentaForm() {
    setEditingVentaId(null);
    setFormVenta({ fecha: today(), cliente:"", origen:"Inventario propio", iva:"", descripcion:"", formaPago:"Contado", cuentaId:"" });
    setVentaLinea({ sku:"VIG-240", cantidad:"", precioUnitario:"", costoUnitario:"" });
    setVentaItems([]);
  }

  function guardarVenta() {
    const iva = Number(formVenta.iva || 0);
    if (!formVenta.cliente || ventaItems.length === 0) return;
    const subtotal   = ventaItems.reduce((a, i) => a + i.subtotalVenta, 0);
    const costoTotal = ventaItems.reduce((a, i) => a + i.subtotalCosto, 0);
    const total      = subtotal + iva;
    const utilidad   = total - costoTotal;
    const venta      = {
      id: editingVentaId || uid(),
      fecha: formVenta.fecha, cliente: formVenta.cliente,
      origen: formVenta.origen, iva, descripcion: formVenta.descripcion,
      formaPago: formVenta.formaPago,
      cuentaId: formVenta.formaPago === "Contado" ? formVenta.cuentaId : null,
      items: ventaItems, subtotal, total, costoTotal, utilidad,
      abonos: editingVentaId
        ? (ventas.find((v) => v.id === editingVentaId)?.abonos || [])
        : [],
    };
    if (editingVentaId) {
      setVentas((prev) => prev.map((x) => x.id === editingVentaId ? venta : x));
    } else {
      setVentas((prev) => [venta, ...prev]);
    }
    limpiarVentaForm();
  }

  function editarVenta(venta) {
    setEditingVentaId(venta.id);
    setFormVenta({
      fecha: venta.fecha, cliente: venta.cliente, origen: venta.origen,
      iva: venta.iva?.toString() || "", descripcion: venta.descripcion || "",
      formaPago: venta.formaPago || "Contado", cuentaId: venta.cuentaId || "",
    });
    setVentaItems(venta.items || []);
    setPagina("Ventas");
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function eliminarVenta(id) {
    if (!window.confirm("¿Eliminar esta venta? El inventario se recalcula automáticamente.")) return;
    setVentas((prev) => prev.filter((x) => x.id !== id));
    if (editingVentaId === id) limpiarVentaForm();
  }

  // ── Handlers de gastos ───────────────────────────────────────────────────

  function registrarGasto() {
    const valor = Number(formGasto.valor || 0);
    if (valor <= 0) return;
    setGastos((prev) => [{ id: uid(), ...formGasto, valor }, ...prev]);
    setFormGasto({ fecha: today(), categoria:"Financiero", valor:"", descripcion:"", cuentaId:"" });
  }

  function eliminarGasto(id) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    setGastos((prev) => prev.filter((g) => g.id !== id));
  }

  // ── Handlers de inversiones ──────────────────────────────────────────────

  function registrarInversion() {
    const valor = Number(formInversion.valor || 0);
    if (valor <= 0) return;
    setInversiones((prev) => [{ id: uid(), ...formInversion, valor }, ...prev]);
    setFormInversion({ fecha: today(), socio:"Raúl", valor:"", descripcion:"", cuentaId:"" });
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  function reiniciarTodo() {
    if (!window.confirm("¿Borrar todos los movimientos y volver al estado inicial?")) return;
    setCompras([]); setVentas([]); setGastos([]); setInversiones([]);
    setCuentas(DEFAULT_CUENTAS);
    limpiarCompraForm(); limpiarVentaForm();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={page}>
      {/* Header */}
      <header style={header}>
        <div style={brand}>
          <div style={logo}>EST</div>
          <div>
            <div style={brandName}>Estantek</div>
            <div style={brandSub}>Sistema financiero interno</div>
          </div>
        </div>

        <nav style={nav}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setPagina(item.id)}
              style={{ ...navBtn, ...(pagina === item.id ? navBtnActive : {}) }}>
              <span style={{ marginRight:5, opacity:.8 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button style={resetBtn} onClick={reiniciarTodo} title="Reiniciar datos">↺</button>
      </header>

      {/* Main */}
      <main style={main}>
        {pagina === "Dashboard" && (
          <Dashboard
            compras={compras} ventas={ventas} gastos={gastos}
            inversiones={inversiones} catalogo={catalogo}
          />
        )}

        {pagina === "Inventario" && (
          <Inventario catalogo={catalogo} />
        )}

        {pagina === "Compras" && (
          <Compras
            compras={compras} catalogo={catalogo} cuentas={cuentas}
            editingId={editingCompraId} setEditingId={setEditingCompraId}
            form={formCompra} setForm={setFormCompra}
            linea={compraLinea} setLinea={setCompraLinea}
            items={compraItems} setItems={setCompraItems}
            onSave={guardarCompra}
            onEdit={editarCompra}
            onDelete={eliminarCompra}
            onCancel={limpiarCompraForm}
          />
        )}

        {pagina === "Ventas" && (
          <Ventas
            ventas={ventas} catalogo={catalogo} cuentas={cuentas}
            editingId={editingVentaId}
            form={formVenta} setForm={setFormVenta}
            linea={ventaLinea} setLinea={setVentaLinea}
            items={ventaItems} setItems={setVentaItems}
            onSave={guardarVenta}
            onEdit={editarVenta}
            onDelete={eliminarVenta}
            onCancel={limpiarVentaForm}
          />
        )}

        {pagina === "Caja" && (
          <Caja
            cuentas={cuentas} setCuentas={setCuentas}
            compras={compras} ventas={ventas}
            gastos={gastos} inversiones={inversiones}
          />
        )}

        {pagina === "Cartera" && (
          <Cartera
            ventas={ventas} setVentas={setVentas}
            compras={compras} cuentas={cuentas}
          />
        )}

        {pagina === "Gastos" && (
          <Gastos
            gastos={gastos} cuentas={cuentas}
            form={formGasto} setForm={setFormGasto}
            onSave={registrarGasto}
            onDelete={eliminarGasto}
          />
        )}

        {pagina === "Inversiones" && (
          <Inversiones
            inversiones={inversiones} cuentas={cuentas}
            form={formInversion} setForm={setFormInversion}
            onSave={registrarInversion}
          />
        )}

        {pagina === "Rentabilidad" && (
          <Rentabilidad ventas={ventas} compras={compras} gastos={gastos} />
        )}
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const page   = { minHeight:"100vh", background:"#f1f5f9", fontFamily:"Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", color:"#0f172a" };
const header = { background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", color:"white", padding:"0 24px", height:60, display:"flex", alignItems:"center", gap:16, boxShadow:"0 4px 20px rgba(15,23,42,.3)", position:"sticky", top:0, zIndex:100 };
const brand  = { display:"flex", alignItems:"center", gap:10, flexShrink:0, marginRight:8 };
const logo   = { background:"#f97316", color:"white", fontWeight:900, fontSize:12, letterSpacing:".1em", borderRadius:7, padding:"5px 8px" };
const brandName = { fontWeight:800, fontSize:14, color:"white", lineHeight:1.2 };
const brandSub  = { fontSize:10, color:"#64748b", lineHeight:1 };
const nav    = { display:"flex", gap:2, flex:1, overflowX:"auto" };
const navBtn = { border:"none", background:"transparent", color:"#64748b", borderRadius:8, padding:"7px 12px", fontWeight:600, cursor:"pointer", fontSize:13, whiteSpace:"nowrap", display:"flex", alignItems:"center" };
const navBtnActive = { background:"#f97316", color:"white" };
const resetBtn = { border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.06)", color:"#64748b", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:16, flexShrink:0 };
const main   = { maxWidth:1440, margin:"0 auto", padding:"28px 24px" };
