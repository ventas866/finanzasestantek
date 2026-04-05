import { useMemo, useState } from "react";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { money, pct, isoMonth, lastNMonths, monthLabel } from "../utils.js";
import { Panel, KpiCard, FinRow, OrigenBadge, EmptyState, Divider } from "../ui.jsx";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  brand:      "#E65100",
  brandLight: "#FFF3E0",
  positive:   "#2E7D32",
  posBg:      "#E8F5E9",
  negative:   "#C62828",
  negBg:      "#FFEBEE",
  ink:        "#1A1A1A",
  ink3:       "#616161",
  ink4:       "#9E9E9E",
  border:     "#EEEEEE",
  border2:    "#E0E0E0",
  bg:         "#F5F5F5",
};

const PIE_COLORS = ["#E65100","#1976D2","#7B1FA2","#2E7D32","#D81B60","#00838F"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function trendPct(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function prevMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthLabel() {
  const d = new Date();
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────
function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipBox}>
      <div style={tooltipLabel}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:20, marginTop:4 }}>
          <span style={{ color:p.color, fontWeight:600, fontSize:12 }}>{p.name}</span>
          <span style={{ color:"white", fontWeight:700, fontSize:13 }}>{money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={tooltipBox}>
      <div style={{ color:item.payload.fill, fontWeight:700, marginBottom:4 }}>{item.name}</div>
      <div style={{ color:"white", fontWeight:700 }}>{money(item.value)}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard({ compras, ventas, gastos, inversiones, catalogo }) {
  const [chartPeriod, setChartPeriod] = useState("6");
  const [filtroAno,   setFiltroAno]   = useState("");   // "" = histórico total
  const [filtroMes,   setFiltroMes]   = useState("");   // "01"–"12", solo activo si filtroAno

  // ── Años disponibles derivados de los datos ───────────────────────────────
  const anosDisponibles = useMemo(() => {
    const years = new Set();
    [...ventas, ...gastos, ...compras].forEach((x) => {
      if (x.fecha) years.add(x.fecha.slice(0, 4));
    });
    return [...years].sort();
  }, [ventas, gastos, compras]);

  // ── Filtrado de datos ─────────────────────────────────────────────────────
  const cF = useMemo(() => {
    if (!filtroAno) return compras;
    if (!filtroMes) return compras.filter((x) => x.fecha?.startsWith(filtroAno));
    return compras.filter((x) => isoMonth(x.fecha) === `${filtroAno}-${filtroMes}`);
  }, [compras, filtroAno, filtroMes]);

  const vF = useMemo(() => {
    if (!filtroAno) return ventas;
    if (!filtroMes) return ventas.filter((x) => x.fecha?.startsWith(filtroAno));
    return ventas.filter((x) => isoMonth(x.fecha) === `${filtroAno}-${filtroMes}`);
  }, [ventas, filtroAno, filtroMes]);

  const gF = useMemo(() => {
    if (!filtroAno) return gastos;
    if (!filtroMes) return gastos.filter((x) => x.fecha?.startsWith(filtroAno));
    return gastos.filter((x) => isoMonth(x.fecha) === `${filtroAno}-${filtroMes}`);
  }, [gastos, filtroAno, filtroMes]);

  const iF = useMemo(() => {
    if (!filtroAno) return inversiones;
    if (!filtroMes) return inversiones.filter((x) => x.fecha?.startsWith(filtroAno));
    return inversiones.filter((x) => isoMonth(x.fecha) === `${filtroAno}-${filtroMes}`);
  }, [inversiones, filtroAno, filtroMes]);

  // ── KPI stats + comparación con período anterior ──────────────────────────
  const kpiStats = useMemo(() => {
    function calcFromArrays(vv, gg) {
      const ingresos = vv.reduce((a, v) => a + v.total, 0);
      const costo    = vv.reduce((a, v) => a + (v.costoTotal || 0), 0);
      const gasto    = gg.reduce((a, g) => a + g.valor, 0);
      return { ingresos, costo, gasto, ganancia: ingresos - costo - gasto };
    }
    const curr = calcFromArrays(vF, gF);

    // "anterior" según el nivel de filtro
    let prevV = [], prevG = [];
    if (filtroAno && filtroMes) {
      // Mes seleccionado → comparar con mes anterior
      const pd = new Date(Number(filtroAno), Number(filtroMes) - 2, 1);
      const prevM = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, "0")}`;
      prevV = ventas.filter((x) => isoMonth(x.fecha) === prevM);
      prevG = gastos.filter((x) => isoMonth(x.fecha) === prevM);
    } else if (filtroAno && !filtroMes) {
      // Año seleccionado → comparar con año anterior
      const prevAno = String(Number(filtroAno) - 1);
      prevV = ventas.filter((x) => x.fecha?.startsWith(prevAno));
      prevG = gastos.filter((x) => x.fecha?.startsWith(prevAno));
    }
    // Sin filtro (histórico): no hay anterior relevante
    const prev = calcFromArrays(prevV, prevG);
    const hasPrev = filtroAno !== "";
    return { curr, prev, hasPrev };
  }, [vF, gF, filtroAno, filtroMes, ventas, gastos]);

  // ── Etiqueta del período seleccionado ─────────────────────────────────────
  const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                     "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const periodoLabel = useMemo(() => {
    if (!filtroAno) return "Histórico total";
    if (!filtroMes) return `Año ${filtroAno}`;
    return `${MONTHS_ES[Number(filtroMes) - 1]} ${filtroAno}`;
  }, [filtroAno, filtroMes]);

  const periodoSubtitulo = useMemo(() => {
    if (!filtroAno) return "Acumulado total · todos los registros";
    if (!filtroMes) return `Resumen año ${filtroAno} · vs año ${Number(filtroAno) - 1}`;
    return `Mes seleccionado · comparado con el mes anterior`;
  }, [filtroAno, filtroMes]);

  const trendLabel = useMemo(() => {
    if (!filtroAno) return "acumulado histórico";
    if (!filtroMes) return `vs ${Number(filtroAno) - 1}`;
    return "vs mes anterior";
  }, [filtroAno, filtroMes]);

  const meses = useMemo(() => lastNMonths(12), []);

  // ── Trends (para KPI cards) ───────────────────────────────────────────────
  const trendIngresos = trendPct(kpiStats.curr.ingresos, kpiStats.prev.ingresos);
  const trendGastos   = trendPct(kpiStats.curr.gasto,    kpiStats.prev.gasto);
  const trendGanancia = trendPct(kpiStats.curr.ganancia, kpiStats.prev.ganancia);

  const r = useMemo(() => {
    const totalVentas      = vF.reduce((a, v) => a + v.total, 0);
    const totalCostosVenta = vF.reduce((a, v) => a + (v.costoTotal || 0), 0);
    const totalGastos      = gF.reduce((a, g) => a + g.valor, 0);
    const utilidadBruta    = totalVentas - totalCostosVenta;
    const utilidadNeta     = utilidadBruta - totalGastos;
    const margenBruto      = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;
    const margenNeto       = totalVentas > 0 ? (utilidadNeta / totalVentas) * 100 : 0;
    const totalCompras     = cF.reduce((a, c) => a + c.total, 0);
    const totalInversiones = iF.reduce((a, i) => a + i.valor, 0);
    const cajaTeorica      =
      inversiones.reduce((a,x)=>a+x.valor,0) +
      ventas.reduce((a,x)=>a+x.total,0) -
      compras.reduce((a,x)=>a+x.total,0) -
      gastos.reduce((a,x)=>a+x.valor,0);

    const conStock               = catalogo.filter((x) => x.stock > 0);
    const valorInventarioCosto   = conStock.reduce((a, i) => a + i.stock * i.costo, 0);
    const valorInventarioVenta   = conStock.reduce((a, i) => a + i.stock * (i.precioVenta || 0), 0);
    const margenInventario       = valorInventarioVenta > 0 ? ((valorInventarioVenta - valorInventarioCosto) / valorInventarioVenta) * 100 : 0;
    const skusCriticos           = catalogo.filter((x) => x.stock > 0 && x.stock <= 2).length;
    const skusConStock           = conStock.length;
    const skusSinPrecio          = conStock.filter((x) => !x.precioVenta || x.precioVenta === 0).length;

    const carteraPendiente = ventas.reduce((a, v) => {
      let base = 0;
      if (v.pagos?.length > 0) {
        const sum = v.pagos.reduce((s, p) => s + p.monto, 0);
        base = Math.max(0, v.total - sum);
      } else if (v.formaPago === "Crédito") base = v.total;
      const abonado = (v.abonos||[]).reduce((s, ab) => s + ab.valor, 0);
      return a + Math.max(0, base - abonado);
    }, 0);

    const cuentasPorPagar = compras.reduce((a, c) => {
      const base = c.pagos?.length > 0
        ? Math.max(0, c.total - c.pagos.reduce((s,p)=>s+p.monto,0))
        : c.formaPago === "Crédito" ? c.total : 0;
      const pagado = (c.pagosProv||[]).reduce((s,p)=>s+p.monto,0);
      return a + Math.max(0, base - pagado);
    }, 0);

    const ventasPorOrigen = vF.reduce((acc, v) => {
      acc[v.origen] = (acc[v.origen] || 0) + v.total;
      return acc;
    }, {});

    const proveedorMap = compras.reduce((acc, c) => {
      acc[c.proveedor] = (acc[c.proveedor] || 0) + c.total;
      return acc;
    }, {});
    const topProveedores = Object.entries(proveedorMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([nombre, total]) => ({ nombre, total }));

    const topInventario = [...conStock]
      .sort((a, b) => (b.stock * b.costo) - (a.stock * a.costo)).slice(0, 5);

    const gastosData = Object.entries(
      gastos.reduce((acc, g) => { acc[g.categoria] = (acc[g.categoria]||0)+g.valor; return acc; }, {})
    ).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({ name, value }));

    return {
      totalVentas, totalCostosVenta, totalGastos, utilidadBruta, utilidadNeta,
      margenBruto, margenNeto, totalCompras, totalInversiones, cajaTeorica,
      valorInventarioCosto, valorInventarioVenta, margenInventario,
      skusCriticos, skusConStock, skusSinPrecio,
      carteraPendiente, cuentasPorPagar,
      ventasPorOrigen, topProveedores, topInventario, gastosData,
    };
  }, [vF, cF, gF, iF, catalogo, ventas, compras, gastos, inversiones]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const tendenciaData = useMemo(() => {
    let n = 6;
    if (chartPeriod === "3")    n = 3;
    if (chartPeriod === "6")    n = 6;
    if (chartPeriod === "12")   n = 12;
    if (chartPeriod === "year") {
      const year = new Date().getFullYear();
      const all  = lastNMonths(12).filter((m) => m.startsWith(year.toString()));
      return all.map((m) => {
        const mv = ventas.filter((v) => isoMonth(v.fecha) === m);
        const mg = gastos.filter((g) => isoMonth(g.fecha) === m);
        const vt = mv.reduce((a, v) => a + v.total, 0);
        const vc = mv.reduce((a, v) => a + (v.costoTotal||0), 0);
        const vg = mg.reduce((a, g) => a + g.valor, 0);
        return { mes: monthLabel(m + "-01").split(" ")[0], Ingresos: vt, Gastos: vg, Utilidad: vt - vc - vg };
      });
    }
    return lastNMonths(n).map((m) => {
      const mv = ventas.filter((v) => isoMonth(v.fecha) === m);
      const mg = gastos.filter((g) => isoMonth(g.fecha) === m);
      const vt = mv.reduce((a, v) => a + v.total, 0);
      const vc = mv.reduce((a, v) => a + (v.costoTotal||0), 0);
      const vg = mg.reduce((a, g) => a + g.valor, 0);
      return { mes: monthLabel(m + "-01").split(" ")[0], Ingresos: vt, Gastos: vg, Utilidad: vt - vc - vg };
    });
  }, [chartPeriod, ventas, gastos]);

  const origenData = useMemo(() =>
    Object.entries(r.ventasPorOrigen).map(([name, value]) => ({ name, value })),
    [r.ventasPorOrigen]
  );

  const hasData = ventas.length > 0;

  return (
    <div style={layout}>

      {/* ── Header + filtros ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.ink }}>
              📊 {periodoLabel}
            </h2>
            <p style={{ margin:"3px 0 0", fontSize:13, color:C.ink4 }}>{periodoSubtitulo}</p>
          </div>
          {/* Filtro año */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:C.ink4, fontWeight:600, marginRight:2 }}>Año:</span>
              <button
                style={{ ...periodBtn, ...(filtroAno === "" ? periodBtnActive : {}) }}
                onClick={() => { setFiltroAno(""); setFiltroMes(""); }}>
                Todo
              </button>
              {anosDisponibles.map((a) => (
                <button key={a}
                  style={{ ...periodBtn, ...(filtroAno === a ? periodBtnActive : {}) }}
                  onClick={() => { setFiltroAno(a); setFiltroMes(""); }}>
                  {a}
                </button>
              ))}
            </div>
            {/* Sub-filtro mes (solo si hay año seleccionado) */}
            {filtroAno && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, color:C.ink4, fontWeight:600, marginRight:2, alignSelf:"center" }}>Mes:</span>
                <button
                  style={{ ...periodBtn, ...(filtroMes === "" ? periodBtnActive : {}) }}
                  onClick={() => setFiltroMes("")}>
                  Todos
                </button>
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m) => {
                  const hasData2 = [...ventas, ...gastos].some((x) => x.fecha?.startsWith(`${filtroAno}-${m}`));
                  if (!hasData2) return null;
                  return (
                    <button key={m}
                      style={{ ...periodBtn, ...(filtroMes === m ? periodBtnActive : {}) }}
                      onClick={() => setFiltroMes(m)}>
                      {MONTHS_ES[Number(m) - 1].slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 KPI Cards ──────────────────────────────────────────────────── */}
      <div style={kpiRow4}>
        <MonthKpi
          label={filtroMes ? "INGRESOS DEL MES" : filtroAno ? `INGRESOS ${filtroAno}` : "INGRESOS TOTALES"}
          value={money(kpiStats.curr.ingresos)}
          trend={kpiStats.hasPrev ? trendIngresos : undefined}
          trendLabel={trendLabel}
          valueColor={C.positive}
          icon={<ArrowUp color={C.positive} />}
          accent={C.positive}
        />
        <MonthKpi
          label={filtroMes ? "GASTOS DEL MES" : filtroAno ? `GASTOS ${filtroAno}` : "GASTOS TOTALES"}
          value={money(kpiStats.curr.gasto)}
          trend={kpiStats.hasPrev ? -trendGastos : undefined}
          trendLabel={trendLabel}
          valueColor={C.negative}
          icon={<ArrowDown color={C.negative} />}
          accent={C.negative}
        />
        <MonthKpi
          label="GANANCIA NETA"
          value={money(kpiStats.curr.ganancia)}
          trend={kpiStats.hasPrev ? trendGanancia : undefined}
          trendLabel={trendLabel}
          valueColor={kpiStats.curr.ganancia >= 0 ? C.brand : C.negative}
          icon={<span style={{ fontSize:16 }}>{kpiStats.curr.ganancia >= 0 ? "◈" : "⚠"}</span>}
          accent={kpiStats.curr.ganancia >= 0 ? C.brand : C.negative}
        />
        <MonthKpi
          label="BALANCE TOTAL"
          value={money(r.cajaTeorica)}
          trendLabel="Posición acumulada de caja"
          valueColor={r.cajaTeorica >= 0 ? C.ink : C.negative}
          icon={<span style={{ fontSize:16 }}>⊙</span>}
          accent={r.cajaTeorica >= 0 ? C.ink : C.negative}
        />
      </div>

      {/* ── Gráfico Ingresos vs Gastos ────────────────────────────────────── */}
      <div style={{ background:"white", borderRadius:14, padding:"20px 22px", boxShadow:"0 1px 4px rgba(0,0,0,.08)", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.ink }}>Ingresos vs Gastos</h3>
            <p style={{ margin:"3px 0 0", fontSize:12, color:C.ink4 }}>Comparativa mensual</p>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {[["3","3 meses"],["6","6 meses"],["12","12 meses"],["year","Este año"]].map(([v,l]) => (
              <button key={v} onClick={() => setChartPeriod(v)}
                style={{ ...chartPeriodBtn, ...(chartPeriod === v ? chartPeriodBtnActive : {}) }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {!hasData ? (
          <EmptyState icon="📈" text="Registra ventas para ver la tendencia." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tendenciaData} barGap={6} barCategoryGap="30%"
                margin={{ top:4, right:4, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:12, fill:C.ink4, fontWeight:600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:C.ink4 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1e3?`${(v/1e3).toFixed(0)}k`:v} width={48} />
                <Tooltip content={<MoneyTooltip />} />
                <Bar dataKey="Ingresos" fill={C.positive} radius={[4,4,0,0]} maxBarSize={44} />
                <Bar dataKey="Gastos"   fill={C.negative} radius={[4,4,0,0]} maxBarSize={44} />
                <Bar dataKey="Utilidad" fill={C.brand}    radius={[4,4,0,0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:20, marginTop:12, justifyContent:"center" }}>
              {[[C.positive,"Ingresos"],[C.negative,"Gastos"],[C.brand,"Utilidad"]].map(([color,label]) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.ink4, fontWeight:600 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:color }} />{label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── KPIs secundarios ─────────────────────────────────────────────── */}
      <div style={kpiRow2}>
        <MiniKpi label="Compras" value={money(r.totalCompras)} color={C.negative} />
        <MiniKpi label="Utilidad bruta" value={money(r.utilidadBruta)} sub={`${r.margenBruto.toFixed(1)}%`} color={r.utilidadBruta >= 0 ? C.positive : C.negative} />
        <MiniKpi label="Gastos operativos" value={money(r.totalGastos)} color="#E65100" />
        <MiniKpi label="Prov. por pagar" value={money(r.cuentasPorPagar)} color={r.cuentasPorPagar > 0 ? C.negative : C.positive} />
        <MiniKpi label="Capital aportado" value={money(r.totalInversiones)} color="#1565C0" />
      </div>

      {/* ── Inventario valorizado ─────────────────────────────────────────── */}
      <div className="pg-3col">
        <InvCard
          label="Inventario @ costo"
          value={money(r.valorInventarioCosto)}
          sub={`${r.skusConStock} SKUs con stock`}
          borderColor={C.border2}
          bg="white"
        />
        <InvCard
          label="Inventario @ venta est."
          value={money(r.valorInventarioVenta)}
          valueColor={C.positive}
          sub="Si se vende todo el stock"
          borderColor="#A5D6A7"
          bg={C.posBg}
        />
        <InvCard
          label="Margen potencial"
          value={r.valorInventarioVenta > 0 ? `${r.margenInventario.toFixed(1)}%` : "—"}
          valueColor="#1565C0"
          sub={r.skusSinPrecio > 0
            ? `${r.skusSinPrecio} prod. sin precio de venta`
            : money(r.valorInventarioVenta - r.valorInventarioCosto) + " de ganancia est."}
          borderColor="#90CAF9"
          bg="#E3F2FD"
        />
      </div>

      {/* ── Tendencia área + Estado de resultados ─────────────────────────── */}
      <div className="pg-two">
        <div style={{ background:"white", borderRadius:14, padding:"20px 22px", boxShadow:"0 1px 4px rgba(0,0,0,.08)", border:`1px solid ${C.border}` }}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Tendencia de ventas</h3>
            <span style={chartLegend}>Últimos 6 meses</span>
          </div>
          {!hasData ? <EmptyState icon="📈" text="Registra ventas para ver la tendencia." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tendenciaData} margin={{ top:4, right:4, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.positive} stopOpacity={0.12}/>
                    <stop offset="95%" stopColor={C.positive} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gUtilidad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.brand} stopOpacity={0.12}/>
                    <stop offset="95%" stopColor={C.brand} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:12, fill:C.ink4, fontWeight:600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:C.ink4 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1e3?`${(v/1e3).toFixed(0)}k`:v} width={50} />
                <Tooltip content={<MoneyTooltip />} />
                <Area type="monotone" dataKey="Ingresos" stroke={C.positive} strokeWidth={2} fill="url(#gIngresos)" dot={false} activeDot={{ r:4, fill:C.positive }} />
                <Area type="monotone" dataKey="Utilidad" stroke={C.brand}    strokeWidth={2} fill="url(#gUtilidad)"  dot={false} activeDot={{ r:4, fill:C.brand }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background:"white", borderRadius:14, padding:"20px 22px", boxShadow:"0 1px 4px rgba(0,0,0,.08)", border:`1px solid ${C.border}` }}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Estado de resultados</h3>
            {(filtroAno || filtroMes) && <span style={{ ...chartLegend, background:C.brandLight, color:C.brand, borderRadius:6, padding:"2px 8px" }}>{periodoLabel}</span>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <FinRow label="(+) Ventas"             value={money(r.totalVentas)} />
            <FinRow label="(−) Costo de ventas"    value={money(r.totalCostosVenta)} type="cost" />
            <Divider />
            <FinRow label="= Utilidad bruta"        value={money(r.utilidadBruta)} bold sub={`Margen ${r.margenBruto.toFixed(1)}%`} type={r.utilidadBruta >= 0 ? "profit" : "loss"} />
            <FinRow label="(−) Gastos operativos"  value={money(r.totalGastos)} type="cost" />
            <Divider />
            <FinRow label="= Utilidad neta"         value={money(r.utilidadNeta)} bold sub={`Margen ${r.margenNeto.toFixed(1)}%`} type={r.utilidadNeta >= 0 ? "profit" : "loss"} />
            <div style={{ marginTop:12, padding:"14px 16px", background: r.cajaTeorica>=0 ? C.posBg : C.negBg, borderRadius:12, border:`1px solid ${r.cajaTeorica>=0?"#A5D6A7":"#EF9A9A"}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.ink4, marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>POSICIÓN DE CAJA TEÓRICA</div>
              <div style={{ fontSize:26, fontWeight:700, color:r.cajaTeorica>=0 ? C.positive : C.negative }}>{money(r.cajaTeorica)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ventas por origen + Gastos por categoría ─────────────────────── */}
      <div className="pg-two">
        <div style={panelStyle}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Ventas por origen</h3>
          </div>
          {origenData.length === 0 ? <EmptyState text="Sin ventas registradas." /> : (
            <div style={{ display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
              <ResponsiveContainer width="50%" height={170} minWidth={120}>
                <PieChart>
                  <Pie data={origenData} cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={3} dataKey="value">
                    {origenData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                {origenData.map((item, i) => (
                  <div key={item.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:PIE_COLORS[i], flexShrink:0 }} />
                      <span style={{ fontSize:13, color:C.ink3 }}>{item.name}</span>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{money(item.value)}</div>
                      <div style={{ fontSize:11, color:C.ink4 }}>{pct(item.value, r.totalVentas)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Gastos por categoría</h3>
          </div>
          {r.gastosData.length === 0 ? <EmptyState text="Sin gastos registrados." /> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {r.gastosData.map((item) => {
                const maxVal = r.gastosData[0]?.value || 1;
                return (
                  <div key={item.name}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.ink }}>{item.name}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:C.negative }}>{money(item.value)}</span>
                    </div>
                    <div style={{ height:5, background:"#F5F5F5", borderRadius:99 }}>
                      <div style={{ height:"100%", width:`${(item.value/maxVal)*100}%`, background:C.negative, borderRadius:99, opacity:.7, transition:"width .4s" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop:6, paddingTop:10, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Total</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.negative }}>{money(r.totalGastos)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top inventario + Top proveedores ─────────────────────────────── */}
      <div className="pg-two">
        <div style={panelStyle}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Top productos por inventario</h3>
          </div>
          {r.topInventario.length === 0 ? <EmptyState text="Sin stock registrado." /> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {r.topInventario.map((item, i) => {
                const valorCosto = item.stock * item.costo;
                const valorVenta = item.stock * (item.precioVenta || 0);
                return (
                  <div key={item.sku} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
                    <div style={{ width:26, height:26, borderRadius:7, background:C.brand, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"white", flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.nombre}</div>
                      <div style={{ fontSize:11, color:C.ink4 }}>{item.sku} · {item.stock} und</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{money(valorCosto)}</div>
                      {valorVenta > 0 && <div style={{ fontSize:11, color:C.positive, fontWeight:600 }}>↑ {money(valorVenta)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Top proveedores por compras</h3>
          </div>
          {r.topProveedores.length === 0 ? <EmptyState text="Sin compras registradas." /> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {r.topProveedores.map((prov, i) => {
                const maxVal = r.topProveedores[0]?.total || 1;
                return (
                  <div key={prov.nombre}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:20, height:20, borderRadius:5, background:C.ink, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"white" }}>{i+1}</div>
                        <span style={{ fontSize:13, fontWeight:600 }}>{prov.nombre}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:700 }}>{money(prov.total)}</span>
                    </div>
                    <div style={{ height:4, background:C.border, borderRadius:99 }}>
                      <div style={{ height:"100%", width:`${(prov.total/maxVal)*100}%`, background:C.ink, borderRadius:99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Alertas ───────────────────────────────────────────────────────── */}
      {(r.skusCriticos > 0 || r.carteraPendiente > 0 || r.cuentasPorPagar > 0 || r.skusSinPrecio > 0) && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {r.skusCriticos > 0    && <AlertCard type="warning" title={`${r.skusCriticos} SKU${r.skusCriticos>1?"s":""} con stock crítico (≤2)`}      text="Revisa Inventario para ver los productos con pocas unidades." />}
          {r.carteraPendiente > 0 && <AlertCard type="warning" title={`Cartera por cobrar: ${money(r.carteraPendiente)}`}                            text="Hay ventas a crédito sin cobrar. Revisa Cartera → Cuentas por cobrar." />}
          {r.cuentasPorPagar > 0  && <AlertCard type="error"   title={`Cuentas por pagar: ${money(r.cuentasPorPagar)}`}                              text="Hay compras a crédito sin cancelar a proveedores. Revisa Cartera." />}
          {r.skusSinPrecio > 0    && <AlertCard type="info"    title={`${r.skusSinPrecio} producto${r.skusSinPrecio>1?"s":""} sin precio de venta`}   text="Define precios de venta en Inventario → Catálogo para ver el margen potencial." />}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MonthKpi({ label, value, trend, trendLabel, valueColor, icon, accent }) {
  const hasTrend = trend !== undefined && trend !== null;
  const isUp     = trend > 0;
  const trendColor = isUp ? C.positive : trend < 0 ? C.negative : C.ink4;
  return (
    <div style={{
      background: "white",
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,.08)",
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${accent || C.border2}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:600, color:C.ink4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</span>
        <span>{icon}</span>
      </div>
      <div style={{ fontSize:28, fontWeight:600, color:valueColor || C.ink, lineHeight:1.1, letterSpacing:"-0.5px" }}>
        {value}
      </div>
      <div style={{ fontSize:12, color:C.ink4, display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
        {hasTrend && Math.abs(trend) > 0.1 && (
          <span style={{ fontWeight:700, color:trendColor, display:"flex", alignItems:"center", gap:2 }}>
            {isUp ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        <span>{trendLabel}</span>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, sub, color }) {
  return (
    <div style={{ background:"white", borderRadius:12, padding:"14px 18px", border:`1px solid ${C.border}`, flex:1, minWidth:140, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize:11, fontWeight:600, color:C.ink4, textTransform:"uppercase", letterSpacing:".5px", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color:color||C.ink, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:C.ink4, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function InvCard({ label, value, valueColor, sub, borderColor, bg }) {
  return (
    <div style={{ background:bg||"white", border:`1.5px solid ${borderColor||C.border}`, borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize:11, fontWeight:600, color:C.ink4, textTransform:"uppercase", letterSpacing:".5px", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color:valueColor||C.ink, lineHeight:1, marginBottom:6 }}>{value}</div>
      <div style={{ fontSize:12, color:C.ink4 }}>{sub}</div>
    </div>
  );
}

function AlertCard({ type, title, text }) {
  const colors = {
    warning: { bg:"#FFF8E1", border:"#FFE082",  title:"#E65100",  dot:"#FF8F00" },
    error:   { bg:C.negBg,  border:"#EF9A9A",  title:C.negative, dot:C.negative },
    info:    { bg:"#E3F2FD", border:"#90CAF9",  title:"#1565C0",  dot:"#1976D2" },
  };
  const c = colors[type] || colors.warning;
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"14px 16px", display:"flex", gap:12 }}>
      <div style={{ width:8, height:8, borderRadius:"50%", background:c.dot, flexShrink:0, marginTop:5 }} />
      <div>
        <div style={{ fontWeight:700, color:c.title, marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:13, color:c.title, opacity:.8 }}>{text}</div>
      </div>
    </div>
  );
}

function ArrowUp({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  );
}

function ArrowDown({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const layout   = { display:"flex", flexDirection:"column", gap:20 };
const kpiRow4  = { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 };
const kpiRow2  = { display:"flex", gap:12, flexWrap:"wrap" };
const panelStyle   = { background:"white", borderRadius:14, padding:"20px 22px", boxShadow:"0 1px 4px rgba(0,0,0,.08)", border:`1px solid ${C.border}` };
const panelHeader  = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 };
const panelTitle   = { margin:0, fontSize:15, fontWeight:700, color:C.ink };
const chartLegend  = { fontSize:12, color:C.ink4, fontWeight:600 };
const tooltipBox   = { background:C.ink, border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"10px 14px", minWidth:140 };
const tooltipLabel = { color:C.ink4, fontSize:12, marginBottom:6, fontWeight:600 };
const periodRow    = { display:"flex", gap:6, flexWrap:"wrap", paddingBottom:4 };
const periodBtn    = { border:`1px solid ${C.border2}`, background:"white", color:C.ink4, borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" };
const periodBtnActive = { background:C.ink, border:`1px solid ${C.ink}`, color:"white" };
const chartPeriodBtn       = { border:`1px solid ${C.border2}`, background:"white", color:C.ink4, borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" };
const chartPeriodBtnActive = { background:C.brand, border:`1px solid ${C.brand}`, color:"white" };
