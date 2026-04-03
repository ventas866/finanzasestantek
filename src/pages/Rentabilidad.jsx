import { useMemo } from "react";
import { money, pct, isoMonth, monthLabel, lastNMonths } from "../utils.js";
import {
  Panel, SectionHeader, KpiCard, FinRow, DataTable, Divider, OrigenBadge, EmptyState,
} from "../ui.jsx";

export default function Rentabilidad({ ventas, compras, gastos }) {
  const r = useMemo(() => {
    const totalVentas      = ventas.reduce((a, v) => a + v.total, 0);
    const totalCostosVenta = ventas.reduce((a, v) => a + (v.costoTotal || 0), 0);
    const totalGastos      = gastos.reduce((a, g) => a + g.valor, 0);
    const utilidadBruta    = totalVentas - totalCostosVenta;
    const utilidadNeta     = utilidadBruta - totalGastos;
    const margenBruto      = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;
    const margenNeto       = totalVentas > 0 ? (utilidadNeta / totalVentas) * 100 : 0;

    const gastosPorCategoria = gastos.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
      return acc;
    }, {});

    // Ventas por origen
    const ventasPorOrigen = ventas.reduce((acc, v) => {
      if (!acc[v.origen]) acc[v.origen] = { ventas:0, costo:0, utilidad:0 };
      acc[v.origen].ventas   += v.total;
      acc[v.origen].costo    += v.costoTotal || 0;
      acc[v.origen].utilidad += v.utilidad || 0;
      return acc;
    }, {});

    // Tendencia mensual
    const meses = lastNMonths(6);
    const tendencia = meses.map((m) => {
      const mv = ventas.filter((v) => isoMonth(v.fecha) === m);
      const vt = mv.reduce((a, v) => a + v.total, 0);
      const vc = mv.reduce((a, v) => a + (v.costoTotal||0), 0);
      const vg = gastos.filter((g) => isoMonth(g.fecha) === m).reduce((a, g) => a + g.valor, 0);
      return { mes: monthLabel(m + "-01"), ventas: vt, costo: vc, gastos: vg,
               utilidadBruta: vt - vc, utilidadNeta: vt - vc - vg };
    });

    return { totalVentas, totalCostosVenta, totalGastos, utilidadBruta, utilidadNeta, margenBruto, margenNeto, gastosPorCategoria, ventasPorOrigen, tendencia };
  }, [ventas, gastos]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Rentabilidad" subtitle="Estado de resultados, márgenes y análisis de ventas" />

      {/* KPIs */}
      <div style={kpiGrid}>
        <KpiCard label="Ventas totales" value={money(r.totalVentas)} accent="#3b82f6" />
        <KpiCard label="Costo de ventas" value={money(r.totalCostosVenta)} accent="#ef4444" />
        <KpiCard
          label="Utilidad bruta"
          value={money(r.utilidadBruta)}
          sub={`Margen ${r.margenBruto.toFixed(1)}%`}
          accent={r.utilidadBruta >= 0 ? "#10b981" : "#ef4444"}
          highlight={r.utilidadBruta >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Utilidad neta"
          value={money(r.utilidadNeta)}
          sub={`Margen ${r.margenNeto.toFixed(1)}%`}
          accent={r.utilidadNeta >= 0 ? "#10b981" : "#ef4444"}
          highlight={r.utilidadNeta >= 0 ? "positive" : "negative"}
        />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Estado de resultados */}
        <Panel title="Estado de resultados">
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <FinRow label="(+) Ingresos por ventas" value={money(r.totalVentas)} />
            <FinRow label="(−) Costo de ventas" value={money(r.totalCostosVenta)} type="cost" />
            <Divider />
            <FinRow label="= Utilidad bruta" value={money(r.utilidadBruta)} bold
              sub={`Margen ${r.margenBruto.toFixed(1)}%`}
              type={r.utilidadBruta >= 0 ? "profit" : "loss"} />
            <FinRow label="(−) Gastos operativos" value={money(r.totalGastos)} type="cost" />
            <Divider />
            <FinRow label="= Utilidad neta" value={money(r.utilidadNeta)} bold
              sub={`Margen ${r.margenNeto.toFixed(1)}%`}
              type={r.utilidadNeta >= 0 ? "profit" : "loss"} />
          </div>
        </Panel>

        {/* Por origen */}
        <Panel title="Rentabilidad por origen">
          {Object.keys(r.ventasPorOrigen).length === 0 ? (
            <EmptyState text="Sin ventas registradas." />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {Object.entries(r.ventasPorOrigen).map(([origen, data]) => (
                <div key={origen} style={origenCard}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <OrigenBadge origen={origen} />
                    <span style={{ fontWeight:900 }}>{money(data.ventas)}</span>
                  </div>
                  <div style={{ display:"flex", gap:16, fontSize:13 }}>
                    <span style={{ color:"#64748b" }}>Costo: {money(data.costo)}</span>
                    <span style={{ fontWeight:700, color: data.utilidad >= 0 ? "#059669" : "#dc2626" }}>
                      Utilidad: {money(data.utilidad)} ({pct(data.utilidad, data.ventas)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Gastos por categoría */}
      {Object.keys(r.gastosPorCategoria).length > 0 && (
        <Panel title="Gastos por categoría">
          <DataTable
            headers={["Categoría","Total","% del total"]}
            rows={Object.entries(r.gastosPorCategoria)
              .sort((a,b)=>b[1]-a[1])
              .map(([cat, val]) => [
                <span style={{ fontWeight:700 }}>{cat}</span>,
                <span style={{ fontWeight:900, color:"#dc2626" }}>{money(val)}</span>,
                pct(val, r.totalGastos),
              ])}
          />
        </Panel>
      )}

      {/* Tendencia */}
      {r.tendencia.some((t) => t.ventas > 0) && (
        <Panel title="Tendencia últimos 6 meses">
          <DataTable
            headers={["Mes","Ventas","Costo","Gtos. oper.","Util. bruta","Util. neta"]}
            rows={r.tendencia.map((t) => [
              t.mes,
              <span style={{ fontWeight:700 }}>{money(t.ventas)}</span>,
              <span style={{ color:"#ef4444" }}>{money(t.costo)}</span>,
              <span style={{ color:"#f59e0b" }}>{money(t.gastos)}</span>,
              <span style={{ fontWeight:700, color: t.utilidadBruta >= 0 ? "#059669" : "#dc2626" }}>{money(t.utilidadBruta)}</span>,
              <span style={{ fontWeight:900, color: t.utilidadNeta >= 0 ? "#059669" : "#dc2626" }}>{money(t.utilidadNeta)}</span>,
            ])}
          />
        </Panel>
      )}

      {/* Detalle de ventas */}
      <Panel title="Detalle de ventas">
        {ventas.length === 0 ? (
          <EmptyState icon="📊" text="Sin ventas registradas." />
        ) : (
          <DataTable
            headers={["Fecha","Cliente","Origen","Ítems","Total","Costo","Utilidad","Margen"]}
            rows={ventas.map((v) => {
              const margen = v.subtotal > 0 ? (v.utilidad / v.subtotal) * 100 : 0;
              return [
                v.fecha,
                <span style={{ fontWeight:700 }}>{v.cliente}</span>,
                <OrigenBadge origen={v.origen} />,
                v.items?.length || 0,
                <span style={{ fontWeight:700 }}>{money(v.total)}</span>,
                <span style={{ color:"#ef4444" }}>{money(v.costoTotal)}</span>,
                <span style={{ fontWeight:700, color: v.utilidad >= 0 ? "#059669" : "#dc2626" }}>{money(v.utilidad)}</span>,
                <span style={{
                  fontWeight:700,
                  color: margen >= 20 ? "#059669" : margen >= 10 ? "#d97706" : "#dc2626"
                }}>{margen.toFixed(1)}%</span>,
              ];
            })}
          />
        )}
      </Panel>
    </div>
  );
}

const kpiGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:14 };
const origenCard = { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" };
