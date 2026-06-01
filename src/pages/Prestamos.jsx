import { useState, useMemo } from "react";
import { money, today, uid } from "../utils.js";

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
  debt:       "#1565C0",
  debtBg:     "#E3F2FD",
  debtBorder: "#90CAF9",
  warn:       "#B45309",
  warnBg:     "#FFFBEB",
};

const TIPOS = ["Banco", "Particular", "Entidad financiera"];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Prestamos({ prestamos = [], cuentas = [], onSave, onDelete }) {
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [expandedId,  setExpandedId]  = useState(null);
  const [showPagoFor, setShowPagoFor] = useState(null); // prestamoId

  const [form, setForm] = useState({
    fecha: today(), nombre: "", tipo: "Banco",
    monto: "", tasaMensual: "", plazo: "",
    destino: "", cuentaId: "",
  });

  const [pagoForm, setPagoForm] = useState({
    fecha: today(), capital: "", interes: "", cuentaId: "", nota: "",
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalPrestado      = prestamos.reduce((a, p) => a + Number(p.monto || 0), 0);
    const totalCapitalPagado = prestamos.reduce((a, p) =>
      a + (p.pagos || []).reduce((b, q) => b + Number(q.capital || 0), 0), 0);
    const totalInteres       = prestamos.reduce((a, p) =>
      a + (p.pagos || []).reduce((b, q) => b + Number(q.interes || 0), 0), 0);
    const deudaPendiente     = totalPrestado - totalCapitalPagado;
    const numActivos         = prestamos.filter((p) => {
      const pagado = (p.pagos || []).reduce((b, q) => b + Number(q.capital || 0), 0);
      return pagado < Number(p.monto || 0);
    }).length;
    return { totalPrestado, totalCapitalPagado, totalInteres, deudaPendiente, numActivos };
  }, [prestamos]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function guardar() {
    const monto = Number(form.monto || 0);
    if (!form.nombre.trim() || monto <= 0) {
      alert("Completa el nombre y el monto del préstamo.");
      return;
    }
    const record = {
      id: editingId || uid(),
      nombre:      form.nombre.trim(),
      tipo:        form.tipo,
      monto,
      fecha:       form.fecha,
      tasaMensual: Number(form.tasaMensual || 0),
      plazo:       Number(form.plazo || 0),
      destino:     form.destino.trim(),
      cuentaId:    form.cuentaId || null,
      pagos: editingId
        ? (prestamos.find((p) => p.id === editingId)?.pagos || [])
        : [],
    };
    onSave(record);
    cancelar();
  }

  function cancelar() {
    setShowForm(false);
    setEditingId(null);
    setForm({ fecha: today(), nombre: "", tipo: "Banco", monto: "", tasaMensual: "", plazo: "", destino: "", cuentaId: "" });
  }

  function editar(p) {
    setEditingId(p.id);
    setForm({
      fecha:       p.fecha,
      nombre:      p.nombre,
      tipo:        p.tipo || "Banco",
      monto:       String(p.monto || ""),
      tasaMensual: String(p.tasaMensual || ""),
      plazo:       String(p.plazo || ""),
      destino:     p.destino || "",
      cuentaId:    p.cuentaId || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function agregarPago(prestamoId) {
    const capital = Number(pagoForm.capital || 0);
    const interes = Number(pagoForm.interes || 0);
    if (capital + interes <= 0) {
      alert("Ingresa al menos un valor en capital o interés.");
      return;
    }
    const prestamo = prestamos.find((p) => p.id === prestamoId);
    if (!prestamo) return;
    const pago    = { id: uid(), fecha: pagoForm.fecha, capital, interes, cuentaId: pagoForm.cuentaId || null, nota: pagoForm.nota || "" };
    const updated = { ...prestamo, pagos: [...(prestamo.pagos || []), pago] };
    onSave(updated);
    setPagoForm({ fecha: today(), capital: "", interes: "", cuentaId: "", nota: "" });
    setShowPagoFor(null);
  }

  function eliminarPago(prestamoId, pagoId) {
    if (!window.confirm("¿Eliminar este pago?")) return;
    const prestamo = prestamos.find((p) => p.id === prestamoId);
    if (!prestamo) return;
    const updated = { ...prestamo, pagos: (prestamo.pagos || []).filter((q) => q.id !== pagoId) };
    onSave(updated);
  }

  const sorted = [...prestamos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12 }}>
        <KpiCard label="Total prestado"    value={money(kpis.totalPrestado)}      color={C.debt}    icon="🏦" />
        <KpiCard label="Deuda pendiente"   value={money(kpis.deudaPendiente)}     color={kpis.deudaPendiente > 0 ? C.negative : C.positive} icon="⚠" />
        <KpiCard label="Capital pagado"    value={money(kpis.totalCapitalPagado)} color={C.positive} icon="✓" />
        <KpiCard label="Intereses pagados" value={money(kpis.totalInteres)}       color={C.warn}    icon="%" />
      </div>

      {/* ── Header + botón ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.ink }}>💳 Préstamos</h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.ink4 }}>
            {kpis.numActivos} préstamo{kpis.numActivos !== 1 ? "s" : ""} activo{kpis.numActivos !== 1 ? "s" : ""}
            {kpis.totalInteres > 0 && (
              <span style={{ color: C.warn }}>
                {" "}· {money(kpis.totalInteres)} en intereses pagados (gasto financiero)
              </span>
            )}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ fecha: today(), nombre: "", tipo: "Banco", monto: "", tasaMensual: "", plazo: "", destino: "", cuentaId: "" }); }}
            style={{ border: `1px solid ${C.debt}`, background: "white", color: C.debt, borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + Nuevo préstamo
          </button>
        )}
      </div>

      {/* ── Formulario nuevo / edición ────────────────────────────────────── */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 14, padding: "20px 22px", border: `1.5px solid ${editingId ? "#ffd54f" : C.debtBorder}`, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: C.ink }}>
            {editingId ? "✎ Editar préstamo" : "Registrar nuevo préstamo"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Fila 1: nombre + tipo */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={labelSt}>Acreedor / Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="ej. Banco de Bogotá  /  Papá de Luisa" style={inpSt} />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={labelSt}>Tipo de acreedor</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inpSt}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Fila 2: monto + fecha + cuenta */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={labelSt}>Monto recibido ($) *</label>
                <input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  placeholder="0" style={inpSt} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={labelSt}>Fecha de desembolso</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={inpSt} />
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={labelSt}>Cuenta donde entró</label>
                <select value={form.cuentaId} onChange={(e) => setForm({ ...form, cuentaId: e.target.value })} style={inpSt}>
                  <option value="">— Cuenta —</option>
                  {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Fila 3: destino + tasa + plazo */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 3, minWidth: 200 }}>
                <label style={labelSt}>Para qué se usó el dinero</label>
                <input value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
                  placeholder="ej. Compra lote de madera" style={inpSt} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={labelSt}>Tasa mensual (%)</label>
                <input type="number" value={form.tasaMensual} onChange={(e) => setForm({ ...form, tasaMensual: e.target.value })}
                  placeholder="0" style={inpSt} />
              </div>
              <div style={{ flex: 1, minWidth: 110 }}>
                <label style={labelSt}>Plazo (meses)</label>
                <input type="number" value={form.plazo} onChange={(e) => setForm({ ...form, plazo: e.target.value })}
                  placeholder="0" style={inpSt} />
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={guardar}
                style={{ flex: 1, background: C.debt, color: "white", border: "none", borderRadius: 9, padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                {editingId ? "✓ Guardar cambios" : "✓ Registrar préstamo"}
              </button>
              <button onClick={cancelar}
                style={{ background: "#f5f5f5", color: C.ink3, border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de préstamos ────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div style={{ background: "white", borderRadius: 14, padding: 40, textAlign: "center", border: `1px dashed ${C.border2}` }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
          <div style={{ fontWeight: 600, color: C.ink3, marginBottom: 6 }}>Sin préstamos registrados</div>
          <div style={{ fontSize: 13, color: C.ink4 }}>Agrega un préstamo para hacer seguimiento de la deuda y los pagos</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map((p) => (
            <LoanCard
              key={p.id}
              prestamo={p}
              cuentas={cuentas}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              showPagoForm={showPagoFor === p.id}
              pagoForm={pagoForm}
              setPagoForm={setPagoForm}
              onShowPagoForm={() => {
                setShowPagoFor(p.id);
                setPagoForm({ fecha: today(), capital: "", interes: "", cuentaId: "", nota: "" });
              }}
              onCancelPago={() => setShowPagoFor(null)}
              onAgregarPago={() => agregarPago(p.id)}
              onEliminarPago={(pagoId) => eliminarPago(p.id, pagoId)}
              onEditar={() => editar(p)}
              onEliminar={() => {
                if (window.confirm(`¿Eliminar el préstamo "${p.nombre}"? Se eliminarán también todos sus pagos.`))
                  onDelete(p.id);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Nota contable ─────────────────────────────────────────────────── */}
      {kpis.totalInteres > 0 && (
        <div style={{ background: C.warnBg, border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.warn }}>
          <strong>💡 Nota contable:</strong> Los intereses pagados ({money(kpis.totalInteres)}) se descuentan automáticamente del saldo distribuible a accionistas como gasto financiero en el Dashboard.
        </div>
      )}
    </div>
  );
}

// ─── LoanCard ─────────────────────────────────────────────────────────────────
function LoanCard({ prestamo, cuentas, expanded, onToggle, showPagoForm, pagoForm, setPagoForm, onShowPagoForm, onCancelPago, onAgregarPago, onEliminarPago, onEditar, onEliminar }) {
  const capitalPagado = (prestamo.pagos || []).reduce((a, q) => a + Number(q.capital || 0), 0);
  const interesPagado = (prestamo.pagos || []).reduce((a, q) => a + Number(q.interes || 0), 0);
  const monto         = Number(prestamo.monto || 0);
  const pendiente     = Math.max(0, monto - capitalPagado);
  const pagoPct       = monto > 0 ? Math.min(100, (capitalPagado / monto) * 100) : 0;
  const estaPagado    = pendiente <= 0 && monto > 0;

  return (
    <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${estaPagado ? "#A5D6A7" : C.debtBorder}`, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" }}>

      {/* ── Cabecera ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: estaPagado ? C.posBg : C.debtBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {prestamo.tipo === "Banco" || prestamo.tipo === "Entidad financiera" ? "🏦" : "👤"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{prestamo.nombre}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
              background: estaPagado ? C.posBg : C.debtBg, color: estaPagado ? C.positive : C.debt }}>
              {estaPagado ? "✓ Pagado" : prestamo.tipo}
            </span>
            {prestamo.destino && (
              <span style={{ fontSize: 11, color: C.ink4 }}>· {prestamo.destino}</span>
            )}
          </div>

          {/* Barra de progreso */}
          <div style={{ marginTop: 5 }}>
            <div style={{ height: 5, background: "#e5e7eb", borderRadius: 99, maxWidth: 340, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pagoPct}%`, background: estaPagado ? C.positive : C.debt, borderRadius: 99, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: 11, color: C.ink4, marginTop: 3 }}>
              {pagoPct.toFixed(1)}% capital pagado · {prestamo.fecha}
              {prestamo.tasaMensual > 0 && <span> · {prestamo.tasaMensual}% mensual</span>}
              {prestamo.plazo > 0 && <span> · {prestamo.plazo} meses</span>}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: estaPagado ? C.positive : C.negative }}>
            {money(pendiente)}
          </div>
          <div style={{ fontSize: 11, color: C.ink4 }}>pendiente de {money(monto)}</div>
        </div>
        <div style={{ color: C.ink4, fontSize: 12, flexShrink: 0 }}>{expanded ? "▲" : "▼"}</div>
      </div>

      {/* ── Panel expandido ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 20px" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 18 }}>
            <StatBox label="Monto original"  value={money(monto)}         color={C.debt} />
            <StatBox label="Capital pagado"  value={money(capitalPagado)} color={C.positive} />
            <StatBox label="Saldo pendiente" value={money(pendiente)}     color={pendiente > 0 ? C.negative : C.positive} />
            <StatBox label="Intereses pag."  value={money(interesPagado)} color={C.warn} />
          </div>

          {/* Historial de pagos */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 8 }}>
              Historial de pagos ({(prestamo.pagos || []).length} registros)
            </div>

            {(prestamo.pagos || []).length === 0 ? (
              <div style={{ fontSize: 13, color: C.ink4, fontStyle: "italic", padding: "8px 0" }}>Sin pagos registrados aún</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[...(prestamo.pagos || [])].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((q) => {
                  const cuenta = cuentas.find((c) => c.id === q.cuentaId);
                  const total  = Number(q.capital || 0) + Number(q.interes || 0);
                  return (
                    <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: C.bg, borderRadius: 9, fontSize: 13, flexWrap: "wrap" }}>
                      <span style={{ color: C.ink4, flexShrink: 0, minWidth: 86 }}>{q.fecha}</span>
                      <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {Number(q.capital || 0) > 0 && (
                          <span style={{ background: C.debtBg, color: C.debt, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            Capital: {money(q.capital)}
                          </span>
                        )}
                        {Number(q.interes || 0) > 0 && (
                          <span style={{ background: C.warnBg, color: C.warn, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            Interés: {money(q.interes)}
                          </span>
                        )}
                        {cuenta && <span style={{ color: C.ink4, fontSize: 11 }}>· {cuenta.nombre}</span>}
                        {q.nota && <span style={{ color: C.ink4, fontSize: 11 }}>· {q.nota}</span>}
                      </div>
                      <span style={{ fontWeight: 700, color: C.negative, flexShrink: 0 }}>− {money(total)}</span>
                      <button title="Eliminar pago" onClick={() => onEliminarPago(q.id)}
                        style={{ border: "none", background: "#fee2e2", color: "#dc2626", borderRadius: 5, padding: "2px 7px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Formulario de pago / acciones */}
          {!showPagoForm ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!estaPagado && (
                <button onClick={onShowPagoForm}
                  style={{ border: `1px solid ${C.positive}`, background: "white", color: C.positive, borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  + Registrar pago
                </button>
              )}
              <button onClick={onEditar}
                style={{ border: `1px solid ${C.border2}`, background: "white", color: C.ink3, borderRadius: 8, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                ✎ Editar
              </button>
              <button onClick={onEliminar}
                style={{ border: "1px solid #fee2e2", background: "white", color: "#dc2626", borderRadius: 8, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                🗑 Eliminar
              </button>
            </div>
          ) : (
            <div style={{ border: `1px solid ${C.border2}`, borderRadius: 10, padding: 14, background: "#fafafa" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 10 }}>Registrar pago</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={labelSt}>Fecha</label>
                  <input type="date" value={pagoForm.fecha}
                    onChange={(e) => setPagoForm({ ...pagoForm, fecha: e.target.value })} style={inpSt} />
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={labelSt}>Abono a capital ($)</label>
                  <input type="number" value={pagoForm.capital} placeholder="0"
                    onChange={(e) => setPagoForm({ ...pagoForm, capital: e.target.value })} style={inpSt} />
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={labelSt}>Pago de interés ($)</label>
                  <input type="number" value={pagoForm.interes} placeholder="0"
                    onChange={(e) => setPagoForm({ ...pagoForm, interes: e.target.value })} style={inpSt} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={labelSt}>Cuenta</label>
                  <select value={pagoForm.cuentaId}
                    onChange={(e) => setPagoForm({ ...pagoForm, cuentaId: e.target.value })} style={inpSt}>
                    <option value="">— Cuenta —</option>
                    {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={labelSt}>Nota (opcional)</label>
                  <input value={pagoForm.nota} placeholder="ej. Cuota 1 de 24"
                    onChange={(e) => setPagoForm({ ...pagoForm, nota: e.target.value })} style={inpSt} />
                </div>
              </div>

              {/* Preview del total del pago */}
              {(Number(pagoForm.capital || 0) + Number(pagoForm.interes || 0)) > 0 && (
                <div style={{ fontSize: 12, color: C.ink3, marginBottom: 8, padding: "6px 10px", background: "#f0f9ff", borderRadius: 7, border: "1px solid #bae6fd" }}>
                  Total del pago:{" "}
                  <strong style={{ color: C.negative }}>{money(Number(pagoForm.capital || 0) + Number(pagoForm.interes || 0))}</strong>
                  {Number(pagoForm.capital || 0) > 0 && Number(pagoForm.interes || 0) > 0 && (
                    <span style={{ color: C.ink4 }}>
                      {" "}({money(pagoForm.capital)} capital + {money(pagoForm.interes)} interés)
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onAgregarPago}
                  style={{ flex: 1, background: C.positive, color: "white", border: "none", borderRadius: 8, padding: "9px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  ✓ Registrar pago
                </button>
                <button onClick={onCancelPago}
                  style={{ background: "#f5f5f5", color: C.ink3, border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: "16px 18px", border: "1px solid #EEEEEE", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#9E9E9E", textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#1A1A1A", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 9, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "#9E9E9E", fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || "#1A1A1A" }}>{value}</div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const labelSt = { display: "block", fontSize: 11, fontWeight: 600, color: "#616161", marginBottom: 4 };
const inpSt   = { border: "1px solid #E0E0E0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
