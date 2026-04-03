import { useMemo, useState } from "react";
import { money, pct, isoMonth, lastNMonths, monthLabel } from "../utils.js";
import {
  Panel, SectionHeader, KpiCard, FinRow, OrigenBadge,
  DataTable, EmptyState, Alert, Divider, s,
} from "../ui.jsx";

export default function Dashboard({ compras, ventas, gastos, inversiones, catalogo }) {
  const [mesFiltro, setMesFiltro] = useState(""); // "" = todos

  const meses = useMemo(() => lastNMonths(12), []);

  // Filter by month if selected
  const cFilter = useMemo(() => mesFiltro ? compras.filter((x) => isoMonth(x.fecha) === mesFiltro) : compras, [compras, mesFiltro]);
  const vFilter = useMemo(() => mesFiltro ? ventas.filter((x) => isoMonth(x.fecha) === mesFiltro) : ventas, [ventas, mesFiltro]);
  const gFilter = useMemo(() => mesFiltro ? gastos.filter((x) => isoMonth(x.fecha) === mesFiltro) : gastos, [gastos, mesFiltro]);
  const iFilter = useMemo(() => mesFiltro ? inversiones.filter((x) => isoMonth(x.fecha) === mesFiltro) : inversiones, [inversiones, mesFiltro]);

  const r = useMemo(() => {
    const totalInversiones  = iFilter.reduce((a, x) => a + x.valor, 0);
    const totalCompras      = cFilter.reduce((a, x) => a + x.total, 0);
    const totalVentas       = vFilter.reduce((a, x) => a + x.total, 0);
    const totalCostosVenta  = vFilter.reduce((a, x) => a + (x.costoTotal || 0), 0);
    const totalGastos       = gFilter.reduce((a, x) => a + x.valor, 0);
    const utilidadBruta     = totalVentas - totalCostosVenta;
    const utilidadNeta      = utilidadBruta - totalGastos;
    const margenBruto       = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;
    const margenNeto        = totalVentas > 0 ? (utilidadNeta / totalVentas) * 100 : 0;

    const valorInventario   = catalogo.reduce((a, i) => a + i.stock * i.costo, 0);
    const cajaTeorica       = inversiones.reduce((a,x)=>a+x.valor,0)
                            + ventas.reduce((a,x)=>a+x.total,0)
                            - compras.reduce((a,x)=>a+x.total,0)
                            - gastos.reduce((a,x)=>a+x.valor,0);

    const ventasPorOrigen = vFilter.reduce((acc, v) => {
      acc[v.origen] = (acc[v.origen] || 0) + v.total;
      return acc;
    }, {});

    const gastosPorCategoria = gFilter.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
      return acc;
    }, {});

    const ventasCredito    = ventas.filter((v) => v.formaPago === "Crédito");
    const totalCartera     = ventasCredito.reduce((a, v) => {
      const abonado = (v.abonos || []).reduce((s, ab) => s + ab.valor, 0);
      return a + Math.max(0, v.total - abonado);
    }, 0);

    const comprasCredito   = compras.filter((c) => c.formaPago === "Crédito");
    const totalPorPagar    = comprasCredito.reduce((a, c) => a + c.total, 0);

    const skusConStock  = catalogo.filter((x) => x.stock > 0).length;
    const skusCriticos  = catalogo.filter((x) => x.stock > 0 && x.stock <= 2).length;

    return {
      totalInversiones, totalCompras, totalVentas, totalCostosVenta, totalGastos,
      utilidadBruta, utilidadNeta, margenBruto, margenNeto,
      valorInventario, cajaTeorica, totalCartera, totalPorPagar,
      ventasPorOrigen, gastosPorCategoria, skusConStock, skusCriticos,
    };
  }, [cFilter, vFilter, gFilter, iFilter, catalogo, compras, ventas, gastos, inversiones]);

  // Monthly trend (last 6 months)
  const trend = useMemo(() => {
    return lastNMonths(6).map((m) => {
      const mv = ventas.filter((v) => isoMonth(v.fecha) === m).reduce((a, v) => a + v.total, 0);
      const mc = ventas.filter((v) => isoMonth(v.fecha) === m).reduce((a, v) => a + (v.costoTotal||0), 0);
      return { mes: monthLabel(m + "-01"), ventas: mv, utilidad: mv - mc };
    });
  }, [ventas]);

  const periodoLabel = mesFiltro ? monthLabel(mesFiltro + "-01") : "Acumulado total";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="Dashboard"
        subtitle={periodoLabel}
        actions={
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:13, color:"#64748b", fontWeight:600 }}>Período:</span>
            <select
              style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontSize:13, cursor:"pointer" }}
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
            >
              <option value="">Todo el tiempo</option>
              {meses.map((m) => (
                <option key={m} value={m}>{monthLabel(m + "-01")}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* KPIs principales */}
      <div style={kpiGrid}>
        <KpiCard label="Ventas" value={money(r.totalVentas)} sub={`${vFilter.length} transacciones`} accent="#3b82f6" icon="⬆" />
        <KpiCard
          label="Utilidad neta"
          value={money(r.utilidadNeta)}
          sub={`Margen ${r.margenNeto.toFixed(1)}%`}
          accent={r.utilidadNeta >= 0 ? "#10b981" : "#ef4444"}
          highlight={r.utilidadNeta >= 0 ? "positive" : "negative"}
          icon="◎"
        />
        <KpiCard label="Valor inventario" value={money(r.valorInventario)} sub={`${r.skusConStock} SKUs con stock`} accent="#8b5cf6" icon="⊞" />
        <KpiCard
          label="Caja teórica"
          value={money(r.cajaTeorica)}
          sub="Posición financiera estimada"
          accent={r.cajaTeorica >= 0 ? "#10b981" : "#ef4444"}
          highlight={r.cajaTeorica >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* KPIs secundarios */}
      <div style={kpiGrid}>
        <KpiCard label="Compras" value={money(r.totalCompras)} sub={`${cFilter.length} órdenes`} accent="#f97316" size="sm" />
        <KpiCard label="Utilidad bruta" value={money(r.utilidadBruta)} sub={`Margen ${r.margenBruto.toFixed(1)}%`} accent="#10b981" size="sm" />
        <KpiCard label="Gastos" value={money(r.totalGastos)} sub={`${gFilter.length} registros`} accent="#ef4444" size="sm" />
        <KpiCard
          label="Cartera pendiente"
          value={money(r.totalCartera)}
          sub="Ventas a crédito sin cobrar"
          accent={r.totalCartera > 0 ? "#f59e0b" : "#10b981"}
          size="sm"
        />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Estado financiero */}
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

        {/* Ventas por origen */}
        <Panel title="Ventas por origen">
          {Object.keys(r.ventasPorOrigen).length === 0 ? (
            <EmptyState text="Sin ventas en este período." />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {Object.entries(r.ventasPorOrigen).map(([origen, valor]) => (
                <div key={origen} style={origenRow}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <OrigenBadge origen={origen} />
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:900, fontSize:16, color:"#0f172a" }}>{money(valor)}</div>
                    <div style={{ fontSize:12, color:"#64748b" }}>{pct(valor, r.totalVentas)} del total</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Tendencia mensual */}
      {trend.some((t) => t.ventas > 0) && (
        <Panel title="Tendencia últimos 6 meses">
          <DataTable
            headers={["Mes", "Ventas", "Utilidad"]}
            rows={trend.map((t) => [
              t.mes,
              <span style={{ fontWeight:700 }}>{money(t.ventas)}</span>,
              <span style={{ fontWeight:700, color: t.utilidad >= 0 ? "#059669" : "#dc2626" }}>{money(t.utilidad)}</span>,
            ])}
          />
        </Panel>
      )}

      {/* Alertas */}
      {(r.skusCriticos > 0 || r.totalCartera > 0 || r.totalPorPagar > 0) && (
        <Panel title="Alertas">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {r.skusCriticos > 0 && (
              <Alert type="warning"
                title={`${r.skusCriticos} SKU${r.skusCriticos > 1 ? "s" : ""} con stock crítico (≤ 2 unidades)`}
                text="Considera reponer antes de recibir nuevos pedidos." />
            )}
            {r.totalCartera > 0 && (
              <Alert type="warning"
                title={`Cartera por cobrar: ${money(r.totalCartera)}`}
                text="Hay ventas a crédito con saldo pendiente. Revisa el módulo Cartera." />
            )}
            {r.totalPorPagar > 0 && (
              <Alert type="info"
                title={`Cuentas por pagar: ${money(r.totalPorPagar)}`}
                text="Hay compras a crédito pendientes de pago al proveedor." />
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

const kpiGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))",
  gap:14,
};

const origenRow = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  padding:"10px 12px",
  background:"#f8fafc",
  borderRadius:10,
  border:"1px solid #f1f5f9",
};
