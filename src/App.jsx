import { useEffect, useMemo, useState, useCallback } from "react";
import { uid, today } from "./utils.js";
import { buildInventory } from "./inventory.js";
import { CATALOGO_BASE, NAV_ITEMS, DEFAULT_CUENTAS } from "./constants.js";
import {
  dbReady,
  fetchTable, fetchCuentas, fetchTransferencias,
  fetchPrecios, savePrecio,
  fetchProductos, saveProducto, deleteProducto,
  saveRecord, deleteRecord,
  saveCuenta, saveTransferencia,
} from "./db.js";

import Dashboard    from "./pages/Dashboard.jsx";
import Inventario   from "./pages/Inventario.jsx";
import Compras      from "./pages/Compras.jsx";
import Ventas       from "./pages/Ventas.jsx";
import Caja         from "./pages/Caja.jsx";
import Cartera      from "./pages/Cartera.jsx";
import Gastos       from "./pages/Gastos.jsx";
import Inversiones  from "./pages/Inversiones.jsx";
import Rentabilidad from "./pages/Rentabilidad.jsx";

// ─── Icons ───────────────────────────────────────────────────────────────────
const ICONS = {
  Dashboard:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Inventario:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  Compras:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  Ventas:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Caja:         () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  Cartera:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Gastos:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Inversiones:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Rentabilidad: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
};

function mergeCuentas(stored) {
  const ids     = stored.map((c) => c.id);
  const missing = DEFAULT_CUENTAS.filter((d) => !ids.includes(d.id));
  return missing.length > 0 ? [...stored, ...missing] : stored;
}

