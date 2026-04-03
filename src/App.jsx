import { useEffect, useMemo, useState } from "react";

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatMeters(cmLike) {
  return `${(cmLike / 100)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1")} m`;
}

function money(n) {
  return Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function pct(num, denom) {
  if (!denom || denom === 0) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readLS(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ─── Catálogo base ────────────────────────────────────────────────────────────

const CATALOGO_BASE = [
  ...[150,160,170,180,190,200,210,220,230,240,250,260,270,280,290,300].map((l) => ({
    id: `VIG-${l}`,
    sku: `VIG-${l}`,
    nombre: `Viga semipesada ${formatMeters(l)}`,
    categoria: "Viga",
    tipo: "Inventario propio",
    unidad: "und",
    costoBase: 0,
  })),
  ...[200, 240].flatMap((alto) =>
    [40, 50, 60, 70, 80, 90, 100].map((prof) => ({
      id: `MAR-${alto}-${prof}`,
      sku: `MAR-${alto}-${prof}`,
      nombre: `Marco semipesado ${formatMeters(alto)} x ${formatMeters(prof)}`,
      categoria: "Marco",
      tipo: "Inventario propio",
      unidad: "und",
      costoBase: 0,
    }))
  ),
  ...[150, 200, 240, 280, 300].flatMap((largo) =>
    [40, 50, 60, 80].map((prof) => ({
      id: `GALV-${largo}-${prof}`,
      sku: `GALV-${largo}-${prof}`,
      nombre: `Entrepaño galvanizado ${formatMeters(largo)} x ${formatMeters(prof)}`,
      categoria: "Galvanizado",
      tipo: "Reventa",
      unidad: "und",
      costoBase: 0,
    }))
  ),
  ...[150, 200, 240, 280, 300].flatMap((largo) =>
    [40, 50, 60, 80].map((prof) => ({
      id: `MDECO-${largo}-${prof}`,
      sku: `MDECO-${largo}-${prof}`,
      nombre: `Entrepaño madera económica ${formatMeters(largo)} x ${formatMeters(prof)}`,
      categoria: "Madera económica",
      tipo: "Inventario propio",
      unidad: "und",
      costoBase: 0,
    }))
  ),
  ...[150, 200, 240, 280, 300].flatMap((largo) =>
    [40, 50, 60, 80].map((prof) => ({
      id: `MPREM-${largo}-${prof}`,
      sku: `MPREM-${largo}-${prof}`,
      nombre: `Entrepaño madera premium ${formatMeters(largo)} x ${formatMeters(prof)}`,
      categoria: "Madera premium",
      tipo: "Bajo pedido",
      unidad: "und",
      costoBase: 0,
    }))
  ),
  { id: "PESADA-TORRE", sku: "PESADA-TORRE", nombre: "Torre estantería pesada", categoria: "Pesada", tipo: "Reventa", unidad: "und", costoBase: 0 },
  { id: "PESADA-VIGA", sku: "PESADA-VIGA", nombre: "Viga estantería pesada", categoria: "Pesada", tipo: "Reventa", unidad: "und", costoBase: 0 },
  { id: "PESADA-GALV", sku: "PESADA-GALV", nombre: "Entrepaño galvanizado pesada", categoria: "Pesada", tipo: "Reventa", unidad: "und", costoBase: 0 },
  { id: "PESADA-COMP", sku: "PESADA-COMP", nombre: "Estantería pesada completa", categoria: "Pesada", tipo: "Reventa", unidad: "und", costoBase: 0 },
  { id: "SERV-INST", sku: "SERV-INST", nombre: "Servicio de instalación", categoria: "Servicio", tipo: "Servicio", unidad: "serv", costoBase: 0 },
  { id: "SERV-TRANS", sku: "SERV-TRANS", nombre: "Servicio de transporte", categoria: "Servicio", tipo: "Servicio", unidad: "serv", costoBase: 0 },
  { id: "SERV-DESMON", sku: "SERV-DESMON", nombre: "Servicio de desmonte", categoria: "Servicio", tipo: "Servicio", unidad: "serv", costoBase: 0 },
  { id: "SERV-MODIF", sku: "SERV-MODIF", nombre: "Servicio de modificación", categoria: "Servicio", tipo: "Servicio", unidad: "serv", costoBase: 0 },
];

const NAV_ITEMS = [
  { id: "Dashboard",   label: "Dashboard",    icon: "◈" },
  { id: "Inventario",  label: "Inventario",   icon: "⊞" },
  { id: "Compras",     label: "Compras",      icon: "⬇" },
  { id: "Ventas",      label: "Ventas",       icon: "⬆" },
  { id: "Gastos",      label: "Gastos",       icon: "◉" },
  { id: "Inversiones", label: "Inversiones",  icon: "⊕" },
  { id: "Costos",      label: "Rentabilidad", icon: "%" },
];

const ORIGEN_COLORS = {
  "Inventario propio": { bg: "#dbeafe", color: "#1d4ed8" },
  "Reventa":           { bg: "#fef3c7", color: "#92400e" },
  "Bajo pedido":       { bg: "#f3e8ff", color: "#6b21a8" },
  "Servicio":          { bg: "#d1fae5", color: "#065f46" },
};

const CATEGORIA_COLORS = {
  "Viga":             { bg: "#e0f2fe", color: "#0369a1" },
  "Marco":            { bg: "#ffe4e6", color: "#be123c" },
  "Galvanizado":      { bg: "#d1fae5", color: "#065f46" },
  "Madera económica": { bg: "#fef9c3", color: "#713f12" },
  "Madera premium":   { bg: "#f3e8ff", color: "#6b21a8" },
  "Pesada":           { bg: "#fee2e2", color: "#991b1b" },
  "Servicio":         { bg: "#f0fdf4", color: "#166534" },
};

// ─── Lógica de inventario ─────────────────────────────────────────────────────

function buildInventory(baseCatalogo, compras, ventas) {
  const map = new Map(
    baseCatalogo.map((item) => [
      item.sku,
      { ...item, stock: 0, costo: item.costoBase || 0 },
    ])
  );

  for (const compra of compras) {
    for (const linea of compra.items || []) {
      const actual = map.get(linea.sku);
      if (!actual) continue;
      const cantidadNueva = Number(linea.cantidad || 0);
      const costoUnitarioNuevo = Number(linea.costoUnitario || 0);
      const costoAnteriorTotal = actual.stock * actual.costo;
      const costoNuevoTotal = cantidadNueva * costoUnitarioNuevo;
      const nuevoStock = actual.stock + cantidadNueva;
      const nuevoCosto =
        nuevoStock > 0
          ? round2((costoAnteriorTotal + costoNuevoTotal) / nuevoStock)
          : actual.costo;
      map.set(linea.sku, { ...actual, stock: nuevoStock, costo: nuevoCosto });
    }
  }

  for (const venta of ventas) {
    if (venta.origen !== "Inventario propio") continue;
    for (const linea of venta.items || []) {
      const actual = map.get(linea.sku);
      if (!actual) continue;
      const cantidadVendida = Number(linea.cantidad || 0);
      map.set(linea.sku, {
        ...actual,
        stock: Math.max(0, actual.stock - cantidadVendida),
      });
    }
  }

  return Array.from(map.values());
}

// ─── App principal ────────────────────────────────────────────────────────────

export default function App() {
  const [compras, setCompras] = useState(() => readLS("compras", []));
  const [ventas, setVentas] = useState(() => readLS("ventas", []));
  const [gastos, setGastos] = useState(() => readLS("gastos", []));
  const [inversiones, setInversiones] = useState(() => readLS("inversiones", []));
  const [pagina, setPagina] = useState("Dashboard");
  const [busquedaInventario, setBusquedaInventario] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [editingCompraId, setEditingCompraId] = useState(null);
  const [editingVentaId, setEditingVentaId] = useState(null);

  const [catalogo, setCatalogo] = useState(() =>
    buildInventory(CATALOGO_BASE, compras, ventas)
  );

  const [formCompra, setFormCompra] = useState({
    fecha: today(), proveedor: "", flete: "", descripcion: "",
  });
  const [compraLinea, setCompraLinea] = useState({
    sku: "VIG-240", cantidad: "", costoUnitario: "",
  });
  const [compraItems, setCompraItems] = useState([]);

  const [formVenta, setFormVenta] = useState({
    fecha: today(), cliente: "", origen: "Inventario propio", iva: "", descripcion: "",
  });
  const [ventaLinea, setVentaLinea] = useState({
    sku: "VIG-240", cantidad: "", precioUnitario: "", costoUnitario: "",
  });
  const [ventaItems, setVentaItems] = useState([]);

  const [formGasto, setFormGasto] = useState({
    fecha: today(), categoria: "Financiero", valor: "", descripcion: "",
  });
  const [formInversion, setFormInversion] = useState({
    fecha: today(), socio: "Raúl", valor: "", descripcion: "",
  });

  useEffect(() => saveLS("compras", compras), [compras]);
  useEffect(() => saveLS("ventas", ventas), [ventas]);
  useEffect(() => saveLS("gastos", gastos), [gastos]);
  useEffect(() => saveLS("inversiones", inversiones), [inversiones]);
  useEffect(() => {
    setCatalogo(buildInventory(CATALOGO_BASE, compras, ventas));
  }, [compras, ventas]);

  const catalogoMap = useMemo(
    () => Object.fromEntries(catalogo.map((p) => [p.sku, p])),
    [catalogo]
  );

  const resumen = useMemo(() => {
    const totalInversiones = inversiones.reduce((acc, x) => acc + x.valor, 0);
    const totalCompras = compras.reduce((acc, x) => acc + x.total, 0);
    const totalVentas = ventas.reduce((acc, x) => acc + x.total, 0);
    const totalCostosVenta = ventas.reduce((acc, x) => acc + x.costoTotal, 0);
    const totalGastos = gastos.reduce((acc, x) => acc + x.valor, 0);
    const utilidadBruta = totalVentas - totalCostosVenta;
    const utilidadNeta = utilidadBruta - totalGastos;
    const valorInventario = catalogo.reduce(
      (acc, item) => acc + item.stock * item.costo, 0
    );
    const cajaTeorica = totalInversiones + totalVentas - totalCompras - totalGastos;
    const margenBruto = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;
    const margenNeto = totalVentas > 0 ? (utilidadNeta / totalVentas) * 100 : 0;

    const ventasPorOrigen = ventas.reduce((acc, v) => {
      acc[v.origen] = (acc[v.origen] || 0) + v.total;
      return acc;
    }, {});

    const gastosPorCategoria = gastos.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
      return acc;
    }, {});

    const skusConStock = catalogo.filter((x) => x.stock > 0).length;
    const skusCriticos = catalogo.filter((x) => x.stock > 0 && x.stock <= 2).length;

    return {
      totalInversiones, totalCompras, totalVentas, totalCostosVenta,
      totalGastos, utilidadBruta, utilidadNeta, valorInventario, cajaTeorica,
      margenBruto, margenNeto, ventasPorOrigen, gastosPorCategoria,
      skusConStock, skusCriticos,
      totalSkus: catalogo.length,
    };
  }, [catalogo, compras, ventas, gastos, inversiones]);

  const inventarioFiltrado = useMemo(() => {
    let items = catalogo;
    if (filtroCategoria !== "Todos") {
      items = items.filter((i) => i.categoria === filtroCategoria);
    }
    const q = busquedaInventario.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.nombre.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
    );
  }, [catalogo, busquedaInventario, filtroCategoria]);

  const categoriasUnicas = useMemo(
    () => ["Todos", ...new Set(catalogo.map((i) => i.categoria))],
    [catalogo]
  );

  // ── Totales en vivo para formularios ──────────────────────────────────────

  const compraResumenVivo = useMemo(() => {
    const subtotal = compraItems.reduce((acc, i) => acc + i.subtotal, 0);
    const flete = Number(formCompra.flete || 0);
    return { subtotal, flete, total: subtotal + flete };
  }, [compraItems, formCompra.flete]);

  const ventaResumenVivo = useMemo(() => {
    const subtotal = ventaItems.reduce((acc, i) => acc + i.subtotalVenta, 0);
    const costo = ventaItems.reduce((acc, i) => acc + i.subtotalCosto, 0);
    const utilidad = subtotal - costo;
    const iva = Number(formVenta.iva || 0);
    const total = subtotal + iva;
    const margen = subtotal > 0 ? (utilidad / subtotal) * 100 : 0;
    return { subtotal, costo, utilidad, iva, total, margen };
  }, [ventaItems, formVenta.iva]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function limpiarCompraForm() {
    setEditingCompraId(null);
    setFormCompra({ fecha: today(), proveedor: "", flete: "", descripcion: "" });
    setCompraLinea({ sku: "VIG-240", cantidad: "", costoUnitario: "" });
    setCompraItems([]);
  }

  function limpiarVentaForm() {
    setEditingVentaId(null);
    setFormVenta({ fecha: today(), cliente: "", origen: "Inventario propio", iva: "", descripcion: "" });
    setVentaLinea({ sku: "VIG-240", cantidad: "", precioUnitario: "", costoUnitario: "" });
    setVentaItems([]);
  }

  function agregarLineaCompra() {
    const cantidad = Number(compraLinea.cantidad || 0);
    const costoUnitario = Number(compraLinea.costoUnitario || 0);
    if (!compraLinea.sku || cantidad <= 0 || costoUnitario < 0) return;
    const producto = catalogoMap[compraLinea.sku];
    setCompraItems((prev) => [
      ...prev,
      {
        id: uid(),
        sku: compraLinea.sku,
        producto: producto?.nombre || compraLinea.sku,
        cantidad,
        costoUnitario,
        subtotal: cantidad * costoUnitario,
      },
    ]);
    setCompraLinea({ sku: compraLinea.sku, cantidad: "", costoUnitario: "" });
  }

  function eliminarLineaCompra(id) {
    setCompraItems((prev) => prev.filter((item) => item.id !== id));
  }

  function guardarCompra() {
    const flete = Number(formCompra.flete || 0);
    if (!formCompra.proveedor || compraItems.length === 0) return;
    const subtotal = compraItems.reduce((acc, item) => acc + item.subtotal, 0);
    const total = subtotal + flete;
    const compra = {
      id: editingCompraId || uid(),
      fecha: formCompra.fecha,
      proveedor: formCompra.proveedor,
      descripcion: formCompra.descripcion,
      flete,
      items: compraItems,
      subtotal,
      total,
    };
    if (editingCompraId) {
      setCompras((prev) => prev.map((item) => (item.id === editingCompraId ? compra : item)));
    } else {
      setCompras((prev) => [compra, ...prev]);
    }
    limpiarCompraForm();
  }

  function editarCompra(compra) {
    setEditingCompraId(compra.id);
    setFormCompra({
      fecha: compra.fecha,
      proveedor: compra.proveedor,
      flete: compra.flete?.toString() || "",
      descripcion: compra.descripcion || "",
    });
    setCompraItems(compra.items || []);
    setPagina("Compras");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function eliminarCompra(id) {
    if (!window.confirm("¿Eliminar esta compra? El inventario se recalculará automáticamente.")) return;
    setCompras((prev) => prev.filter((item) => item.id !== id));
    if (editingCompraId === id) limpiarCompraForm();
  }

  function agregarLineaVenta() {
    const cantidad = Number(ventaLinea.cantidad || 0);
    const precioUnitario = Number(ventaLinea.precioUnitario || 0);
    const skuInfo = catalogoMap[ventaLinea.sku];
    const costoBase = Number(ventaLinea.costoUnitario || skuInfo?.costo || 0);
    if (!ventaLinea.sku || cantidad <= 0 || precioUnitario <= 0) return;
    setVentaItems((prev) => [
      ...prev,
      {
        id: uid(),
        sku: ventaLinea.sku,
        producto: skuInfo?.nombre || ventaLinea.sku,
        cantidad,
        precioUnitario,
        costoUnitario: costoBase,
        subtotalVenta: cantidad * precioUnitario,
        subtotalCosto: cantidad * costoBase,
        utilidad: cantidad * precioUnitario - cantidad * costoBase,
      },
    ]);
    setVentaLinea({ sku: ventaLinea.sku, cantidad: "", precioUnitario: "", costoUnitario: "" });
  }

  function eliminarLineaVenta(id) {
    setVentaItems((prev) => prev.filter((item) => item.id !== id));
  }

  function guardarVenta() {
    const iva = Number(formVenta.iva || 0);
    if (!formVenta.cliente || ventaItems.length === 0) return;
    const subtotal = ventaItems.reduce((acc, item) => acc + item.subtotalVenta, 0);
    const costoTotal = ventaItems.reduce((acc, item) => acc + item.subtotalCosto, 0);
    const total = subtotal + iva;
    const utilidad = total - costoTotal;
    const venta = {
      id: editingVentaId || uid(),
      fecha: formVenta.fecha,
      cliente: formVenta.cliente,
      origen: formVenta.origen,
      iva,
      descripcion: formVenta.descripcion,
      items: ventaItems,
      subtotal,
      total,
      costoTotal,
      utilidad,
    };
    if (editingVentaId) {
      setVentas((prev) => prev.map((item) => (item.id === editingVentaId ? venta : item)));
    } else {
      setVentas((prev) => [venta, ...prev]);
    }
    limpiarVentaForm();
  }

  function editarVenta(venta) {
    setEditingVentaId(venta.id);
    setFormVenta({
      fecha: venta.fecha,
      cliente: venta.cliente,
      origen: venta.origen,
      iva: venta.iva?.toString() || "",
      descripcion: venta.descripcion || "",
    });
    setVentaItems(venta.items || []);
    setPagina("Ventas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function eliminarVenta(id) {
    if (!window.confirm("¿Eliminar esta venta? El inventario se recalculará automáticamente.")) return;
    setVentas((prev) => prev.filter((item) => item.id !== id));
    if (editingVentaId === id) limpiarVentaForm();
  }

  function registrarGasto() {
    const valor = Number(formGasto.valor || 0);
    if (valor <= 0) return;
    setGastos((prev) => [{ id: uid(), ...formGasto, valor }, ...prev]);
    setFormGasto({ fecha: today(), categoria: "Financiero", valor: "", descripcion: "" });
  }

  function eliminarGasto(id) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    setGastos((prev) => prev.filter((g) => g.id !== id));
  }

  function registrarInversion() {
    const valor = Number(formInversion.valor || 0);
    if (valor <= 0) return;
    setInversiones((prev) => [{ id: uid(), ...formInversion, valor }, ...prev]);
    setFormInversion({ fecha: today(), socio: "Raúl", valor: "", descripcion: "" });
  }

  function reiniciarTodo() {
    if (!window.confirm("¿Seguro que quieres borrar todos los movimientos y dejar solo el catálogo inicial?")) return;
    setCompras([]);
    setVentas([]);
    setGastos([]);
    setInversiones([]);
    limpiarCompraForm();
    limpiarVentaForm();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerBrand}>
          <div style={s.headerLogo}>EST</div>
          <div>
            <div style={s.headerName}>Estantek</div>
            <div style={s.headerSub}>Sistema operativo interno</div>
          </div>
        </div>
        <nav style={s.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setPagina(item.id)}
              style={{ ...s.navBtn, ...(pagina === item.id ? s.navBtnActive : {}) }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button style={s.resetBtn} onClick={reiniciarTodo} title="Reiniciar sistema">
          ↺ Reiniciar
        </button>
      </header>

      <main style={s.main}>

        {/* ── Dashboard ── */}
        {pagina === "Dashboard" && (
          <div style={s.section}>
            <SectionHeader
              title="Dashboard"
              subtitle={`Hoy ${new Date().toLocaleDateString("es-CO", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}`}
            />

            {/* KPIs primarios */}
            <div style={s.kpiGrid4}>
              <KpiCard
                label="Ventas totales"
                value={money(resumen.totalVentas)}
                sub={`${ventas.length} transacciones`}
                accent="#3b82f6"
                icon="⬆"
              />
              <KpiCard
                label="Utilidad neta"
                value={money(resumen.utilidadNeta)}
                sub={`Margen ${resumen.margenNeto.toFixed(1)}%`}
                accent={resumen.utilidadNeta >= 0 ? "#10b981" : "#ef4444"}
                icon="◎"
                highlight={resumen.utilidadNeta >= 0 ? "positive" : "negative"}
              />
              <KpiCard
                label="Valor inventario"
                value={money(resumen.valorInventario)}
                sub={`${resumen.skusConStock} SKUs con stock`}
                accent="#8b5cf6"
                icon="⊞"
              />
              <KpiCard
                label="Caja teórica"
                value={money(resumen.cajaTeorica)}
                sub="Inversiones + ventas − compras − gastos"
                accent={resumen.cajaTeorica >= 0 ? "#10b981" : "#ef4444"}
                icon="◈"
                highlight={resumen.cajaTeorica >= 0 ? "positive" : "negative"}
              />
            </div>

            {/* KPIs secundarios */}
            <div style={s.kpiGrid4}>
              <KpiCard label="Compras" value={money(resumen.totalCompras)} sub={`${compras.length} órdenes`} accent="#f97316" icon="⬇" size="sm" />
              <KpiCard label="Utilidad bruta" value={money(resumen.utilidadBruta)} sub={`Margen ${resumen.margenBruto.toFixed(1)}%`} accent="#10b981" size="sm" />
              <KpiCard label="Gastos operativos" value={money(resumen.totalGastos)} sub={`${gastos.length} registros`} accent="#ef4444" icon="◉" size="sm" />
              <KpiCard label="Capital aportado" value={money(resumen.totalInversiones)} sub={`${inversiones.length} aportes`} accent="#6366f1" icon="⊕" size="sm" />
            </div>

            <div style={s.twoCol}>
              {/* Ventas por origen */}
              <Panel title="Ventas por origen">
                {Object.keys(resumen.ventasPorOrigen).length === 0 ? (
                  <EmptyState text="Sin ventas registradas aún." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {Object.entries(resumen.ventasPorOrigen).map(([origen, valor]) => (
                      <div key={origen} style={s.origenRow}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <OrigenBadge origen={origen} />
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{origen}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>{money(valor)}</div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>{pct(valor, resumen.totalVentas)} del total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Estado del negocio */}
              <Panel title="Estado financiero">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <FinRow label="Ingresos por ventas" value={money(resumen.totalVentas)} />
                  <FinRow label="Costo de ventas" value={money(resumen.totalCostosVenta)} type="cost" />
                  <div style={s.finDivider} />
                  <FinRow label="Utilidad bruta" value={money(resumen.utilidadBruta)} bold sub={pct(resumen.utilidadBruta, resumen.totalVentas)} type={resumen.utilidadBruta >= 0 ? "profit" : "loss"} />
                  <FinRow label="Gastos operativos" value={money(resumen.totalGastos)} type="cost" />
                  <div style={s.finDivider} />
                  <FinRow label="Utilidad neta" value={money(resumen.utilidadNeta)} bold sub={pct(resumen.utilidadNeta, resumen.totalVentas)} type={resumen.utilidadNeta >= 0 ? "profit" : "loss"} />
                </div>
              </Panel>
            </div>

            {/* Alertas */}
            {(resumen.skusCriticos > 0 || ventas.length === 0) && (
              <Panel title="Alertas">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {resumen.skusCriticos > 0 && (
                    <Alert
                      type="warning"
                      title={`${resumen.skusCriticos} SKU${resumen.skusCriticos > 1 ? "s" : ""} con stock crítico`}
                      text="Productos con 1–2 unidades disponibles. Considera reabastecer antes de recibir pedidos."
                    />
                  )}
                  {ventas.length === 0 && (
                    <Alert
                      type="info"
                      title="Sin ventas registradas"
                      text="Registra tu primera venta en el módulo de Ventas para ver métricas de rentabilidad."
                    />
                  )}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── Inventario ── */}
        {pagina === "Inventario" && (
          <div style={s.section}>
            <SectionHeader
              title="Inventario"
              subtitle={`${inventarioFiltrado.length} productos · valor total ${money(resumen.valorInventario)}`}
            />

            <Panel>
              {/* Search + filters */}
              <div style={s.inventarioControls}>
                <input
                  style={s.searchInput}
                  placeholder="Buscar por SKU, nombre o categoría..."
                  value={busquedaInventario}
                  onChange={(e) => setBusquedaInventario(e.target.value)}
                />
                <div style={s.categoryPills}>
                  {categoriasUnicas.map((cat) => (
                    <button
                      key={cat}
                      style={{
                        ...s.categoryPill,
                        ...(filtroCategoria === cat ? s.categoryPillActive : {}),
                      }}
                      onClick={() => setFiltroCategoria(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inventory table */}
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["SKU", "Producto", "Categoría", "Tipo", "Stock", "Costo prom.", "Valor stock"].map((h) => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventarioFiltrado.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ ...s.td, textAlign: "center", padding: 32, color: "#94a3b8" }}>
                          No hay productos con ese filtro.
                        </td>
                      </tr>
                    ) : (
                      inventarioFiltrado.map((item, i) => (
                        <tr key={item.sku} style={i % 2 === 0 ? {} : { background: "#f8fafc" }}>
                          <td style={{ ...s.td, ...s.tdMono }}>{item.sku}</td>
                          <td style={s.td}>{item.nombre}</td>
                          <td style={s.td}>
                            <CategoriaBadge cat={item.categoria} />
                          </td>
                          <td style={s.td}>
                            <OrigenBadge origen={item.tipo} />
                          </td>
                          <td style={s.td}>
                            <StockBadge stock={item.stock} tipo={item.tipo} />
                          </td>
                          <td style={{ ...s.td, fontWeight: 700 }}>{item.costo > 0 ? money(item.costo) : <span style={{ color: "#94a3b8" }}>Sin costo</span>}</td>
                          <td style={{ ...s.td, fontWeight: 700 }}>
                            {item.stock > 0 ? money(item.stock * item.costo) : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ── Compras ── */}
        {pagina === "Compras" && (
          <div style={s.pageGrid}>
            {/* Formulario */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Panel title={editingCompraId ? "✎ Editando compra" : "Nueva compra"}>
                {editingCompraId && (
                  <div style={s.editingBanner}>
                    Estás editando una compra existente. El inventario se recalcula automáticamente.
                  </div>
                )}

                <FormSection label="Datos generales">
                  <FormGrid>
                    <Field label="Fecha">
                      <input type="date" style={s.input} value={formCompra.fecha}
                        onChange={(e) => setFormCompra({ ...formCompra, fecha: e.target.value })} />
                    </Field>
                    <Field label="Proveedor">
                      <input style={s.input} placeholder="Fábrica o proveedor" value={formCompra.proveedor}
                        onChange={(e) => setFormCompra({ ...formCompra, proveedor: e.target.value })} />
                    </Field>
                    <Field label="Flete / adicional">
                      <input type="number" style={s.input} value={formCompra.flete}
                        onChange={(e) => setFormCompra({ ...formCompra, flete: e.target.value })} />
                    </Field>
                    <Field label="Nota">
                      <input style={s.input} placeholder="Observación" value={formCompra.descripcion}
                        onChange={(e) => setFormCompra({ ...formCompra, descripcion: e.target.value })} />
                    </Field>
                  </FormGrid>
                </FormSection>

                <FormSection label="Agregar producto">
                  <FormGrid>
                    <Field label="SKU / Producto" wide>
                      <select style={s.input} value={compraLinea.sku}
                        onChange={(e) => setCompraLinea({ ...compraLinea, sku: e.target.value })}>
                        {catalogo.map((p) => (
                          <option key={p.sku} value={p.sku}>{p.sku} · {p.nombre}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cantidad">
                      <input type="number" style={s.input} value={compraLinea.cantidad}
                        onChange={(e) => setCompraLinea({ ...compraLinea, cantidad: e.target.value })} />
                    </Field>
                    <Field label="Costo unitario">
                      <input type="number" style={s.input} value={compraLinea.costoUnitario}
                        onChange={(e) => setCompraLinea({ ...compraLinea, costoUnitario: e.target.value })} />
                    </Field>
                  </FormGrid>
                  <button style={s.addLineBtn} onClick={agregarLineaCompra}>+ Agregar ítem</button>
                </FormSection>

                {/* Items list */}
                {compraItems.length === 0 ? (
                  <EmptyState text="Agrega al menos un producto a esta compra." icon="📦" />
                ) : (
                  <div style={s.itemsList}>
                    {compraItems.map((item) => (
                      <div key={item.id} style={s.itemRow}>
                        <div style={s.itemRowLeft}>
                          <span style={{ ...s.tdMono, fontSize: 13, color: "#64748b" }}>{item.sku}</span>
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{item.producto}</span>
                          <span style={{ fontSize: 13, color: "#64748b" }}>{item.cantidad} und · {money(item.costoUnitario)} c/u</span>
                        </div>
                        <div style={s.itemRowRight}>
                          <span style={{ fontWeight: 900, color: "#0f172a" }}>{money(item.subtotal)}</span>
                          <button style={s.removeBtn} onClick={() => eliminarLineaCompra(item.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Running total */}
                {compraItems.length > 0 && (
                  <div style={s.totalBox}>
                    <div style={s.totalRow}>
                      <span>Subtotal productos</span>
                      <span>{money(compraResumenVivo.subtotal)}</span>
                    </div>
                    {compraResumenVivo.flete > 0 && (
                      <div style={s.totalRow}>
                        <span>Flete</span>
                        <span>{money(compraResumenVivo.flete)}</span>
                      </div>
                    )}
                    <div style={{ ...s.totalRow, ...s.totalRowFinal }}>
                      <span>Total compra</span>
                      <span>{money(compraResumenVivo.total)}</span>
                    </div>
                  </div>
                )}

                <div style={s.formActions}>
                  <button
                    style={{ ...s.primaryBtn, ...(!formCompra.proveedor || compraItems.length === 0 ? s.btnDisabled : {}) }}
                    onClick={guardarCompra}
                  >
                    {editingCompraId ? "Guardar cambios" : "Registrar compra"}
                  </button>
                  {editingCompraId && (
                    <button style={s.cancelBtn} onClick={limpiarCompraForm}>Cancelar edición</button>
                  )}
                </div>
              </Panel>
            </div>

            {/* Historial */}
            <Panel title={`Historial de compras (${compras.length})`}>
              {compras.length === 0 ? (
                <EmptyState text="No hay compras registradas." icon="📋" />
              ) : (
                <div style={s.histList}>
                  {compras.map((item) => (
                    <div key={item.id} style={s.histCard}>
                      <div style={s.histCardTop}>
                        <div>
                          <div style={s.histCardTitle}>{item.proveedor || "Sin proveedor"}</div>
                          <div style={s.histCardMeta}>{item.fecha} · {item.items.length} ítem{item.items.length !== 1 ? "s" : ""}</div>
                          {item.descripcion && <div style={s.histCardDesc}>{item.descripcion}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={s.histCardAmount}>{money(item.total)}</div>
                          {item.flete > 0 && <div style={s.histCardSub}>inc. flete {money(item.flete)}</div>}
                        </div>
                      </div>
                      <div style={s.histCardSkus}>
                        {item.items.map((x) => (
                          <span key={x.id} style={s.skuPill}>{x.sku} ×{x.cantidad}</span>
                        ))}
                      </div>
                      <div style={s.histCardActions}>
                        <button style={s.editBtn} onClick={() => editarCompra(item)}>✎ Editar</button>
                        <button style={s.deleteBtn} onClick={() => eliminarCompra(item.id)}>✕ Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* ── Ventas ── */}
        {pagina === "Ventas" && (
          <div style={s.pageGrid}>
            {/* Formulario */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Panel title={editingVentaId ? "✎ Editando venta" : "Nueva venta"}>
                {editingVentaId && (
                  <div style={s.editingBanner}>
                    Estás editando una venta existente. El inventario se recalcula automáticamente.
                  </div>
                )}

                <FormSection label="Datos generales">
                  <FormGrid>
                    <Field label="Fecha">
                      <input type="date" style={s.input} value={formVenta.fecha}
                        onChange={(e) => setFormVenta({ ...formVenta, fecha: e.target.value })} />
                    </Field>
                    <Field label="Cliente">
                      <input style={s.input} placeholder="Nombre del cliente" value={formVenta.cliente}
                        onChange={(e) => setFormVenta({ ...formVenta, cliente: e.target.value })} />
                    </Field>
                    <Field label="Origen">
                      <select style={s.input} value={formVenta.origen}
                        onChange={(e) => setFormVenta({ ...formVenta, origen: e.target.value })}>
                        <option value="Inventario propio">Inventario propio</option>
                        <option value="Reventa">Reventa (Comerinvrc)</option>
                        <option value="Bajo pedido">Bajo pedido</option>
                      </select>
                    </Field>
                    <Field label="IVA">
                      <input type="number" style={s.input} placeholder="0" value={formVenta.iva}
                        onChange={(e) => setFormVenta({ ...formVenta, iva: e.target.value })} />
                    </Field>
                    <Field label="Nota" wide>
                      <input style={s.input} placeholder="Observación general" value={formVenta.descripcion}
                        onChange={(e) => setFormVenta({ ...formVenta, descripcion: e.target.value })} />
                    </Field>
                  </FormGrid>
                  {formVenta.origen && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
                      <OrigenBadge origen={formVenta.origen} />
                      {formVenta.origen === "Inventario propio" && "Descontará stock al guardar."}
                      {formVenta.origen === "Reventa" && "No afecta stock propio. Margen sobre compra a Comerinvrc."}
                      {formVenta.origen === "Bajo pedido" && "No afecta stock propio. Producto fabricado o comprado específicamente."}
                    </div>
                  )}
                </FormSection>

                <FormSection label="Agregar producto">
                  <FormGrid>
                    <Field label="SKU / Producto" wide>
                      <select style={s.input} value={ventaLinea.sku}
                        onChange={(e) => setVentaLinea({ ...ventaLinea, sku: e.target.value })}>
                        {catalogo.map((p) => (
                          <option key={p.sku} value={p.sku}>{p.sku} · {p.nombre}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cantidad">
                      <input type="number" style={s.input} value={ventaLinea.cantidad}
                        onChange={(e) => setVentaLinea({ ...ventaLinea, cantidad: e.target.value })} />
                    </Field>
                    <Field label="Precio unitario">
                      <input type="number" style={s.input} value={ventaLinea.precioUnitario}
                        onChange={(e) => setVentaLinea({ ...ventaLinea, precioUnitario: e.target.value })} />
                    </Field>
                    <Field label="Costo unitario">
                      <input type="number" style={s.input} placeholder={`Auto: ${money(catalogoMap[ventaLinea.sku]?.costo || 0)}`} value={ventaLinea.costoUnitario}
                        onChange={(e) => setVentaLinea({ ...ventaLinea, costoUnitario: e.target.value })} />
                    </Field>
                  </FormGrid>
                  <button style={s.addLineBtn} onClick={agregarLineaVenta}>+ Agregar ítem</button>
                </FormSection>

                {/* Items */}
                {ventaItems.length === 0 ? (
                  <EmptyState text="Agrega al menos un producto a esta venta." icon="🏷️" />
                ) : (
                  <div style={s.itemsList}>
                    {ventaItems.map((item) => (
                      <div key={item.id} style={s.itemRow}>
                        <div style={s.itemRowLeft}>
                          <span style={{ ...s.tdMono, fontSize: 13, color: "#64748b" }}>{item.sku}</span>
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{item.producto}</span>
                          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                            <span style={{ color: "#64748b" }}>{item.cantidad} und · {money(item.precioUnitario)}</span>
                            <span style={{ color: item.utilidad >= 0 ? "#059669" : "#dc2626", fontWeight: 700 }}>
                              Utilidad {money(item.utilidad)} ({pct(item.utilidad, item.subtotalVenta)})
                            </span>
                          </div>
                        </div>
                        <div style={s.itemRowRight}>
                          <span style={{ fontWeight: 900, color: "#0f172a" }}>{money(item.subtotalVenta)}</span>
                          <button style={s.removeBtn} onClick={() => eliminarLineaVenta(item.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Running total */}
                {ventaItems.length > 0 && (
                  <div style={s.totalBox}>
                    <div style={s.totalRow}>
                      <span>Subtotal</span>
                      <span>{money(ventaResumenVivo.subtotal)}</span>
                    </div>
                    <div style={s.totalRow}>
                      <span>Costo total</span>
                      <span style={{ color: "#ef4444" }}>{money(ventaResumenVivo.costo)}</span>
                    </div>
                    {ventaResumenVivo.iva > 0 && (
                      <div style={s.totalRow}>
                        <span>IVA</span>
                        <span>{money(ventaResumenVivo.iva)}</span>
                      </div>
                    )}
                    <div style={{ ...s.totalRow, ...s.totalRowFinal }}>
                      <span>Total</span>
                      <span>{money(ventaResumenVivo.total)}</span>
                    </div>
                    <div style={{ ...s.totalRow, borderTop: "1px solid #e2e8f0", paddingTop: 8, color: ventaResumenVivo.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                      <span style={{ fontWeight: 700 }}>Utilidad</span>
                      <span style={{ fontWeight: 900 }}>
                        {money(ventaResumenVivo.utilidad)} · {ventaResumenVivo.margen.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                <div style={s.formActions}>
                  <button
                    style={{ ...s.primaryBtn, ...(!formVenta.cliente || ventaItems.length === 0 ? s.btnDisabled : {}) }}
                    onClick={guardarVenta}
                  >
                    {editingVentaId ? "Guardar cambios" : "Registrar venta"}
                  </button>
                  {editingVentaId && (
                    <button style={s.cancelBtn} onClick={limpiarVentaForm}>Cancelar edición</button>
                  )}
                </div>
              </Panel>
            </div>

            {/* Historial ventas */}
            <Panel title={`Historial de ventas (${ventas.length})`}>
              {ventas.length === 0 ? (
                <EmptyState text="No hay ventas registradas." icon="📋" />
              ) : (
                <div style={s.histList}>
                  {ventas.map((item) => (
                    <div key={item.id} style={s.histCard}>
                      <div style={s.histCardTop}>
                        <div>
                          <div style={s.histCardTitle}>{item.cliente}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                            <span style={s.histCardMeta}>{item.fecha}</span>
                            <OrigenBadge origen={item.origen} />
                          </div>
                          {item.descripcion && <div style={s.histCardDesc}>{item.descripcion}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={s.histCardAmount}>{money(item.total)}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: item.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                            {money(item.utilidad)} ({pct(item.utilidad, item.subtotal)})
                          </div>
                        </div>
                      </div>
                      <div style={s.histCardSkus}>
                        {item.items.map((x) => (
                          <span key={x.id} style={s.skuPill}>{x.sku} ×{x.cantidad}</span>
                        ))}
                      </div>
                      <div style={s.histCardActions}>
                        <button style={s.editBtn} onClick={() => editarVenta(item)}>✎ Editar</button>
                        <button style={s.deleteBtn} onClick={() => eliminarVenta(item.id)}>✕ Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* ── Gastos ── */}
        {pagina === "Gastos" && (
          <div style={s.pageGrid}>
            <Panel title="Registrar gasto">
              <FormGrid>
                <Field label="Fecha">
                  <input type="date" style={s.input} value={formGasto.fecha}
                    onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })} />
                </Field>
                <Field label="Categoría">
                  <select style={s.input} value={formGasto.categoria}
                    onChange={(e) => setFormGasto({ ...formGasto, categoria: e.target.value })}>
                    {["Financiero","Publicidad","Dominio web","Transporte","Herramientas","Administrativo","Otro"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Valor">
                  <input type="number" style={s.input} value={formGasto.valor}
                    onChange={(e) => setFormGasto({ ...formGasto, valor: e.target.value })} />
                </Field>
                <Field label="Descripción" wide>
                  <input style={s.input} placeholder="Ej: 4x1000, Meta Ads, dominio .co..." value={formGasto.descripcion}
                    onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })} />
                </Field>
              </FormGrid>
              <div style={s.formActions}>
                <button style={s.darkBtn} onClick={registrarGasto}>Registrar gasto</button>
              </div>
            </Panel>

            <Panel title={`Gastos registrados (${gastos.length})`}>
              {Object.keys(resumen.gastosPorCategoria).length > 0 && (
                <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(resumen.gastosPorCategoria)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, val]) => (
                      <div key={cat} style={s.gastoCatPill}>
                        <span style={{ fontWeight: 700 }}>{cat}</span>
                        <span style={{ color: "#ef4444", fontWeight: 900 }}>{money(val)}</span>
                      </div>
                    ))}
                </div>
              )}
              {gastos.length === 0 ? (
                <EmptyState text="No hay gastos registrados." icon="💸" />
              ) : (
                <div style={s.histList}>
                  {gastos.map((item) => (
                    <div key={item.id} style={s.histCard}>
                      <div style={s.histCardTop}>
                        <div>
                          <div style={s.histCardTitle}>{item.categoria}</div>
                          <div style={s.histCardMeta}>{item.fecha}</div>
                          {item.descripcion && <div style={s.histCardDesc}>{item.descripcion}</div>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                          <div style={{ ...s.histCardAmount, color: "#dc2626" }}>{money(item.valor)}</div>
                          <button style={s.deleteBtn} onClick={() => eliminarGasto(item.id)}>✕ Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* ── Inversiones ── */}
        {pagina === "Inversiones" && (
          <div style={s.pageGrid}>
            <Panel title="Registrar aporte de socio">
              <div style={s.socioCards}>
                {[
                  { socio: "Raúl", pct: "40%", desc: "Socio fundador" },
                  { socio: "Nicolás y Luisa", pct: "60%", desc: "Socios mayoritarios" },
                ].map((sc) => (
                  <div key={sc.socio} style={{
                    ...s.socioCard,
                    ...(formInversion.socio === sc.socio ? s.socioCardActive : {}),
                  }}
                    onClick={() => setFormInversion({ ...formInversion, socio: sc.socio })}>
                    <div style={s.socioPct}>{sc.pct}</div>
                    <div style={s.socioName}>{sc.socio}</div>
                    <div style={s.socioDesc}>{sc.desc}</div>
                  </div>
                ))}
              </div>
              <FormGrid>
                <Field label="Fecha">
                  <input type="date" style={s.input} value={formInversion.fecha}
                    onChange={(e) => setFormInversion({ ...formInversion, fecha: e.target.value })} />
                </Field>
                <Field label="Monto aportado">
                  <input type="number" style={s.input} value={formInversion.valor}
                    onChange={(e) => setFormInversion({ ...formInversion, valor: e.target.value })} />
                </Field>
                <Field label="Descripción" wide>
                  <input style={s.input} placeholder="Ej: capital para compra inicial" value={formInversion.descripcion}
                    onChange={(e) => setFormInversion({ ...formInversion, descripcion: e.target.value })} />
                </Field>
              </FormGrid>
              <div style={s.formActions}>
                <button style={s.primaryBtn} onClick={registrarInversion}>Registrar aporte</button>
              </div>
            </Panel>

            <Panel title={`Historial de aportes (${inversiones.length})`}>
              {/* Resumen por socio */}
              {inversiones.length > 0 && (
                <div style={s.socioSummary}>
                  {["Raúl", "Nicolás y Luisa"].map((socio) => {
                    const total = inversiones.filter((i) => i.socio === socio).reduce((a, x) => a + x.valor, 0);
                    return (
                      <div key={socio} style={s.socioSummaryRow}>
                        <span style={{ fontWeight: 700 }}>{socio}</span>
                        <span style={{ fontWeight: 900, color: "#6366f1" }}>{money(total)}</span>
                      </div>
                    );
                  })}
                  <div style={{ ...s.socioSummaryRow, borderTop: "1px solid #e2e8f0", paddingTop: 8, fontWeight: 900 }}>
                    <span>Total capital</span>
                    <span style={{ color: "#0f172a" }}>{money(resumen.totalInversiones)}</span>
                  </div>
                </div>
              )}
              {inversiones.length === 0 ? (
                <EmptyState text="No hay aportes registrados." icon="💰" />
              ) : (
                <div style={s.histList}>
                  {inversiones.map((item) => (
                    <div key={item.id} style={s.histCard}>
                      <div style={s.histCardTop}>
                        <div>
                          <div style={s.histCardTitle}>{item.socio}</div>
                          <div style={s.histCardMeta}>{item.fecha}</div>
                          {item.descripcion && <div style={s.histCardDesc}>{item.descripcion}</div>}
                        </div>
                        <div style={{ ...s.histCardAmount, color: "#6366f1" }}>{money(item.valor)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* ── Rentabilidad / Costos ── */}
        {pagina === "Costos" && (
          <div style={s.section}>
            <SectionHeader title="Rentabilidad" subtitle="Análisis de márgenes, costos y utilidades por venta" />

            {/* Métricas principales */}
            <div style={s.kpiGrid4}>
              <KpiCard label="Ventas totales" value={money(resumen.totalVentas)} accent="#3b82f6" />
              <KpiCard
                label="Utilidad bruta"
                value={money(resumen.utilidadBruta)}
                sub={`Margen ${resumen.margenBruto.toFixed(1)}%`}
                accent={resumen.utilidadBruta >= 0 ? "#10b981" : "#ef4444"}
                highlight={resumen.utilidadBruta >= 0 ? "positive" : "negative"}
              />
              <KpiCard
                label="Utilidad neta"
                value={money(resumen.utilidadNeta)}
                sub={`Margen ${resumen.margenNeto.toFixed(1)}%`}
                accent={resumen.utilidadNeta >= 0 ? "#10b981" : "#ef4444"}
                highlight={resumen.utilidadNeta >= 0 ? "positive" : "negative"}
              />
              <KpiCard label="Gastos operativos" value={money(resumen.totalGastos)} sub="Impactan utilidad neta" accent="#f59e0b" />
            </div>

            <div style={s.twoCol}>
              {/* Estado P&L */}
              <Panel title="Estado de resultados">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <FinRow label="(+) Ingresos por ventas" value={money(resumen.totalVentas)} />
                  <FinRow label="(−) Costo de ventas" value={money(resumen.totalCostosVenta)} type="cost" />
                  <div style={s.finDivider} />
                  <FinRow
                    label="= Utilidad bruta"
                    value={money(resumen.utilidadBruta)}
                    bold
                    sub={`Margen bruto: ${resumen.margenBruto.toFixed(1)}%`}
                    type={resumen.utilidadBruta >= 0 ? "profit" : "loss"}
                  />
                  <FinRow label="(−) Gastos operativos" value={money(resumen.totalGastos)} type="cost" />
                  <div style={s.finDivider} />
                  <FinRow
                    label="= Utilidad neta"
                    value={money(resumen.utilidadNeta)}
                    bold
                    sub={`Margen neto: ${resumen.margenNeto.toFixed(1)}%`}
                    type={resumen.utilidadNeta >= 0 ? "profit" : "loss"}
                  />
                </div>
              </Panel>

              {/* Gastos por categoría */}
              <Panel title="Gastos por categoría">
                {Object.keys(resumen.gastosPorCategoria).length === 0 ? (
                  <EmptyState text="Sin gastos registrados." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(resumen.gastosPorCategoria)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, val]) => (
                        <div key={cat} style={s.origenRow}>
                          <span style={{ fontWeight: 700 }}>{cat}</span>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 900, color: "#dc2626" }}>{money(val)}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>{pct(val, resumen.totalGastos)} del total</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* Detalle de ventas */}
            <Panel title="Detalle de ventas">
              {ventas.length === 0 ? (
                <EmptyState text="Sin ventas registradas." icon="📊" />
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Fecha", "Cliente", "Origen", "Ítems", "Total venta", "Costo", "Utilidad", "Margen"].map((h) => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.map((item, i) => {
                        const margen = item.subtotal > 0 ? (item.utilidad / item.subtotal) * 100 : 0;
                        return (
                          <tr key={item.id} style={i % 2 === 0 ? {} : { background: "#f8fafc" }}>
                            <td style={s.td}>{item.fecha}</td>
                            <td style={{ ...s.td, fontWeight: 700 }}>{item.cliente}</td>
                            <td style={s.td}><OrigenBadge origen={item.origen} /></td>
                            <td style={{ ...s.td, color: "#64748b" }}>{item.items.length}</td>
                            <td style={{ ...s.td, fontWeight: 700 }}>{money(item.total)}</td>
                            <td style={{ ...s.td, color: "#ef4444" }}>{money(item.costoTotal)}</td>
                            <td style={{ ...s.td, fontWeight: 700, color: item.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                              {money(item.utilidad)}
                            </td>
                            <td style={{ ...s.td, fontWeight: 700, color: margen >= 20 ? "#059669" : margen >= 10 ? "#d97706" : "#dc2626" }}>
                              {margen.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{title}</h2>
      {subtitle && <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>{subtitle}</p>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={s.panel}>
      {title && <h3 style={s.panelTitle}>{title}</h3>}
      {children}
    </div>
  );
}

function FormSection({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={s.formSectionLabel}>{label}</div>
      {children}
    </div>
  );
}

function FormGrid({ children }) {
  return <div style={s.formGrid}>{children}</div>;
}

function Field({ label, children, wide = false }) {
  return (
    <div style={wide ? { ...s.field, gridColumn: "1 / -1" } : s.field}>
      <span style={s.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, accent = "#0f172a", icon, size = "md", highlight }) {
  const isNeg = highlight === "negative";
  const isPos = highlight === "positive";
  return (
    <div style={{
      ...s.kpiCard,
      borderTop: `3px solid ${accent}`,
      ...(isNeg ? { background: "#fff1f2" } : {}),
      ...(isPos && size === "md" ? { background: "#f0fdf4" } : {}),
    }}>
      <div style={s.kpiLabel}>
        {icon && <span style={{ marginRight: 6, opacity: 0.7 }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        ...s.kpiValue,
        fontSize: size === "sm" ? 20 : 28,
        color: isNeg ? "#dc2626" : isPos ? "#059669" : "#0f172a",
      }}>
        {value}
      </div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  );
}

function FinRow({ label, value, sub, type, bold }) {
  const color = type === "profit" ? "#059669" : type === "loss" ? "#dc2626" : type === "cost" ? "#ef4444" : "#0f172a";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "2px 0" }}>
      <div>
        <span style={{ fontSize: 14, color: "#334155", fontWeight: bold ? 700 : 500 }}>{label}</span>
        {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontWeight: bold ? 900 : 700, fontSize: bold ? 18 : 15, color }}>{value}</span>
    </div>
  );
}

function OrigenBadge({ origen }) {
  const c = ORIGEN_COLORS[origen] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ ...s.badge, background: c.bg, color: c.color }}>{origen}</span>
  );
}

function CategoriaBadge({ cat }) {
  const c = CATEGORIA_COLORS[cat] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ ...s.badge, background: c.bg, color: c.color }}>{cat}</span>
  );
}

function StockBadge({ stock, tipo }) {
  if (tipo === "Servicio") return <span style={{ ...s.badge, background: "#f0fdf4", color: "#166534" }}>Servicio</span>;
  if (tipo === "Bajo pedido") return <span style={{ ...s.badge, background: "#f3e8ff", color: "#6b21a8" }}>Bajo pedido</span>;
  if (stock === 0) return <span style={{ ...s.badge, background: "#fee2e2", color: "#991b1b" }}>Agotado</span>;
  if (stock <= 2) return <span style={{ ...s.badge, background: "#fef3c7", color: "#92400e" }}>Crítico · {stock}</span>;
  return <span style={{ ...s.badge, background: "#d1fae5", color: "#065f46" }}>{stock} und</span>;
}

function EmptyState({ text, icon }) {
  return (
    <div style={s.emptyState}>
      {icon && <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>{icon}</div>}
      <div>{text}</div>
    </div>
  );
}

function Alert({ type, title, text }) {
  const colors = {
    warning: { bg: "#fffbeb", border: "#fcd34d", titleColor: "#92400e", textColor: "#b45309" },
    info: { bg: "#eff6ff", border: "#93c5fd", titleColor: "#1e40af", textColor: "#2563eb" },
    error: { bg: "#fef2f2", border: "#fca5a5", titleColor: "#991b1b", textColor: "#dc2626" },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ fontWeight: 700, color: c.titleColor, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: c.textColor }}>{text}</div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#0f172a",
  },
  header: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "white",
    padding: "0 28px",
    height: 64,
    display: "flex",
    alignItems: "center",
    gap: 20,
    boxShadow: "0 4px 20px rgba(15,23,42,0.25)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerBrand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
    marginRight: 8,
  },
  headerLogo: {
    background: "#f97316",
    color: "white",
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: "0.1em",
    borderRadius: 8,
    padding: "6px 9px",
  },
  headerName: {
    fontWeight: 800,
    fontSize: 15,
    color: "white",
    lineHeight: 1.2,
  },
  headerSub: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 1,
  },
  nav: {
    display: "flex",
    gap: 2,
    flex: 1,
    overflowX: "auto",
  },
  navBtn: {
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    borderRadius: 8,
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  navBtnActive: {
    background: "#f97316",
    color: "white",
  },
  navIcon: {
    fontSize: 14,
    opacity: 0.8,
  },
  resetBtn: {
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "#94a3b8",
    borderRadius: 8,
    padding: "7px 12px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 12,
    flexShrink: 0,
  },
  main: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "28px 24px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  pageGrid: {
    display: "grid",
    gridTemplateColumns: "440px 1fr",
    gap: 20,
    alignItems: "start",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  kpiGrid4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
  },
  kpiCard: {
    background: "white",
    borderRadius: 16,
    padding: "18px 20px",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)",
    border: "1px solid #e2e8f0",
    borderTop: "3px solid #e2e8f0",
  },
  kpiLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.1,
  },
  kpiSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 6,
  },
  panel: {
    background: "white",
    borderRadius: 16,
    padding: "22px 24px",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)",
    border: "1px solid #e2e8f0",
  },
  panelTitle: {
    margin: "0 0 18px",
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#94a3b8",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #f1f5f9",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    letterSpacing: "0.02em",
  },
  input: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "white",
    boxSizing: "border-box",
    width: "100%",
    color: "#0f172a",
    transition: "border-color 0.15s",
  },
  addLineBtn: {
    marginTop: 12,
    border: "1.5px dashed #cbd5e1",
    background: "transparent",
    color: "#475569",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
    width: "100%",
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 14px",
    gap: 12,
  },
  itemRowLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  itemRowRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  removeBtn: {
    border: "none",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: 6,
    padding: "5px 8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },
  totalBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px",
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#334155",
  },
  totalRowFinal: {
    fontWeight: 900,
    fontSize: 16,
    color: "#0f172a",
    borderTop: "1px solid #e2e8f0",
    paddingTop: 8,
  },
  formActions: {
    marginTop: 18,
    display: "flex",
    gap: 10,
    flexDirection: "column",
  },
  primaryBtn: {
    border: "none",
    borderRadius: 10,
    padding: "13px 16px",
    background: "#f97316",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 14,
    width: "100%",
  },
  darkBtn: {
    border: "none",
    borderRadius: 10,
    padding: "13px 16px",
    background: "#0f172a",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 14,
    width: "100%",
  },
  cancelBtn: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "11px 16px",
    background: "white",
    color: "#475569",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
    width: "100%",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  editingBanner: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#1d4ed8",
    marginBottom: 16,
  },
  editBtn: {
    border: "none",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  deleteBtn: {
    border: "none",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  histList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  histCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  histCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  histCardTitle: {
    fontWeight: 800,
    fontSize: 15,
    color: "#0f172a",
  },
  histCardMeta: {
    fontSize: 13,
    color: "#94a3b8",
  },
  histCardDesc: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  histCardAmount: {
    fontWeight: 900,
    fontSize: 18,
    color: "#0f172a",
  },
  histCardSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  histCardSkus: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  histCardActions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  skuPill: {
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "monospace",
  },
  badge: {
    display: "inline-block",
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 12,
    fontWeight: 700,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
    minWidth: 600,
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    borderBottom: "1px solid #e2e8f0",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
    color: "#334155",
    verticalAlign: "middle",
  },
  tdMono: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#64748b",
  },
  inventarioControls: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    background: "#f8fafc",
    width: "100%",
    boxSizing: "border-box",
  },
  categoryPills: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  categoryPill: {
    border: "1px solid #e2e8f0",
    background: "white",
    color: "#475569",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  categoryPillActive: {
    background: "#0f172a",
    border: "1px solid #0f172a",
    color: "white",
  },
  origenRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    background: "#f8fafc",
    borderRadius: 10,
    border: "1px solid #f1f5f9",
  },
  finDivider: {
    height: 1,
    background: "#e2e8f0",
    margin: "2px 0",
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
    color: "#94a3b8",
    fontSize: 14,
    border: "1px dashed #e2e8f0",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  gastoCatPill: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  socioCards: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 20,
  },
  socioCard: {
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px",
    cursor: "pointer",
    background: "#f8fafc",
    transition: "all 0.15s",
  },
  socioCardActive: {
    border: "2px solid #6366f1",
    background: "#eef2ff",
  },
  socioPct: {
    fontSize: 22,
    fontWeight: 900,
    color: "#6366f1",
    marginBottom: 4,
  },
  socioName: {
    fontWeight: 700,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 2,
  },
  socioDesc: {
    fontSize: 12,
    color: "#94a3b8",
  },
  socioSummary: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  socioSummaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#334155",
  },
};
