import { useMemo, useState } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, KpiCard, Field, inputStyle, selectStyle,
  FormGrid, PrimaryBtn, EmptyState, Alert, DataTable, s,
} from "../ui.jsx";

/**
 * Módulo Cartera:
 *  - Cuentas por cobrar: ventas con crédito pendiente (cobros parciales o totales)
 *  - Cuentas por pagar: compras con crédito pendiente (pagos parciales o totales a proveedores)
 */
export default function Cartera({
  ventas, compras, cuentas,
  onAbono,
  onPagarProveedor,
}) {
  const [abonoForm, setAbonoForm]       = useState({ ventaId:"", valor:"", fecha:today(), cuentaId:"", nota:"" });
  const [showAbonoFor, setShowAbonoFor] = useState(null);
  const [pagProvForm, setPagProvForm]   = useState({ compraId:"", monto:"", fecha:today(), cuentaId:"", nota:"" });
  const [showPagFor, setShowPagFor]     = useState(null);

  // Helper: crédito original de una venta (total − anticipo pagado al momento de la venta)
  function creditoBaseVenta(v) {
    if (v.pagos?.length > 0) {
      const sum = v.pagos.reduce((a, p) => a + p.monto, 0);
      return Math.max(0, v.total - sum);
    }
    if (v.formaPago === "Crédito" || v.formaPago === "Mixto") return v.total;
    return 0;
  }

  // Helper: crédito original de una compra
  function creditoBaseCompra(c) {
    if (c.pagos?.length > 0) {
      const sum = c.pagos.reduce((a, p) => a + p.monto, 0);
      return Math.max(0, c.total - sum);
    }
    if (c.formaPago === "Crédito" || c.formaPago === "Mixto") return c.total;
    return 0;
  }

  const cuentasPorCobrar = useMemo(() => {
    return ventas
      .map((v) => {
        const creditoBase = creditoBaseVenta(v);
        if (creditoBase <= 0) return null;
        const abonado   = (v.abonos || []).reduce((a, x) => a + x.valor, 0);
        const pendiente = Math.max(0, creditoBase - abonado);
        return { ...v, creditoBase, abonado, pendiente, saldado: pendiente === 0 };
      })
      .filter(Boolean)
      .sort((a, b) => b.pendiente - a.pendiente);
  }, [ventas]);

  const cuentasPorPagar = useMemo(() => {
    return compras
      .map((c) => {
        const creditoBase = creditoBaseCompra(c);
        if (creditoBase <= 0) return null;
        const pagado    = (c.pagosProv || []).reduce((a, p) => a + p.monto, 0);
        const pendiente = Math.max(0, creditoBase - pagado);
        return { ...c, creditoBase, pagado, pendiente, saldado: pendiente === 0 };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [compras]);

  const totalPorCobrar = cuentasPorCobrar.reduce((a, v) => a + v.pendiente, 0);
  const totalPorPagar  = cuentasPorPagar.reduce((a, c) => a + c.pendiente, 0);

  function registrarAbono() {
    const valor = Number(abonoForm.valor || 0);
    if (!abonoForm.ventaId || valor <= 0) return;
    const abono = { id:uid(), fecha:abonoForm.fecha, valor, cuentaId:abonoForm.cuentaId, nota:abonoForm.nota };
    onAbono(abonoForm.ventaId, abono);
    setAbonoForm({ ventaId:"", valor:"", fecha:today(), cuentaId:"", nota:"" });
    setShowAbonoFor(null);
  }

  function registrarPagProv() {
    const monto = Number(pagProvForm.monto || 0);
    if (!pagProvForm.compraId || monto <= 0) return;
    onPagarProveedor(pagProvForm.compraId, {
      fecha: pagProvForm.fecha, monto, cuentaId: pagProvForm.cuentaId, nota: pagProvForm.nota,
    });
    setPagProvForm({ compraId:"", monto:"", fecha:today(), cuentaId:"", nota:"" });
    setShowPagFor(null);
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
          sub={`${cuentasPorCobrar.filter((v) => !v.saldado).length} clientes pendientes`}
          accent={totalPorCobrar > 0 ? "#f59e0b" : "#10b981"}
          highlight={totalPorCobrar > 0 ? undefined : "positive"}
        />
        <KpiCard
          label="Por pagar"
          value={money(totalPorPagar)}
          sub={`${cuentasPorPagar.filter((c) => !c.saldado).length} proveedores pendientes`}
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

      {/* ── Cuentas por cobrar ── */}
      <Panel title="Cuentas por cobrar (clientes)">
        {cuentasPorCobrar.length === 0 ? (
          <EmptyState icon="📥" text="No hay ventas a crédito o mixtas con saldo pendiente." />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {cuentasPorCobrar.map((v) => (
              <div key={v.id} style={{ border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>{v.cliente}</div>
                    <div style={{ fontSize:13, color:"#94a3b8" }}>{v.fecha} · {v.origen}</div>
                    {v.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{v.descripcion}</div>}

                    {/* Pagos iniciales (anticipo) */}
                    {(v.pagos||[]).length > 0 && (
                      <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:6 }}>
                        {v.pagos.map((p,i) => (
                          <span key={i} style={{ fontSize:12, background:"#d1fae5", color:"#065f46", borderRadius:6, padding:"2px 8px", fontWeight:600 }}>
                            Anticipo: {cuentas.find(c=>c.id===p.cuentaId)?.nombre} {money(p.monto)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Abonos posteriores */}
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
                    <div style={{ fontSize:12, color:"#94a3b8" }}>Total venta: {money(v.total)}</div>
                    {v.creditoBase < v.total && (
                      <div style={{ fontSize:12, color:"#64748b" }}>Anticipo: {money(v.total - v.creditoBase)}</div>
                    )}
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
                        <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Registrar cobro / abono</div>
                        <FormGrid>
                          <Field label="Fecha">
                            <input type="date" style={inputStyle} value={abonoForm.fecha}
                              onChange={(e) => setAbonoForm({ ...abonoForm, fecha: e.target.value })} />
                          </Field>
                          <Field label="Monto" hint={`Pendiente: ${money(v.pendiente)}`}>
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
                            Registrar cobro
                          </button>
                          <button style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"9px 16px", background:"white", color:"#475569", fontWeight:700, cursor:"pointer", fontSize:13 }}
                            onClick={() => setShowAbonoFor(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button style={{ border:"1px dashed #f59e0b", background:"#fffbeb", color:"#92400e", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}
                        onClick={() => {
                          setShowAbonoFor(v.id);
                          setAbonoForm({ ventaId: v.id, valor:"", fecha:today(), cuentaId:"", nota:"" });
                        }}>
                        + Registrar cobro / abono
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Cuentas por pagar ── */}
      <Panel title="Cuentas por pagar (proveedores)">
        {cuentasPorPagar.length === 0 ? (
          <EmptyState icon="📤" text="No hay compras a crédito o mixtas con saldo pendiente." />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {cuentasPorPagar.map((c) => (
              <div key={c.id} style={{ border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>{c.proveedor}</div>
                    <div style={{ fontSize:13, color:"#94a3b8" }}>{c.fecha}</div>
                    {c.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{c.descripcion}</div>}

                    {/* Pagos iniciales (abono al comprar) */}
                    {(c.pagos||[]).length > 0 && (
                      <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:6 }}>
                        {c.pagos.map((p,i) => (
                          <span key={i} style={{ fontSize:12, background:"#fee2e2", color:"#991b1b", borderRadius:6, padding:"2px 8px", fontWeight:600 }}>
                            Anticipo: {cuentas.find(cu=>cu.id===p.cuentaId)?.nombre} {money(p.monto)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pagos posteriores al proveedor */}
                    {(c.pagosProv || []).length > 0 && (
                      <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                        {c.pagosProv.map((p) => (
                          <div key={p.id} style={{ fontSize:12, color:"#64748b" }}>
                            ✓ Pago {p.fecha}: {money(p.monto)}
                            {p.cuentaId && ` → ${cuentas.find(cu=>cu.id===p.cuentaId)?.nombre}`}
                            {p.nota && ` · ${p.nota}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>Total compra: {money(c.total)}</div>
                    {c.creditoBase < c.total && (
                      <div style={{ fontSize:12, color:"#64748b" }}>Anticipo: {money(c.total - c.creditoBase)}</div>
                    )}
                    <div style={{ fontSize:12, color:"#64748b" }}>Pagado: {money(c.pagado)}</div>
                    <div style={{ fontWeight:900, fontSize:18, color: c.saldado ? "#059669" : "#dc2626" }}>
                      {c.saldado ? "✓ Pagado" : money(c.pendiente)}
                    </div>
                  </div>
                </div>

                {!c.saldado && (
                  <div style={{ marginTop:12 }}>
                    {showPagFor === c.id ? (
                      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Registrar pago al proveedor</div>
                        <FormGrid>
                          <Field label="Fecha">
                            <input type="date" style={inputStyle} value={pagProvForm.fecha}
                              onChange={(e) => setPagProvForm({ ...pagProvForm, fecha: e.target.value })} />
                          </Field>
                          <Field label="Monto" hint={`Pendiente: ${money(c.pendiente)}`}>
                            <input type="number" style={inputStyle} value={pagProvForm.monto}
                              onChange={(e) => setPagProvForm({ ...pagProvForm, monto: e.target.value })} />
                          </Field>
                          <Field label="Cuenta de pago">
                            <select style={selectStyle} value={pagProvForm.cuentaId}
                              onChange={(e) => setPagProvForm({ ...pagProvForm, cuentaId: e.target.value })}>
                              <option value="">— Sin cuenta —</option>
                              {cuentas.map((cu) => <option key={cu.id} value={cu.id}>{cu.nombre}</option>)}
                            </select>
                          </Field>
                          <Field label="Nota">
                            <input style={inputStyle} placeholder="Opcional" value={pagProvForm.nota}
                              onChange={(e) => setPagProvForm({ ...pagProvForm, nota: e.target.value })} />
                          </Field>
                        </FormGrid>
                        <div style={{ display:"flex", gap:8, marginTop:12 }}>
                          <button style={{ border:"none", borderRadius:8, padding:"9px 16px", background:"#dc2626", color:"white", fontWeight:700, cursor:"pointer", fontSize:13 }}
                            onClick={registrarPagProv}>
                            Registrar pago
                          </button>
                          <button style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"9px 16px", background:"white", color:"#475569", fontWeight:700, cursor:"pointer", fontSize:13 }}
                            onClick={() => setShowPagFor(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button style={{ border:"1px dashed #ef4444", background:"#fef2f2", color:"#dc2626", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:13 }}
                        onClick={() => {
                          setShowPagFor(c.id);
                          setPagProvForm({ compraId: c.id, monto:"", fecha:today(), cuentaId:"", nota:"" });
                        }}>
                        + Registrar pago al proveedor
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
