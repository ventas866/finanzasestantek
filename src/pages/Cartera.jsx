import { useMemo, useState } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, KpiCard, Field, inputStyle, selectStyle,
  FormGrid, PrimaryBtn, EmptyState, Alert, DataTable, s,
} from "../ui.jsx";

/**
 * Módulo Cartera:
 *  - Cuentas por cobrar: ventas a crédito con saldo pendiente
 *  - Cuentas por pagar: compras a crédito pendientes
 *  - Registro de abonos a ventas a crédito
 */
export default function Cartera({
  ventas, setVentas,
  compras,
  cuentas,
}) {
  const [abonoForm, setAbonoForm] = useState({ ventaId:"", valor:"", fecha: today(), cuentaId:"", nota:"" });
  const [showAbonoFor, setShowAbonoFor] = useState(null); // ventaId

  const cuentasPorCobrar = useMemo(() => {
    return ventas
      .filter((v) => v.formaPago === "Crédito")
      .map((v) => {
        const abonado   = (v.abonos || []).reduce((a, x) => a + x.valor, 0);
        const pendiente = Math.max(0, v.total - abonado);
        return { ...v, abonado, pendiente, saldado: pendiente === 0 };
      })
      .sort((a, b) => b.pendiente - a.pendiente);
  }, [ventas]);

  const cuentasPorPagar = useMemo(() => {
    return compras
      .filter((c) => c.formaPago === "Crédito")
      .map((c) => ({ ...c, pendiente: c.total })) // en MVP: sin pagos parciales a compras
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [compras]);

  const totalPorCobrar = cuentasPorCobrar.reduce((a, v) => a + v.pendiente, 0);
  const totalPorPagar  = cuentasPorPagar.reduce((a, c) => a + c.pendiente, 0);

  function registrarAbono() {
    const valor = Number(abonoForm.valor || 0);
    if (!abonoForm.ventaId || valor <= 0) return;

    setVentas((prev) => prev.map((v) => {
      if (v.id !== abonoForm.ventaId) return v;
      const abonos = [...(v.abonos || []), {
        id: uid(), fecha: abonoForm.fecha, valor, cuentaId: abonoForm.cuentaId, nota: abonoForm.nota,
      }];
      const abonado = abonos.reduce((a, x) => a + x.valor, 0);
      return { ...v, abonos };
    }));

    setAbonoForm({ ventaId:"", valor:"", fecha: today(), cuentaId:"", nota:"" });
    setShowAbonoFor(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="Cartera"
        subtitle="Gestión de cuentas por cobrar y cuentas por pagar"
      />

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:14 }}>
        <KpiCard
          label="Por cobrar"
          value={money(totalPorCobrar)}
          sub={`${cuentasPorCobrar.filter((v) => !v.saldado).length} ventas pendientes`}
          accent={totalPorCobrar > 0 ? "#f59e0b" : "#10b981"}
          highlight={totalPorCobrar > 0 ? undefined : "positive"}
        />
        <KpiCard
          label="Por pagar"
          value={money(totalPorPagar)}
          sub={`${cuentasPorPagar.length} compras a crédito`}
          accent={totalPorPagar > 0 ? "#ef4444" : "#10b981"}
          highlight={totalPorPagar > 0 ? "negative" : "positive"}
        />
        <KpiCard
          label="Posición neta"
          value={money(totalPorCobrar - totalPorPagar)}
          sub="Por cobrar − Por pagar"
          accent={(totalPorCobrar - totalPorPagar) >= 0 ? "#10b981" : "#ef4444"}
          highlight={(totalPorCobrar - totalPorPagar) >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Cuentas por cobrar */}
      <Panel title="Cuentas por cobrar">
        {cuentasPorCobrar.length === 0 ? (
          <EmptyState icon="📥" text="No hay ventas a crédito registradas." />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {cuentasPorCobrar.map((v) => (
              <div key={v.id} style={{ border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:15 }}>{v.cliente}</div>
                    <div style={{ fontSize:13, color:"#94a3b8" }}>{v.fecha} · {v.origen}</div>
                    {v.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{v.descripcion}</div>}
                    {/* Abonos */}
                    {(v.abonos || []).length > 0 && (
                      <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                        {v.abonos.map((ab) => (
                          <div key={ab.id} style={{ fontSize:12, color:"#64748b" }}>
                            ✓ Abono {ab.fecha}: {money(ab.valor)}
                            {ab.cuentaId && ` → ${cuentas.find((c)=>c.id===ab.cuentaId)?.nombre}`}
                            {ab.nota && ` · ${ab.nota}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>Total: {money(v.total)}</div>
                    <div style={{ fontSize:12, color:"#64748b" }}>Abonado: {money(v.abonado)}</div>
                    <div style={{ fontWeight:900, fontSize:18, color: v.saldado ? "#059669" : "#f59e0b" }}>
                      {v.saldado ? "✓ Saldado" : money(v.pendiente)}
                    </div>
                  </div>
                </div>

                {!v.saldado && (
                  <div style={{ marginTop:12 }}>
                    {showAbonoFor === v.id ? (
                      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Registrar abono</div>
                        <FormGrid>
                          <Field label="Fecha">
                            <input type="date" style={inputStyle} value={abonoForm.fecha}
                              onChange={(e) => setAbonoForm({ ...abonoForm, fecha: e.target.value })} />
                          </Field>
                          <Field label="Monto abonado" hint={`Pendiente: ${money(v.pendiente)}`}>
                            <input type="number" style={inputStyle} value={abonoForm.valor}
                              onChange={(e) => setAbonoForm({ ...abonoForm, valor: e.target.value })} />
                          </Field>
                          <Field label="Cuenta donde entra">
                            <select style={selectStyle} value={abonoForm.cuentaId}
                              onChange={(e) => setAbonoForm({ ...abonoForm, cuentaId: e.target.value })}>
                              <option value="">— Sin cuenta —</option>
                              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                          </Field>
                          <Field label="Nota">
                            <input style={inputStyle} placeholder="Opcional" value={abonoForm.nota}
                              onChange={(e) => setAbonoForm({ ...abonoForm, nota: e.target.value })} />
                          </Field>
                        </FormGrid>
                        <div style={{ display:"flex", gap:8, marginTop:12 }}>
                          <button style={{ border:"none", borderRadius:8, padding:"9px 16px", background:"#10b981", color:"white", fontWeight:700, cursor:"pointer", fontSize:13 }}
                            onClick={registrarAbono}>
                            Registrar abono
                          </button>
                          <button style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"9px 16px", background:"white", color:"#475569", fontWeight:700, cursor:"pointer", fontSize:13 }}
                            onClick={() => setShowAbonoFor(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button style={{ border:"1px dashed #f59e0b", background:"#fffbeb", color:"#92400e", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}
                        onClick={() => { setShowAbonoFor(v.id); setAbonoForm({ ventaId: v.id, valor:"", fecha: today(), cuentaId:"", nota:"" }); }}>
                        + Registrar abono
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Cuentas por pagar */}
      <Panel title="Cuentas por pagar (compras a crédito)">
        {cuentasPorPagar.length === 0 ? (
          <EmptyState icon="📤" text="No hay compras a crédito pendientes." />
        ) : (
          <DataTable
            headers={["Fecha","Proveedor","Ítems","Total","Estado"]}
            rows={cuentasPorPagar.map((c) => [
              c.fecha,
              <span style={{ fontWeight:700 }}>{c.proveedor}</span>,
              `${(c.items||[]).length} ítems`,
              <span style={{ fontWeight:900, color:"#dc2626" }}>{money(c.total)}</span>,
              <span style={{ fontSize:12, fontWeight:700, color:"#92400e", background:"#fef3c7", borderRadius:6, padding:"3px 8px" }}>Pendiente</span>,
            ])}
          />
        )}
      </Panel>
    </div>
  );
}
