import { useMemo, useState } from "react";
import { money, uid, today } from "../utils.js";
import {
  Panel, SectionHeader, KpiCard, DataTable, Field, inputStyle, selectStyle,
  FormGrid, DarkBtn, EmptyState, s,
} from "../ui.jsx";

/**
 * Módulo Caja: muestra el saldo real por cuenta de dinero.
 * El saldo se calcula dinámicamente a partir de:
 *  + saldoInicial de la cuenta
 *  + inversiones dirigidas a esa cuenta
 *  + ventas contado recibidas en esa cuenta (+ abonos de crédito)
 *  - compras contado pagadas desde esa cuenta
 *  - gastos pagados desde esa cuenta
 */
export default function Caja({
  cuentas, setCuentas,
  compras, ventas, gastos, inversiones,
}) {
  const [editSaldo, setEditSaldo] = useState(null); // { id, valor }

  const resumenCuentas = useMemo(() => {
    return cuentas.map((cuenta) => {
      let saldo = Number(cuenta.saldoInicial || 0);

      // + Inversiones
      inversiones.forEach((inv) => {
        if (inv.cuentaId === cuenta.id) saldo += inv.valor;
      });

      // + Ventas contado
      ventas.forEach((v) => {
        if (v.formaPago === "Contado" && v.cuentaId === cuenta.id) saldo += v.total;
        // + Abonos de ventas a crédito
        (v.abonos || []).forEach((ab) => {
          if (ab.cuentaId === cuenta.id) saldo += ab.valor;
        });
      });

      // - Compras contado
      compras.forEach((c) => {
        if (c.formaPago === "Contado" && c.cuentaId === cuenta.id) saldo -= c.total;
      });

      // - Gastos
      gastos.forEach((g) => {
        if (g.cuentaId === cuenta.id) saldo -= g.valor;
      });

      return { ...cuenta, saldoActual: saldo };
    });
  }, [cuentas, compras, ventas, gastos, inversiones]);

  const totalCaja = resumenCuentas.reduce((a, c) => a + c.saldoActual, 0);

  // Movimientos recientes (todos los que tienen cuentaId)
  const movimientos = useMemo(() => {
    const mov = [];

    inversiones.forEach((inv) => {
      if (!inv.cuentaId) return;
      const cuenta = cuentas.find((c) => c.id === inv.cuentaId);
      mov.push({ fecha: inv.fecha, tipo:"Ingreso", concepto:`Aporte: ${inv.socio}`, valor: inv.valor, cuenta: cuenta?.nombre || "—", signo:"+" });
    });

    ventas.forEach((v) => {
      if (v.formaPago === "Contado" && v.cuentaId) {
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
      if (c.formaPago === "Contado" && c.cuentaId) {
        const cuenta = cuentas.find((cu) => cu.id === c.cuentaId);
        mov.push({ fecha: c.fecha, tipo:"Egreso", concepto:`Compra: ${c.proveedor}`, valor: c.total, cuenta: cuenta?.nombre || "—", signo:"-" });
      }
    });

    gastos.forEach((g) => {
      if (!g.cuentaId) return;
      const cuenta = cuentas.find((c) => c.id === g.cuentaId);
      mov.push({ fecha: g.fecha, tipo:"Egreso", concepto:`Gasto: ${g.categoria} · ${g.descripcion || ""}`, valor: g.valor, cuenta: cuenta?.nombre || "—", signo:"-" });
    });

    return mov.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [cuentas, compras, ventas, gastos, inversiones]);

  function guardarSaldoInicial() {
    if (!editSaldo) return;
    setCuentas((prev) => prev.map((c) =>
      c.id === editSaldo.id ? { ...c, saldoInicial: Number(editSaldo.valor || 0) } : c
    ));
    setEditSaldo(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="Caja"
        subtitle="Saldo real por cuenta de dinero, calculado desde todos los movimientos"
      />

      {/* Saldo total */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:14 }}>
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
            highlight={cuenta.saldoActual >= 0 ? "positive" : cuenta.saldoActual < 0 ? "negative" : undefined}
          />
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20, alignItems:"start" }}>
        {/* Configurar saldos iniciales */}
        <Panel title="Saldo inicial por cuenta">
          <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px" }}>
            El saldo inicial representa el dinero que ya tenías en cada cuenta antes de registrar movimientos en el sistema.
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

        {/* Movimientos */}
        <Panel title={`Movimientos registrados (${movimientos.length})`}>
          {movimientos.length === 0 ? (
            <EmptyState icon="💳" text="Aún no hay movimientos vinculados a cuentas. Al registrar compras/ventas/gastos, selecciona la cuenta correspondiente." />
          ) : (
            <DataTable
              headers={["Fecha","Tipo","Concepto","Cuenta","Valor"]}
              rows={movimientos.map((m) => [
                m.fecha,
                <span style={{ fontSize:12, fontWeight:700, color: m.signo === "+" ? "#065f46" : "#991b1b",
                  background: m.signo === "+" ? "#d1fae5" : "#fee2e2", borderRadius:6, padding:"3px 8px" }}>
                  {m.tipo}
                </span>,
                <span style={{ fontSize:13 }}>{m.concepto}</span>,
                <span style={{ fontSize:13, fontWeight:600 }}>{m.cuenta}</span>,
                <span style={{ fontWeight:900, color: m.signo === "+" ? "#059669" : "#dc2626" }}>
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
