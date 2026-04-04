import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { money, pct, isoMonth, lastNMonths, monthLabel } from "../utils.js";
import { Panel, KpiCard, FinRow, OrigenBadge, EmptyState, Divider } from "../ui.jsx";

const CHART_COLORS = { ventas:"#f97316", costo:"#ef4444", utilidad:"#10b981", gastos:"#8b5cf6" };
const PIE_COLORS   = ["#f97316","#3b82f6","#8b5cf6","#10b981","#ec4899","#14b8a6"];

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipBox}>
      <div style={tooltipLabel}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:24, marginTop:4 }}>
          <span style={{ color:p.color, fontWeight:600, fontSize:12 }}>{p.name}</span>
          <span style={{ color:"white", fontWeight:800, fontSize:13 }}>{money(p.value)}</span>
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
      <div style={{ color:"white", fontWeight:800 }}>{money(item.value)}</div>
    </div>
  );
}

export default function Dashboard({ compras, ventas, gastos, inversiones, catalogo }) {
  const [mesFiltro, setMesFiltro] = useState("");
  const meses = useMemo(() => lastNMonths(12), []);

  const cF = useMemo(() => mesFiltro ? compras.filter((x) => isoMonth(x.fecha) === mesFiltro) : compras, [compras, mesFiltro]);
  const vF = useMemo(() => mesFiltro ? ventas.filter((x)  => isoMonth(x.fecha) === mesFiltro) : ventas,  [ventas,  mesFiltro]);
  const gF = useMemo(() => mesFiltro ? gastos.filter((x)  => isoMonth(x.fecha) === mesFiltro) : gastos,  [gastos,  mesFiltro]);
  const iF = useMemo(() => mesFiltro ? inversiones.filter((x) => isoMonth(x.fecha) === mesFiltro) : inversiones, [inversiones, mesFiltro]);

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
    const cajaTeorica      = inversiones.reduce((a,x)=>a+x.valor,0) + ventas.reduce((a,x)=>a+x.total,0) - compras.reduce((a,x)=>a+x.total,0) - gastos.reduce((a,x)=>a+x.valor,0);

    // Inventario
    const conStock          = catalogo.filter((x) => x.stock > 0);
    const valorInventarioCosto = conStock.reduce((a, i) => a + i.stock * i.costo, 0);
    const valorInventarioVenta = conStock.reduce((a, i) => a + i.stock * (i.precioVenta || 0), 0);
    const margenInventario  = valorInventarioVenta > 0 ? ((valorInventarioVenta - valorInventarioCosto) / valorInventarioVenta) * 100 : 0;
    const skusCriticos      = catalogo.filter((x) => x.stock > 0 && x.stock <= 2).length;
    const skusConStock      = conStock.length;
    const skusSinPrecio     = conStock.filter((x) => !x.precioVenta || x.precioVenta === 0).length;

    // Cartera
    const carteraPendiente = ventas.reduce((a, v) => {
      let creditoBase = 0;
      if (v.pagos?.length > 0) {
        const sum = v.pagos.reduce((s, p) => s + p.monto, 0);
        creditoBase = Math.max(0, v.total - sum);
      } else if (v.formaPago === "Crédito") {
        creditoBase = v.total;
      }
      const abonado = (v.abonos||[]).reduce((s, ab) => s + ab.valor, 0);
      return a + Math.max(0, creditoBase - abonado);
    }, 0);

    // Proveedores pendiente
    const cuentasPorPagar = compras.reduce((a, c) => {
      const creditoBase = c.pagos?.length > 0
        ? Math.max(0, c.total - c.pagos.reduce((s,p)=>s+p.monto,0))
        : c.formaPago === "Crédito" ? c.total : 0;
      const pagado = (c.pagosProv||[]).reduce((s,p)=>s+p.monto,0);
      return a + Math.max(0, creditoBase - pagado);
    }, 0);

    const ventasPorOrigen = vF.reduce((acc, v) => {
      acc[v.origen] = (acc[v.origen] || 0) + v.total;
      return acc;
    }, {});

    // Top proveedores por compras
    const proveedorMap = compras.reduce((acc, c) => {
      acc[c.proveedor] = (acc[c.proveedor] || 0) + c.total;
      return acc;
    }, {});
    const topProveedores = Object.entries(proveedorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, total]) => ({ nombre, total }));

    // Top productos por valor inventario
    const topInventario = [...conStock]
      .sort((a, b) => (b.stock * b.costo) - (a.stock * a.costo))
      .slice(0, 5);

    return {
      totalVentas, totalCostosVenta, totalGastos, utilidadBruta, utilidadNeta,
      margenBruto, margenNeto, totalCompras, totalInversiones, cajaTeorica,
      valorInventarioCosto, valorInventarioVenta, margenInventario,
      skusCriticos, skusConStock, skusSinPrecio,
      carteraPendiente, cuentasPorPagar,
      ventasPorOrigen, topProveedores, topInventario,
    };
  }, [vF, cF, gF, iF, catalogo, ventas, compras, gastos, inversiones]);

  const tendenciaData = useMemo(() => {
    return lastNMonths(6).map((m) => {
      const mv = ventas.filter((v) => isoMonth(v.fecha) === m);
      const mg = gastos.filter((g) => isoMonth(g.fecha) === m);
      const vt = mv.reduce((a, v) => a + v.total, 0);
      const vc = mv.reduce((a, v) => a + (v.costoTotal||0), 0);
      const vg = mg.reduce((a, g) => a + g.valor, 0);
      return {
        mes: monthLabel(m + "-01").split(" ")[0],
        Ventas: vt, Costo: vc, Utilidad: vt - vc - vg, Gastos: vg,
      };
    });
  }, [ventas, gastos]);

  const origenData = useMemo(() =>
    Object.entries(r.ventasPorOrigen).map(([name, value]) => ({ name, value })),
    [r.ventasPorOrigen]
  );

  const gastosData = useMemo(() => {
    const porCat = gastos.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
      return acc;
    }, {});
    return Object.entries(porCat).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({ name, value }));
  }, [gastos]);

  const hasData = ventas.length > 0;

  return (
    <div style={layout}>

      {/* Filtro período */}
      <div style={periodRow}>
        {meses.map((m) => (
          <button key={m} style={{ ...periodBtn, ...(mesFiltro === m ? periodBtnActive : {}) }}
            onClick={() => setMesFiltro(mesFiltro === m ? "" : m)}>
            {monthLabel(m + "-01").split(" ")[0]} {m.split("-")[0]}
          </button>
        ))}
        {mesFiltro && (
          <button style={{ ...periodBtn, color:"#ef4444", borderColor:"#fecaca" }}
            onClick={() => setMesFiltro("")}>✕ Limpiar</button>
        )}
      </div>

      {/* KPIs principales */}
      <div style={kpiRow}>
        <KpiCard label="Ventas" value={money(r.totalVentas)} sub={`${vF.length} transacciones`} accent="#f97316" icon="⬆" />
        <KpiCard label="Utilidad neta" value={money(r.utilidadNeta)}
          sub={`Margen ${r.margenNeto.toFixed(1)}%`}
          accent={r.utilidadNeta >= 0 ? "#10b981" : "#ef4444"}
          highlight={r.utilidadNeta >= 0 ? "positive" : "negative"} />
        <KpiCard label="Caja teórica" value={money(r.cajaTeorica)}
          sub="Posición estimada de efectivo"
          accent={r.cajaTeorica >= 0 ? "#10b981" : "#ef4444"}
          highlight={r.cajaTeorica >= 0 ? "positive" : "negative"} />
        <KpiCard label="Cartera por cobrar" value={money(r.carteraPendiente)}
          sub={r.carteraPendiente > 0 ? "Ventas a crédito sin cobrar" : "Sin cartera pendiente"}
          accent={r.carteraPendiente > 0 ? "#f59e0b" : "#10b981"}
          highlight={r.carteraPendiente > 0 ? undefined : "positive"} />
      </div>

      {/* KPIs secundarios */}
      <div style={kpiRow2}>
        <MiniKpi label="Compras" value={money(r.totalCompras)} color="#ef4444" />
        <MiniKpi label="Utilidad bruta" value={money(r.utilidadBruta)} sub={`${r.margenBruto.toFixed(1)}%`} color={r.utilidadBruta >= 0 ? "#10b981" : "#ef4444"} />
        <MiniKpi label="Gastos operativos" value={money(r.totalGastos)} color="#f59e0b" />
        <MiniKpi label="Prov. por pagar" value={money(r.cuentasPorPagar)} color={r.cuentasPorPagar > 0 ? "#dc2626" : "#10b981"} />
        <MiniKpi label="Capital aportado" value={money(r.totalInversiones)} color="#6366f1" />
      </div>

      {/* Inventario valorizado */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        <div style={invCard}>
          <div style={invLabel}>Inventario @ costo</div>
          <div style={invValue}>{money(r.valorInventarioCosto)}</div>
          <div style={invSub}>{r.skusConStock} SKUs con stock</div>
        </div>
        <div style={{ ...invCard, borderColor:"#a3e635", background:"linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
          <div style={invLabel}>Inventario @ venta est.</div>
          <div style={{ ...invValue, color:"#15803d" }}>{money(r.valorInventarioVenta)}</div>
          <div style={invSub}>Si se vende todo el stock</div>
        </div>
        <div style={{ ...invCard, borderColor:"#93c5fd", background:"linear-gradient(135deg,#eff6ff,#dbeafe)" }}>
          <div style={invLabel}>Margen potencial</div>
          <div style={{ ...invValue, color:"#1d4ed8" }}>
            {r.valorInventarioVenta > 0 ? `${r.margenInventario.toFixed(1)}%` : "—"}
          </div>
          <div style={invSub}>
            {r.skusSinPrecio > 0
              ? `${r.skusSinPrecio} prod. sin precio de venta`
              : money(r.valorInventarioVenta - r.valorInventarioCosto) + " de ganancia est."}
          </div>
        </div>
      </div>

      {/* Tendencia + Estado de resultados */}
      <div className="pg-two">
        <Panel title="Tendencia de ingresos" titleRight={<span style={chartLegend}>Últimos 6 meses</span>}>
          {!hasData ? (
            <EmptyState icon="📈" text="Registra ventas para ver la tendencia." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={tendenciaData} margin={{ top:4, right:4, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gUtilidad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:12, fill:"#94a3b8", fontWeight:600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1e3?`${(v/1e3).toFixed(0)}k`:v} width={50} />
                <Tooltip content={<MoneyTooltip />} />
                <Area type="monotone" dataKey="Ventas"   stroke="#f97316" strokeWidth={2.5} fill="url(#gVentas)"   dot={false} activeDot={{ r:4, fill:"#f97316" }} />
                <Area type="monotone" dataKey="Utilidad" stroke="#10b981" strokeWidth={2.5} fill="url(#gUtilidad)" dot={false} activeDot={{ r:4, fill:"#10b981" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Estado de resultados">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <FinRow label="(+) Ventas" value={money(r.totalVentas)} />
            <FinRow label="(−) Costo de ventas" value={money(r.totalCostosVenta)} type="cost" />
            <Divider />
            <FinRow label="= Utilidad bruta" value={money(r.utilidadBruta)} bold sub={`Margen ${r.margenBruto.toFixed(1)}%`} type={r.utilidadBruta >= 0 ? "profit" : "loss"} />
            <FinRow label="(−) Gastos operativos" value={money(r.totalGastos)} type="cost" />
            <Divider />
            <FinRow label="= Utilidad neta" value={money(r.utilidadNeta)} bold sub={`Margen ${r.margenNeto.toFixed(1)}%`} type={r.utilidadNeta >= 0 ? "profit" : "loss"} />
            <div style={{ marginTop:12, padding:"14px 16px", background:r.cajaTeorica>=0?"#f0fdf4":"#fef2f2", borderRadius:12, border:`1px solid ${r.cajaTeorica>=0?"#bbf7d0":"#fecaca"}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:4 }}>POSICIÓN DE CAJA TEÓRICA</div>
              <div style={{ fontSize:24, fontWeight:900, color:r.cajaTeorica>=0?"#059669":"#dc2626" }}>{money(r.cajaTeorica)}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Comparativa mensual */}
      {hasData && (
        <Panel title="Comparativa mensual" titleRight={<span style={chartLegend}>Ventas vs Gastos vs Utilidad</span>}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tendenciaData} barGap={4} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize:12, fill:"#94a3b8", fontWeight:600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v>=1e3?`${(v/1e3).toFixed(0)}k`:v} width={46} />
              <Tooltip content={<MoneyTooltip />} />
              <Bar dataKey="Ventas"   fill="#f97316" radius={[4,4,0,0]} maxBarSize={36} />
              <Bar dataKey="Gastos"   fill="#8b5cf6" radius={[4,4,0,0]} maxBarSize={36} />
              <Bar dataKey="Utilidad" fill="#10b981" radius={[4,4,0,0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:20, marginTop:12, justifyContent:"center" }}>
            {[["Ventas","#f97316"],["Gastos","#8b5cf6"],["Utilidad","#10b981"]].map(([l,c]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#64748b", fontWeight:600 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:c }} />{l}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Ventas por origen + Gastos por categoría */}
      <div className="pg-two">
        <Panel title="Ventas por origen">
          {origenData.length === 0 ? (
            <EmptyState text="Sin ventas registradas." />
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
              <ResponsiveContainer width="50%" height={180} minWidth={120}>
                <PieChart>
                  <Pie data={origenData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {origenData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                {origenData.map((item, i) => (
                  <div key={item.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:PIE_COLORS[i], flexShrink:0 }} />
                      <span style={{ fontSize:13, color:"#64748b" }}>{item.name}</span>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800, fontSize:14 }}>{money(item.value)}</div>
                      <div style={{ fontSize:12, color:"#94a3b8" }}>{pct(item.value, r.totalVentas)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Gastos por categoría">
          {gastosData.length === 0 ? (
            <EmptyState text="Sin gastos registrados." />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {gastosData.map((item, i) => {
                const maxVal = gastosData[0]?.value || 1;
                return (
                  <div key={item.name}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#334155" }}>{item.name}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:"#dc2626" }}>{money(item.value)}</span>
                    </div>
                    <div style={{ height:6, background:"#f1f5f9", borderRadius:99 }}>
                      <div style={{ height:"100%", width:`${(item.value/maxVal)*100}%`, background:`hsl(${270+i*15},70%,60%)`, borderRadius:99, transition:"width .4s ease" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop:4, paddingTop:10, borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:700 }}>Total</span>
                <span style={{ fontSize:13, fontWeight:900, color:"#dc2626" }}>{money(r.totalGastos)}</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Top inventario + Top proveedores */}
      <div className="pg-two">
        <Panel title="Top productos por valor en inventario">
          {r.topInventario.length === 0 ? (
            <EmptyState text="Sin stock registrado." />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {r.topInventario.map((item, i) => {
                const valorCosto = item.stock * item.costo;
                const valorVenta = item.stock * (item.precioVenta || 0);
                return (
                  <div key={item.sku} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:"#f97316", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"white", flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.nombre}</div>
                      <div style={{ fontSize:12, color:"#94a3b8" }}>{item.sku} · {item.stock} und</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontWeight:800, fontSize:13 }}>{money(valorCosto)}</div>
                      {valorVenta > 0 && <div style={{ fontSize:11, color:"#059669", fontWeight:600 }}>↑ {money(valorVenta)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Top proveedores por compras">
          {r.topProveedores.length === 0 ? (
            <EmptyState text="Sin compras registradas." />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {r.topProveedores.map((prov, i) => {
                const maxVal = r.topProveedores[0]?.total || 1;
                return (
                  <div key={prov.nombre}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:22, height:22, borderRadius:6, background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"white" }}>{i+1}</div>
                        <span style={{ fontSize:13, fontWeight:600 }}>{prov.nombre}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:800 }}>{money(prov.total)}</span>
                    </div>
                    <div style={{ height:5, background:"#f1f5f9", borderRadius:99 }}>
                      <div style={{ height:"100%", width:`${(prov.total/maxVal)*100}%`, background:"#0f172a", borderRadius:99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Alertas */}
      {(r.skusCriticos > 0 || r.carteraPendiente > 0 || r.cuentasPorPagar > 0 || r.skusSinPrecio > 0) && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {r.skusCriticos > 0 && <AlertCard type="warning" title={`${r.skusCriticos} SKU${r.skusCriticos>1?"s":""} con stock crítico (≤2)`} text="Revisa Inventario para ver los productos con pocas unidades." />}
          {r.carteraPendiente > 0 && <AlertCard type="warning" title={`Cartera por cobrar: ${money(r.carteraPendiente)}`} text="Hay ventas a crédito sin cobrar. Revisa Cartera → Cuentas por cobrar." />}
          {r.cuentasPorPagar > 0 && <AlertCard type="error" title={`Cuentas por pagar: ${money(r.cuentasPorPagar)}`} text="Hay compras a crédito sin cancelar a proveedores. Revisa Cartera → Cuentas por pagar." />}
          {r.skusSinPrecio > 0 && <AlertCard type="info" title={`${r.skusSinPrecio} producto${r.skusSinPrecio>1?"s":""} sin precio de venta`} text="Define precios de venta en Inventario → Catálogo para ver el margen potencial." />}
        </div>
      )}
    </div>
  );
}

function MiniKpi({ label, value, sub, color }) {
  return (
    <div style={{ background:"white", borderRadius:12, padding:"14px 18px", border:"1px solid #e2e8f0", flex:1, minWidth:140 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color:color||"#0f172a", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function AlertCard({ type, title, text }) {
  const colors = {
    warning: { bg:"#fffbeb", border:"#fcd34d", title:"#92400e", dot:"#f59e0b" },
    error:   { bg:"#fef2f2", border:"#fca5a5", title:"#991b1b", dot:"#ef4444" },
    info:    { bg:"#eff6ff", border:"#93c5fd", title:"#1e40af", dot:"#3b82f6" },
  };
  const c = colors[type] || colors.warning;
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"14px 16px", display:"flex", gap:12 }}>
      <div style={{ width:8, height:8, borderRadius:"50%", background:c.dot, flexShrink:0, marginTop:4 }} />
      <div>
        <div style={{ fontWeight:700, color:c.title, marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:13, color:c.title, opacity:.8 }}>{text}</div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const layout    = { display:"flex", flexDirection:"column", gap:20 };
const kpiRow    = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:14 };
const kpiRow2   = { display:"flex", gap:12, flexWrap:"wrap" };
const periodRow = { display:"flex", gap:6, flexWrap:"wrap", paddingBottom:4 };
const periodBtn = { border:"1px solid #e2e8f0", background:"white", color:"#64748b", borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer" };
const periodBtnActive = { background:"#0f172a", border:"1px solid #0f172a", color:"white" };
const chartLegend = { fontSize:12, color:"#94a3b8", fontWeight:600 };
const tooltipBox  = { background:"#0f172a", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"10px 14px", minWidth:140, boxShadow:"0 8px 24px rgba(0,0,0,.3)" };
const tooltipLabel = { color:"#64748b", fontSize:12, marginBottom:6, fontWeight:600 };

const invCard  = { background:"linear-gradient(135deg,#fafaf9,#f5f5f4)", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"18px 20px" };
const invLabel = { fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 };
const invValue = { fontSize:26, fontWeight:900, color:"#0f172a", lineHeight:1, marginBottom:6 };
const invSub   = { fontSize:12, color:"#94a3b8" };
