import { useMemo, useState } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, KpiCard, DataTable, Field, inputStyle, selectStyle,
  FormGrid, DarkBtn, EmptyState, s,
} from "../ui.jsx";

/**
 * Módulo Caja: saldo real por cuenta de dinero.
 * Calcula dinámicamente desde:
 *  + saldoInicial de la cuenta
 *  + inversiones dirigidas a esa cuenta
 *  + ventas (usando pagos[] o legacy formaPago/cuentaId)
 *  + abonos de crédito recibidos
 *  - compras (usando pagos[] o legacy)
 *  - pagos a proveedores (pagosProv)
 *  - gastos
 *  +/- transferencias entre cuentas
 */
export default function Caja({
  cuentas, setCuentas,
  compras, ventas, gastos, inversiones,
  transferencias = [],
  onUpdateSaldo,
  onTransferencia,
}) {
  const [editSaldo, setEditSaldo] = useState(null);
  const [trForm, setTrForm] = useState({ fecha:today(), deCuentaId:"", aCuentaId:"", monto:"", nota:"" });
  const [showTrForm, setShowTrForm] = useState(false);

  const resumenCuentas = useMemo(() => {
    return cuentas.map((cuenta) => {
      let saldo = Number(cuenta.saldoInicial || 0);

      // + Inversiones
      inversiones.forEach((inv) => {
        if (inv.cuentaId === cuenta.id) saldo += inv.valor;
      });

      // + Ventas (pagos array preferred; legacy cuentaId fallback)
      ventas.forEach((v) => {
        if (v.pagos?.length > 0) {
          v.pagos.forEach((p) => { if (p.cuentaId === cuenta.id) saldo += p.monto; });
        } else if (v.formaPago === "Contado" && v.cuentaId === cuenta.id) {
          saldo += v.total;
        }
        // + Abonos (cobros parciales de crédito)
        (v.abonos || []).forEach((ab) => {
          if (ab.cuentaId === cuenta.id) saldo += ab.valor;
        });
      });

      // - Compras (pagos array preferred; legacy cuentaId fallback)
      compras.forEach((c) => {
        if (c.pagos?.length > 0) {
          c.pagos.forEach((p) => { if (p.cuentaId === cuenta.id) saldo -= p.monto; });
        } else if (c.formaPago === "Contado" && c.cuentaId === cuenta.id) {
          saldo -= c.total;
        }
        // - Pagos a proveedores (crédito saldado)
        (c.pagosProv || []).forEach((p) => {
          if (p.cuentaId === cuenta.id) saldo -= p.monto;
        });
      });

      // - Gastos
      gastos.forEach((g) => {
        if (g.cuentaId === cuenta.id) saldo -= g.valor;
      });

      // +/- Transferencias
      transferencias.forEach((t) => {
        if (t.deCuentaId === cuenta.id) saldo -= t.monto;
        if (t.aCuentaId  === cuenta.id) saldo += t.monto;
      });

      return { ...cuenta, saldoActual: saldo };
    });
  }, [cuentas, compras, ventas, gastos, inversiones, transferencias]);

  const totalCaja = resumenCuentas.reduce((a, c) => a + c.saldoActual, 0);

  // Movimientos recientes
  const movimientos = useMemo(() => {
    const mov = [];

    inversiones.forEach((inv) => {
      if (!inv.cuentaId) return;
      const cuenta = cuentas.find((c) => c.id === inv.cuentaId);
      mov.push({ fecha: inv.fecha, tipo:"Ingreso", concepto:`Aporte: ${inv.socio}`, valor: inv.valor, cuenta: cuenta?.nombre || "—", signo:"+" });
    });

    ventas.forEach((v) => {
      if (v.pagos?.length > 0) {
        v.pagos.forEach((p) => {
          const cuenta = cuentas.find((c) => c.id === p.cuentaId);
          mov.push({ fecha: v.fecha, tipo:"Ingreso", concepto:`Venta: ${v.cliente}`, valor: p.monto, cuenta: cuenta?.nombre || "—", signo:"+" });
        });
      } else if (v.formaPago === "Contado" && v.cuentaId) {
        const cuenta = cuentas.find((c) => c.id === v.cuentaId);
        mov.push({ fecha: v.fecha, tipo:"Ingreso", concepto:`Venta: ${v.cliente}`, valor: v.total, cuenta: cuenta?.nombre || "—", signo:"+" });
      }
      (v.abonos || []).forEach((ab) => {
        if (!ab.cuentaId) return;
        const cuenta = cuentas.find((c) => c.id === ab.cuentaId);
        mov.push({ fecha: ab.fecha, tipo:"Ingreso", concepto:`Abono cartera: ${v.cliente}`, valor: ab.valor, cuenta: cuenta?.nombre || "—", signo:"+" });
      });
    });

    compras.forEach((c) => {
      if (c.pagos?.length > 0) {
        c.pagos.forEach((p) => {
          const cuenta = cuentas.find((cu) => cu.id === p.cuentaId);
          mov.push({ fecha: c.fecha, tipo:"Egreso", concepto:`Compra: ${c.proveedor}`, valor: p.monto, cuenta: cuenta?.nombre || "—", signo:"-" });
        });
      } else if (c.formaPago === "Contado" && c.cuentaId) {
        const cuenta = cuentas.find((cu) => cu.id === c.cuentaId);
        mov.push({ fecha: c.fecha, tipo:"Egreso", concepto:`Compra: ${c.proveedor}`, valor: c.total, cuenta: cuenta?.nombre || "—", signo:"-" });
      }
      (c.pagosProv || []).forEach((p) => {
        if (!p.cuentaId) return;
        const cuenta = cuentas.find((cu) => cu.id === p.cuentaId);
        mov.push({ fecha: p.fecha, tipo:"Egreso", concepto:`Pago proveedor: ${c.proveedor}`, valor: p.monto, cuenta: cuenta?.nombre || "—", signo:"-" });
      });
    });

    gastos.forEach((g) => {
      if (!g.cuentaId) return;
      const cuenta = cuentas.find((c) => c.id === g.cuentaId);
      mov.push({ fecha: g.fecha, tipo:"Egreso", concepto:`Gasto: ${g.categoria}${g.descripcion ? " · " + g.descripcion : ""}`, valor: g.valor, cuenta: cuenta?.nombre || "—", signo:"-" });
    });

    transferencias.forEach((t) => {
      const de = cuentas.find((c) => c.id === t.deCuentaId)?.nombre || "—";
      const a  = cuentas.find((c) => c.id === t.aCuentaId)?.nombre  || "—";
      mov.push({ fecha: t.fecha, tipo:"Transferencia", concepto:`Traslado${t.nota ? ": " + t.nota : ""}`, valor: t.monto, cuenta: `${de} → ${a}`, signo:"↔" });
    });

    return mov.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [cuentas, compras, ventas, gastos, inversiones, transferencias]);

  function guardarSaldoInicial() {
    if (!editSaldo) return;
    onUpdateSaldo(editSaldo.id, Number(editSaldo.valor || 0));
    setEditSaldo(null);
  }

  function guardarTransferencia() {
    const monto = Number(trForm.monto || 0);
    if (!trForm.deCuentaId || !trForm.aCuentaId || monto <= 0) return;
    if (trForm.deCuentaId === trForm.aCuentaId) return;
    onTransferencia({ fecha: trForm.fecha, deCuentaId: trForm.deCuentaId, aCuentaId: trForm.aCuentaId, monto, nota: trForm.nota });
    setTrForm({ fecha:today(), deCuentaId:"", aCuentaId:"", monto:"", nota:"" });
    setShowTrForm(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="Caja"
        subtitle="Saldo real por cuenta de dinero, calculado desde todos los movimientos"
      />

      {/* Saldo total */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:14 }}>
        <KpiCard
          label="Saldo total en caja"
          value={money(totalCaja)}
          sub="Suma de todas las cuentas"
          accent={totalCaja >= 0 ? "#10b981" : "#ef4444"}
          size="lg"
          highlight={totalCaja >= 0 ? "positive" : "negative"}
        />
        {resumenCuentas.map((cuenta) => (
          <KpiCard
            key={cuenta.id}
            label={cuenta.nombre}
            value={money(cuenta.saldoActual)}
            sub={`Saldo inicial: ${money(cuenta.saldoInicial)}`}
            accent={cuenta.color}
            highlight={cuenta.saldoActual > 0 ? "positive" : cuenta.saldoActual < 0 ? "negative" : undefined}
          />
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:20, alignItems:"start" }}>
        {/* Panel izquierdo: saldo inicial + transferencias */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Transferencias entre cuentas */}
          <Panel title="Mover dinero entre cuentas">
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 14px" }}>
              Registra un traslado de fondos entre tus medios de pago (Efectivo → Nequi, etc.).
            </p>
            {showTrForm ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <FormGrid>
                  <Field label="Fecha">
                    <input type="date" style={inputStyle} value={trForm.fecha}
                      onChange={(e) => setTrForm({ ...trForm, fecha: e.target.value })} />
                  </Field>
                  <Field label="Monto">
                    <input type="number" style={inputStyle} placeholder="0" value={trForm.monto}
                      onChange={(e) => setTrForm({ ...trForm, monto: e.target.value })} />
                  </Field>
                  <Field label="Desde (origen)">
                    <select style={selectStyle} value={trForm.deCuentaId}
                      onChange={(e) => setTrForm({ ...trForm, deCuentaId: e.target.value })}>
                      <option value="">— Selecciona —</option>
                      {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </Field>
                  <Field label="Hacia (destino)">
                    <select style={selectStyle} value={trForm.aCuentaId}
                      onChange={(e) => setTrForm({ ...trForm, aCuentaId: e.target.value })}>
                      <option value="">— Selecciona —</option>
                      {cuentas.filter((c) => c.id !== trForm.deCuentaId).map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nota (opcional)" wide>
                    <input style={inputStyle} placeholder="Ej: Depósito a Nequi" value={trForm.nota}
                      onChange={(e) => setTrForm({ ...trForm, nota: e.target.value })} />
                  </Field>
                </FormGrid>
                {trForm.deCuentaId && trForm.aCuentaId && Number(trForm.monto) > 0 && (
                  <div style={{ fontSize:13, color:"#1d4ed8", background:"#dbeafe", borderRadius:8, padding:"8px 12px" }}>
                    Mover {money(Number(trForm.monto))} de <strong>{cuentas.find(c=>c.id===trForm.deCuentaId)?.nombre}</strong> a <strong>{cuentas.find(c=>c.id===trForm.aCuentaId)?.nombre}</strong>
                  </div>
                )}
                <DarkBtn onClick={guardarTransferencia}>Registrar traslado</DarkBtn>
                <button style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:"10px", background:"white", cursor:"pointer", fontWeight:700, color:"#475569" }}
                  onClick={() => setShowTrForm(false)}>Cancelar</button>
              </div>
            ) : (
              <button style={{ border:"1.5px dashed #cbd5e1", background:"transparent", color:"#475569", borderRadius:10, padding:"12px 16px", fontWeight:700, cursor:"pointer", fontSize:14, width:"100%" }}
                onClick={() => setShowTrForm(true)}>
                + Nuevo traslado
              </button>
            )}
            {/* Historial de transferencias */}
            {transferencias.length > 0 && (
              <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>Historial</div>
                {[...transferencias].sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,8).map((t) => {
                  const de = cuentas.find(c=>c.id===t.deCuentaId)?.nombre || "—";
                  const a  = cuentas.find(c=>c.id===t.aCuentaId)?.nombre  || "—";
                  return (
                    <div key={t.id} style={{ fontSize:13, display:"flex", justifyContent:"space-between", padding:"6px 8px", background:"#f8fafc", borderRadius:8 }}>
                      <span style={{ color:"#475569" }}>{t.fecha} · {de} → {a}{t.nota ? " · "+t.nota : ""}</span>
                      <span style={{ fontWeight:700 }}>{money(t.monto)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Saldo inicial por cuenta */}
          <Panel title="Saldo inicial por cuenta">
            <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px" }}>
              El saldo inicial representa el dinero que ya tenías en cada cuenta antes de registrar movimientos.
            </p>
            {editSaldo ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <Field label={`Saldo inicial — ${cuentas.find((c) => c.id === editSaldo.id)?.nombre}`}>
                  <input type="number" style={inputStyle} value={editSaldo.valor}
                    onChange={(e) => setEditSaldo({ ...editSaldo, valor: e.target.value })} />
                </Field>
                <DarkBtn onClick={guardarSaldoInicial}>Guardar saldo</DarkBtn>
                <button style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:"10px", background:"white", cursor:"pointer", fontWeight:700, color:"#475569" }}
                  onClick={() => setEditSaldo(null)}>Cancelar</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {resumenCuentas.map((c) => (
                  <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                    <div>
                      <div style={{ fontWeight:700, color:"#0f172a" }}>{c.nombre}</div>
                      <div style={{ fontSize:13, color:"#64748b" }}>Saldo inicial: {money(c.saldoInicial)}</div>
                    </div>
                    <button style={{ border:"none", background:"#eff6ff", color:"#1d4ed8", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:13 }}
                      onClick={() => setEditSaldo({ id: c.id, valor: c.saldoInicial })}>
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Movimientos */}
        <Panel title={`Movimientos registrados (${movimientos.length})`}>
          {movimientos.length === 0 ? (
            <EmptyState icon="💳" text="Aún no hay movimientos vinculados a cuentas. Al registrar compras/ventas/gastos, selecciona la cuenta correspondiente." />
          ) : (
            <DataTable
              headers={["Fecha","Tipo","Concepto","Cuenta","Valor"]}
              rows={movimientos.map((m) => [
                m.fecha,
                <span style={{
                  fontSize:12, fontWeight:700,
                  color: m.signo === "+" ? "#065f46" : m.signo === "↔" ? "#1d4ed8" : "#991b1b",
                  background: m.signo === "+" ? "#d1fae5" : m.signo === "↔" ? "#dbeafe" : "#fee2e2",
                  borderRadius:6, padding:"3px 8px"
                }}>
                  {m.tipo}
                </span>,
                <span style={{ fontSize:13 }}>{m.concepto}</span>,
                <span style={{ fontSize:13, fontWeight:600 }}>{m.cuenta}</span>,
                <span style={{ fontWeight:900, color: m.signo === "+" ? "#059669" : m.signo === "↔" ? "#1d4ed8" : "#dc2626" }}>
                  {m.signo}{money(m.valor)}
                </span>,
              ])}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