function NoSupabase() {
  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:480, textAlign:"center" }}>
        <div style={{ width:52, height:52, background:"#f97316", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", fontSize:22, fontWeight:900, color:"white" }}>E</div>
        <h1 style={{ color:"white", fontWeight:900, fontSize:22, marginBottom:12 }}>Configuración requerida</h1>
        <p style={{ color:"#94a3b8", fontSize:15, lineHeight:1.6, marginBottom:24 }}>
          Necesitas conectar Supabase para usar Estantek Finanzas.<br/>
          Edita el archivo <code style={{ background:"#1e293b", padding:"2px 6px", borderRadius:4, color:"#f97316" }}>.env</code> con tus credenciales.
        </p>
        <div style={{ background:"#1e293b", borderRadius:12, padding:"16px 20px", textAlign:"left", fontFamily:"monospace", fontSize:13, color:"#7dd3fc", lineHeight:1.8 }}>
          VITE_SUPABASE_URL=https://xxxx.supabase.co<br/>
          VITE_SUPABASE_ANON_KEY=eyJh...
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [pagina,     setPagina]     = useState("Dashboard");
  const [sidebarOpen,setSidebarOpen]= useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [compras,        setCompras]        = useState([]);
  const [ventas,         setVentas]         = useState([]);
  const [gastos,         setGastos]         = useState([]);
  const [inversiones,    setInversiones]    = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [ajustes,        setAjustes]        = useState([]);
  const [conversiones,   setConversiones]   = useState([]);
  const [retiros,        setRetiros]        = useState([]);
  const [rendimientos,   setRendimientos]   = useState([]);
  const [cuentas,        setCuentas]        = useState(DEFAULT_CUENTAS);
  const [productosExtra, setProductosExtra] = useState([]);
  const [precios,        setPrecios]        = useState({}); // { [sku]: precioVenta }

  // ── Compras form ──────────────────────────────────────────────────────────
  const [editingCompraId,  setEditingCompraId]  = useState(null);
  const [formCompra,       setFormCompra]        = useState({ fecha:today(), proveedor:"", flete:"", descripcion:"" });
  const [compraLinea,      setCompraLinea]       = useState({ sku:"VIG-240", cantidad:"", costoUnitario:"", esLibre:false, skuLibre:"", nombreLibre:"" });
  const [compraItems,      setCompraItems]       = useState([]);
  const [compraPagos,      setCompraPagos]       = useState([]);
  const [compraPagoLinea,  setCompraPagoLinea]   = useState({ cuentaId:"", monto:"" });

  // ── Ventas form ───────────────────────────────────────────────────────────
  const [editingVentaId, setEditingVentaId] = useState(null);
  const [formVenta,      setFormVenta]       = useState({ fecha:today(), cliente:"", origen:"Inventario propio", descripcion:"" });
  const [ventaLinea,     setVentaLinea]      = useState({ sku:"VIG-240", cantidad:"", precioUnitario:"", costoUnitario:"", esReventa:false });
  const [ventaItems,     setVentaItems]      = useState([]);
  const [ventaPagos,     setVentaPagos]      = useState([]);
  const [ventaPagoLinea, setVentaPagoLinea]  = useState({ cuentaId:"", monto:"" });

  // ── Gastos form ───────────────────────────────────────────────────────────
  const [editingGastoId, setEditingGastoId] = useState(null);
  const [formGasto,      setFormGasto]       = useState({ fecha:today(), categoria:"Financiero", valor:"", descripcion:"", cuentaId:"" });

  // ── Inversiones form ──────────────────────────────────────────────────────
  const [formInversion, setFormInversion] = useState({ fecha:today(), socio:"Raúl", valor:"", descripcion:"", cuentaId:"" });

  // ── Catálogo completo: base + productos extra ─────────────────────────────
  const catalogoCompleto = useMemo(
    () => [
      ...CATALOGO_BASE,
      ...productosExtra.map((p) => ({ ...p, isCustom: true })),
    ],
    [productosExtra]
  );

  const catalogo = useMemo(
    () => buildInventory(catalogoCompleto, compras, ventas, ajustes, conversiones, precios),
    [catalogoCompleto, compras, ventas, ajustes, conversiones, precios]
  );

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [c, v, g, i, cu, tr, aj, co, prods, precs, ret, rend] = await Promise.all([
          fetchTable("compras"),
          fetchTable("ventas"),
          fetchTable("gastos"),
          fetchTable("inversiones"),
          fetchCuentas(),
          fetchTransferencias(),
          fetchTable("ajustes"),
          fetchTable("conversiones"),
          fetchProductos(),
          fetchPrecios(),
          fetchTable("retiros"),
          fetchTable("rendimientos"),
        ]);
        setCompras(c); setVentas(v); setGastos(g); setInversiones(i);
        setTransferencias(tr); setAjustes(aj); setConversiones(co);
        setRetiros(ret || []); setRendimientos(rend || []);
        setProductosExtra(prods);
        setPrecios(precs);
        if (cu.length > 0) setCuentas(mergeCuentas(cu));
        else {
          for (const cuenta of DEFAULT_CUENTAS) await saveCuenta(cuenta);
          setCuentas(DEFAULT_CUENTAS);
        }
      } catch (e) {
        console.error("Error al cargar:", e);
        setLoadError(e.message || "Error de conexión");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── DB helpers ────────────────────────────────────────────────────────────
  const dbSave   = useCallback((table, record) => saveRecord(table, record),    []);
  const dbDelete = useCallback((table, id)      => deleteRecord(table, id),     []);
  const dbSaveCu = useCallback((cuenta)         => saveCuenta(cuenta),          []);

  function deriveFormaPago(total, pagos) {
    const sum = pagos.reduce((a, p) => a + p.monto, 0);
    if (sum >= total) return "Contado";
    if (sum <= 0)     return "Crédito";
    return "Mixto";
  }

  // ── Compras ───────────────────────────────────────────────────────────────
  function limpiarCompraForm() {
    setEditingCompraId(null);
    setFormCompra({ fecha:today(), proveedor:"", flete:"", descripcion:"" });
    setCompraLinea({ sku:"VIG-240", cantidad:"", costoUnitario:"", esLibre:false, skuLibre:"", nombreLibre:"" });
    setCompraItems([]); setCompraPagos([]); setCompraPagoLinea({ cuentaId:"", monto:"" });
  }

  function guardarCompra() {
    if (!formCompra.proveedor || compraItems.length === 0) return;
    const flete = Number(formCompra.flete || 0);
    const subtotal = compraItems.reduce((a, i) => a + i.subtotal, 0);
    const total    = subtotal + flete;
    const formaPago = deriveFormaPago(total, compraPagos);
    const compra = {
      id: editingCompraId || uid(),
      fecha: formCompra.fecha, proveedor: formCompra.proveedor, descripcion: formCompra.descripcion,
      formaPago, pagos: compraPagos,
      cuentaId: compraPagos.length === 1 && formaPago === "Contado" ? compraPagos[0].cuentaId : null,
      flete, items: compraItems, subtotal, total,
      pagosProv: editingCompraId ? (compras.find((c)=>c.id===editingCompraId)?.pagosProv||[]) : [],
    };
    setCompras((p) => editingCompraId ? p.map((x)=>x.id===editingCompraId?compra:x) : [compra,...p]);
    dbSave("compras", compra);
    limpiarCompraForm();
  }

  function editarCompra(c) {
    setEditingCompraId(c.id);
    setFormCompra({ fecha:c.fecha, proveedor:c.proveedor, flete:c.flete?.toString()||"", descripcion:c.descripcion||"" });
    setCompraItems(c.items||[]);
    if (c.pagos?.length > 0) setCompraPagos(c.pagos);
    else if (c.cuentaId && c.formaPago==="Contado") setCompraPagos([{ id:uid(), cuentaId:c.cuentaId, monto:c.total }]);
    else setCompraPagos([]);
    setPagina("Compras"); setMobileOpen(false);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function eliminarCompra(id) {
    setCompras((p) => p.filter((x)=>x.id!==id));
    dbDelete("compras", id);
    if (editingCompraId === id) limpiarCompraForm();
  }

  function pagarProveedor(compraId, pago) {
    setCompras((prev) => prev.map((c) => {
      if (c.id !== compraId) return c;
      const next = { ...c, pagosProv: [...(c.pagosProv||[]), { id:uid(), ...pago }] };
      dbSave("compras", next);
      return next;
    }));
  }

  // ── Ventas ────────────────────────────────────────────────────────────────
  function limpiarVentaForm() {
    setEditingVentaId(null);
    setFormVenta({ fecha:today(), cliente:"", origen:"Inventario propio", descripcion:"" });
    setVentaLinea({ sku:"VIG-240", cantidad:"", precioUnitario:"", costoUnitario:"", esReventa:false });
    setVentaItems([]); setVentaPagos([]); setVentaPagoLinea({ cuentaId:"", monto:"" });
  }

  function guardarVenta() {
    if (!formVenta.cliente || ventaItems.length === 0) return;
    const subtotal     = ventaItems.reduce((a,i)=>a+i.subtotalVenta,0);
    const costoTotal   = ventaItems.reduce((a,i)=>a+i.subtotalCosto,0);
    const costoReventa = ventaItems.filter((i)=>i.esReventa).reduce((a,i)=>a+i.subtotalCosto,0);
    const total        = subtotal;
    const formaPago    = deriveFormaPago(total, ventaPagos);
    const tienePropio  = ventaItems.some((i)=>!i.esReventa);
    const tieneReventa = ventaItems.some((i)=>i.esReventa);
    const origenFinal  = tienePropio && tieneReventa ? "Mixto" : tieneReventa ? "Reventa" : formVenta.origen;
    const venta = {
      id: editingVentaId || uid(),
      fecha: formVenta.fecha, cliente: formVenta.cliente, origen: origenFinal,
      descripcion: formVenta.descripcion,
      formaPago, pagos: ventaPagos,
      cuentaId: ventaPagos.length===1&&formaPago==="Contado" ? ventaPagos[0].cuentaId : null,
      items: ventaItems, subtotal, total, costoTotal, costoReventa, utilidad: total - costoTotal,
      abonos: editingVentaId ? (ventas.find((v)=>v.id===editingVentaId)?.abonos||[]) : [],
    };
    setVentas((p) => editingVentaId ? p.map((x)=>x.id===editingVentaId?venta:x) : [venta,...p]);
    dbSave("ventas", venta);
    limpiarVentaForm();
  }

  function editarVenta(v) {
    setEditingVentaId(v.id);
    setFormVenta({ fecha:v.fecha, cliente:v.cliente, origen:v.origen, descripcion:v.descripcion||"" });
    setVentaItems(v.items||[]);
    if (v.pagos?.length>0) setVentaPagos(v.pagos);
    else if (v.cuentaId&&v.formaPago==="Contado") setVentaPagos([{ id:uid(), cuentaId:v.cuentaId, monto:v.total }]);
    else setVentaPagos([]);
    setPagina("Ventas"); setMobileOpen(false);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function eliminarVenta(id) {
    setVentas((p)=>p.filter((x)=>x.id!==id));
    dbDelete("ventas", id);
    if (editingVentaId===id) limpiarVentaForm();
  }

  // ── Gastos ────────────────────────────────────────────────────────────────
  function registrarGasto() {
    const valor = Number(formGasto.valor || 0);
    if (valor <= 0) return;
    if (editingGastoId) {
      setGastos((p) => {
        const updated = p.map((g)=>g.id===editingGastoId?{...g,...formGasto,valor}:g);
        const gasto = updated.find((g)=>g.id===editingGastoId);
        if (gasto) dbSave("gastos", gasto);
        return updated;
      });
      setEditingGastoId(null);
    } else {
      const gasto = { id:uid(), ...formGasto, valor };
      setGastos((p)=>[gasto,...p]);
      dbSave("gastos", gasto);
    }
    setFormGasto({ fecha:today(), categoria:"Financiero", valor:"", descripcion:"", cuentaId:"" });
  }

  function editarGasto(g) {
    setEditingGastoId(g.id);
    setFormGasto({ fecha:g.fecha, categoria:g.categoria, valor:g.valor.toString(), descripcion:g.descripcion||"", cuentaId:g.cuentaId||"" });
    setPagina("Gastos"); setMobileOpen(false);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function eliminarGasto(id) {
    setGastos((p)=>p.filter((g)=>g.id!==id));
    dbDelete("gastos", id);
    if (editingGastoId===id) { setEditingGastoId(null); setFormGasto({ fecha:today(), categoria:"Financiero", valor:"", descripcion:"", cuentaId:"" }); }
  }

  // ── Inversiones ───────────────────────────────────────────────────────────
  function registrarInversion() {
    const valor = Number(formInversion.valor || 0);
    if (valor<=0) return;
    const inv = { id:uid(), ...formInversion, valor };
    setInversiones((p)=>[inv,...p]);
    dbSave("inversiones", inv);
    setFormInversion({ fecha:today(), socio:"Raúl", valor:"", descripcion:"", cuentaId:"" });
  }

  // ── Retiros de socios ─────────────────────────────────────────────────────
  function registrarRetiro(retiro) {
    const record = { id: uid(), ...retiro };
    setRetiros((p) => [record, ...p]);
    dbSave("retiros", record);
  }

  // ── Rendimientos financieros ──────────────────────────────────────────────
  function registrarRendimiento(rend) {
    const record = { id: uid(), ...rend };
    setRendimientos((p) => [record, ...p]);
    dbSave("rendimientos", record);
  }

  // ── Cuentas ───────────────────────────────────────────────────────────────
  function agregarCuenta(nombre, tipo, color) {
    const cuenta = { id:uid(), nombre, tipo, saldoInicial:0, color };
    setCuentas((p)=>[...p, cuenta]);
    dbSaveCu(cuenta);
  }

  function renombrarCuenta(id, nombre) {
    setCuentas((p) => {
      const updated = p.map((c)=>c.id===id?{...c,nombre}:c);
      const cuenta  = updated.find((c)=>c.id===id);
      if (cuenta) dbSaveCu(cuenta);
      return updated;
    });
  }

  // ── Transferencias ────────────────────────────────────────────────────────
  function registrarTransferencia(tr) {
    const t = { id:uid(), ...tr };
    setTransferencias((prev)=>[t,...prev]);
    saveTransferencia(t);
  }

  // ── Inventario ────────────────────────────────────────────────────────────
  function guardarAjuste(ajuste) {
    const record = { id:uid(), ...ajuste };
    setAjustes((p)=>[record,...p]);
    dbSave("ajustes", record);
  }

  function guardarConversion(conv) {
    const record = { id:uid(), ...conv };
    setConversiones((p)=>[record,...p]);
    dbSave("conversiones", record);
  }

  function guardarProductoExtra(prod) {
    setProductosExtra((p)=>[...p, prod]);
    saveProducto(prod);
    // Also save its initial precio if provided
    if (prod.precioVenta > 0) {
      setPrecios((p)=>({ ...p, [prod.sku]: prod.precioVenta }));
      savePrecio(prod.sku, prod.precioVenta);
    }
  }

  function eliminarProductoExtra(id) {
    setProductosExtra((p)=>p.filter((x)=>x.id!==id));
    deleteProducto(id);
  }

  function actualizarPrecio(sku, precioVenta) {
    setPrecios((p)=>({ ...p, [sku]: precioVenta }));
    savePrecio(sku, precioVenta);
  }

  // ── Cartera ───────────────────────────────────────────────────────────────
  function registrarAbono(ventaId, abono) {
    setVentas((p) => p.map((v) => {
      if (v.id!==ventaId) return v;
      const next = { ...v, abonos:[...(v.abonos||[]),abono] };
      dbSave("ventas", next);
      return next;
    }));
  }

  function pagarProveedorReventa(ventaId, pago) {
    const nuevoPago = { id:uid(), ...pago };
    let ventaActualizada = null;
    setVentas((prev) => {
      const next = prev.map((v) => {
        if (v.id !== ventaId) return v;
        ventaActualizada = { ...v, pagosProvReventa: [...(v.pagosProvReventa||[]), nuevoPago] };
        return ventaActualizada;
      });
      return next;
    });
    // dbSave usa la referencia capturada, no un side-effect dentro del updater
    setTimeout(() => { if (ventaActualizada) dbSave("ventas", ventaActualizada); }, 0);
  }

  // ── Loading / error screens ───────────────────────────────────────────────
  if (!dbReady) return <NoSupabase />;

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0f172a" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:48, height:48, background:"#f97316", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:20, fontWeight:900, color:"white" }}>E</div>
          <div style={{ color:"white", fontWeight:700, fontSize:16, marginBottom:8 }}>Estantek</div>
          <div style={{ color:"#64748b", fontSize:14 }}>Cargando datos...</div>
          <div style={{ marginTop:24, display:"flex", gap:6, justifyContent:"center" }}>
            {[0,1,2].map((i)=>(
              <div key={i} style={{ width:8, height:8, background:"#f97316", borderRadius:"50%", animation:`pulse 1.2s ${i*.2}s infinite` }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0f172a" }}>
        <div style={{ maxWidth:440, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
          <h2 style={{ color:"white", fontWeight:800, marginBottom:12 }}>Error al conectar</h2>
          <p style={{ color:"#94a3b8", fontSize:14, marginBottom:20 }}>{loadError}</p>
          <button style={{ border:"none", borderRadius:10, padding:"12px 24px", background:"#f97316", color:"white", fontWeight:800, cursor:"pointer", fontSize:15 }}
            onClick={()=>window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  function navigate(id) { setPagina(id); setMobileOpen(false); }
  const currentNav = NAV_ITEMS.find((n)=>n.id===pagina);

  return (
    <div style={appShell}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={()=>setMobileOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:150 }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar-el${mobileOpen?" sidebar-open":""}`}
        style={{ ...sidebar, ...(sidebarOpen?{}:sidebarCollapsed) }}>
        <div style={sidebarHeader}>
          <div style={logoBox}>E</div>
          {sidebarOpen && (
            <div>
              <div style={logoTitle}>Estantek</div>
              <div style={logoSub}>Sistema financiero</div>
            </div>
          )}
        </div>

        <nav style={sidebarNav}>
          {NAV_ITEMS.map((item)=>{
            const Icon   = ICONS[item.id];
            const active = pagina===item.id;
            return (
              <button key={item.id} style={{ ...navItem, ...(active?navItemActive:{}) }}
                onClick={()=>navigate(item.id)} title={!sidebarOpen?item.label:""}>
                <span style={{ display:"flex", alignItems:"center", flexShrink:0, color:active?"#f97316":"#64748b" }}>
                  {Icon && <Icon />}
                </span>
                {sidebarOpen && <span style={{ color:active?"white":"#94a3b8", fontWeight:active?700:500 }}>{item.label}</span>}
                {active && sidebarOpen && <div style={navDot} />}
              </button>
            );
          })}
        </nav>

        <div style={sidebarFooter}>
          {sidebarOpen && (
            <div style={{ marginBottom:12 }}>
              <div style={dbBadge}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#10b981" }} />
                <span>Supabase conectado</span>
              </div>
            </div>
          )}
          <button style={collapseBtn} onClick={()=>setSidebarOpen((p)=>!p)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
              {sidebarOpen ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area-el" style={{ ...mainArea, marginLeft: sidebarOpen?240:68 }}>
        <header style={topbar} className="topbar-inner">
          <button className="hamburger-btn"
            style={{ border:"none", background:"transparent", color:"#475569", cursor:"pointer", padding:"6px 8px", borderRadius:8, fontSize:20, lineHeight:1 }}
            onClick={()=>setMobileOpen((p)=>!p)}>☰</button>
          <div style={{ flex:1 }}>
            <div style={topbarTitle}>{currentNav?.label||pagina}</div>
            <div style={topbarDate}>
              {new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </div>
          </div>
          <div className="hide-mobile" style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#94a3b8", background:"#f8fafc", borderRadius:8, padding:"6px 12px", border:"1px solid #e2e8f0" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#10b981" }} />
            Supabase activo
          </div>
        </header>

        <main style={pageContent} className="page-content-inner">
          {pagina==="Dashboard"    && <Dashboard compras={compras} ventas={ventas} gastos={gastos} inversiones={inversiones} catalogo={catalogo} cuentas={cuentas} retiros={retiros} rendimientos={rendimientos} onRetiro={registrarRetiro} onRendimiento={registrarRendimiento} />}
          {pagina==="Inventario"   && (
            <Inventario
              catalogo={catalogo}
              compras={compras}
              ajustes={ajustes}
              conversiones={conversiones}
              productosExtra={productosExtra}
              onAjuste={guardarAjuste}
              onConversion={guardarConversion}
              onSaveProducto={guardarProductoExtra}
              onDeleteProducto={eliminarProductoExtra}
              onUpdatePrecio={actualizarPrecio}
            />
          )}
          {pagina==="Compras"      && (
            <Compras
              compras={compras} ventas={ventas} catalogo={catalogo} cuentas={cuentas}
              editingId={editingCompraId} setEditingId={setEditingCompraId}
              form={formCompra} setForm={setFormCompra}
              linea={compraLinea} setLinea={setCompraLinea}
              items={compraItems} setItems={setCompraItems}
              pagos={compraPagos} setPagos={setCompraPagos}
              pagoLinea={compraPagoLinea} setPagoLinea={setCompraPagoLinea}
              onSave={guardarCompra} onEdit={editarCompra} onDelete={eliminarCompra} onCancel={limpiarCompraForm}
            />
          )}
          {pagina==="Ventas"       && (
            <Ventas
              ventas={ventas} catalogo={catalogo} cuentas={cuentas}
              editingId={editingVentaId}
              form={formVenta} setForm={setFormVenta}
              linea={ventaLinea} setLinea={setVentaLinea}
              items={ventaItems} setItems={setVentaItems}
              pagos={ventaPagos} setPagos={setVentaPagos}
              pagoLinea={ventaPagoLinea} setPagoLinea={setVentaPagoLinea}
              onSave={guardarVenta} onEdit={editarVenta} onDelete={eliminarVenta} onCancel={limpiarVentaForm}
              onPagarProveedorReventa={pagarProveedorReventa}
            />
          )}
          {pagina==="Caja"         && (
            <Caja
              cuentas={cuentas}
              compras={compras} ventas={ventas} gastos={gastos} inversiones={inversiones}
              transferencias={transferencias}
              retiros={retiros} rendimientos={rendimientos}
              onTransferencia={registrarTransferencia}
              onAddCuenta={agregarCuenta}
              onRenameCuenta={renombrarCuenta}
            />
          )}
          {pagina==="Cartera"      && (
            <Cartera
              ventas={ventas} compras={compras} cuentas={cuentas}
              onAbono={registrarAbono}
              onPagarProveedor={pagarProveedor}
            />
          )}
          {pagina==="Gastos"       && (
            <Gastos
              gastos={gastos} cuentas={cuentas}
              form={formGasto} setForm={setFormGasto}
              editingId={editingGastoId}
              onSave={registrarGasto} onDelete={eliminarGasto} onEdit={editarGasto}
              onCancel={()=>{ setEditingGastoId(null); setFormGasto({ fecha:today(), categoria:"Financiero", valor:"", descripcion:"", cuentaId:"" }); }}
            />
          )}
          {pagina==="Inversiones"  && (
            <Inversiones
              inversiones={inversiones} cuentas={cuentas}
              form={formInversion} setForm={setFormInversion}
              onSave={registrarInversion}
            />
          )}
          {pagina==="Rentabilidad" && <Rentabilidad ventas={ventas} compras={compras} gastos={gastos} />}
        </main>
      </div>
    </div>
  );
}

// ─── Layout styles ────────────────────────────────────────────────────────────
const appShell   = { display:"flex", minHeight:"100vh", background:"#f1f5f9" };
const sidebar    = { width:240, flexShrink:0, background:"#0f172a", position:"fixed", top:0, left:0, height:"100vh", display:"flex", flexDirection:"column", transition:"width .2s ease", zIndex:200, boxShadow:"4px 0 24px rgba(0,0,0,.15)" };
const sidebarCollapsed = { width:68 };
const sidebarHeader    = { padding:"20px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 };
const logoBox          = { width:36, height:36, background:"linear-gradient(135deg,#f97316,#ea580c)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"white", flexShrink:0, boxShadow:"0 4px 12px rgba(249,115,22,.4)" };
const logoTitle        = { fontWeight:800, fontSize:14, color:"white", lineHeight:1.2 };
const logoSub          = { fontSize:11, color:"#475569", lineHeight:1.3, marginTop:2 };
const sidebarNav       = { flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" };
const navItem          = { display:"flex", alignItems:"center", gap:12, padding:"10px 12px", border:"none", background:"transparent", borderRadius:10, cursor:"pointer", width:"100%", textAlign:"left", fontSize:13, transition:"background .15s" };
const navItemActive    = { background:"rgba(249,115,22,.12)" };
const navDot           = { width:6, height:6, borderRadius:"50%", background:"#f97316", marginLeft:"auto" };
const sidebarFooter    = { padding:"12px 10px 16px", borderTop:"1px solid rgba(255,255,255,.06)", flexShrink:0, display:"flex", flexDirection:"column" };
const dbBadge          = { display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#64748b", background:"rgba(255,255,255,.05)", borderRadius:8, padding:"6px 10px" };
const collapseBtn      = { border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", borderRadius:8, padding:"7px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" };
const mainArea         = { flex:1, display:"flex", flexDirection:"column", transition:"margin-left .2s ease", minWidth:0 };
const topbar           = { background:"white", padding:"16px 28px", display:"flex", alignItems:"center", gap:16, borderBottom:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(15,23,42,.04)", position:"sticky", top:0, zIndex:100 };
const topbarTitle      = { fontWeight:800, fontSize:20, color:"#0f172a" };
const topbarDate       = { fontSize:12, color:"#94a3b8", marginTop:2 };
const pageContent      = { flex:1, padding:"28px 32px", maxWidth:1400 };
