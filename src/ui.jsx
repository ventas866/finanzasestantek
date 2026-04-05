import { useState } from "react";
import { ORIGEN_COLORS, CATEGORIA_COLORS } from "./constants.js";

// ─── Design tokens (match CSS vars) ──────────────────────────────────────────
const C = {
  brand:       "#E65100",
  brandDark:   "#BF360C",
  brandLight:  "#FFF3E0",
  ink:         "#1A1A1A",
  ink2:        "#424242",
  ink3:        "#616161",
  ink4:        "#9E9E9E",
  positive:    "#2E7D32",
  positiveBg:  "#E8F5E9",
  negative:    "#C62828",
  negativeBg:  "#FFEBEE",
  bg:          "#F5F5F5",
  surface:     "#FFFFFF",
  surface2:    "#FAFAFA",
  border:      "#EEEEEE",
  border2:     "#E0E0E0",
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
export function ConfirmModal({ message = "¿Eliminar este registro? Esta acción no se puede deshacer.", onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 44, height: 44, background: "#FFEBEE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20 }}>
          🗑️
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: C.ink, textAlign: "center" }}>
          Confirmar eliminación
        </h3>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: C.ink3, textAlign: "center", lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "11px", background: "white", color: C.ink3, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
            onClick={onCancel}>Cancelar</button>
          <button style={{ flex: 1, border: "none", borderRadius: 10, padding: "11px", background: C.negative, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
            onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── useConfirm hook ──────────────────────────────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState(null); // { message, resolve }

  function confirm(message) {
    return new Promise((resolve) => setState({ message, resolve }));
  }

  function handleConfirm() { state?.resolve(true);  setState(null); }
  function handleCancel()  { state?.resolve(false); setState(null); }

  const modal = state ? (
    <ConfirmModal message={state.message} onConfirm={handleConfirm} onCancel={handleCancel} />
  ) : null;

  return { confirm, modal };
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Panel({ title, titleRight, children, flush = false, noPad = false }) {
  return (
    <div style={s.panel}>
      {title && (
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>{title}</h3>
          {titleRight && <div>{titleRight}</div>}
        </div>
      )}
      <div style={noPad ? { padding: 0 } : {}}>{children}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.ink }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: C.ink3 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

export function KpiCard({ label, value, sub, accent, icon, size = "md", highlight, trend }) {
  const isNeg = highlight === "negative";
  const isPos = highlight === "positive";

  const valueColor = isNeg ? C.negative : isPos ? C.positive : accent || C.ink;

  return (
    <div style={{
      background: C.surface,
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      border: `1px solid ${C.border}`,
      borderLeft: `4px solid ${accent || C.border2}`,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink4, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        fontSize: size === "lg" ? 32 : size === "sm" ? 22 : 28,
        fontWeight: 600,
        color: valueColor,
        lineHeight: 1.15,
        letterSpacing: "-0.5px",
      }}>
        {value}
      </div>
      {(sub || trend) && (
        <div style={{ fontSize: 12, color: C.ink4, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          {trend && (
            <span style={{ fontWeight: 700, color: trend > 0 ? C.positive : trend < 0 ? C.negative : C.ink4 }}>
              {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export function FormSection({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={s.formSectionLabel}>{label}</div>
      {children}
    </div>
  );
}

export function FormGrid({ children }) {
  return <div style={s.formGrid}>{children}</div>;
}

export function Field({ label, children, wide = false, hint, error }) {
  return (
    <div style={wide ? { ...s.field, gridColumn: "1 / -1" } : s.field}>
      <span style={s.fieldLabel}>{label}</span>
      {children}
      {hint  && <span style={{ fontSize: 11, color: C.ink4, marginTop: 2 }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: C.negative, marginTop: 2, fontWeight: 600 }}>⚠ {error}</span>}
    </div>
  );
}

export const inputStyle = {
  border: `1px solid ${C.border2}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: C.surface,
  boxSizing: "border-box",
  width: "100%",
  color: C.ink,
};

export const selectStyle = { ...inputStyle, cursor: "pointer" };

// ─── Pagos builder ────────────────────────────────────────────────────────────

export function PagosBuilder({ total, pagos, setPagos, pagoLinea, setPagoLinea, cuentas, labelCredito = "crédito" }) {
  const sumPagos  = pagos.reduce((a, p) => a + p.monto, 0);
  const remainder = Math.max(0, total - sumPagos);

  function addPago() {
    const monto = Number(pagoLinea.monto || 0);
    if (!pagoLinea.cuentaId || monto <= 0) return;
    const capped = Math.min(monto, remainder > 0 ? remainder : monto);
    setPagos(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, cuentaId: pagoLinea.cuentaId, monto: capped }]);
    setPagoLinea({ cuentaId: "", monto: "" });
  }

  function removePago(id) { setPagos(prev => prev.filter(p => p.id !== id)); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 16, fontSize: 13, flexWrap: "wrap" }}>
        <span style={{ color: C.ink3 }}>Total: <strong style={{ color: C.ink }}>{total.toLocaleString("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0})}</strong></span>
        <span style={{ color: C.positive }}>Asignado: <strong>{sumPagos.toLocaleString("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0})}</strong></span>
        {remainder > 0 && <span style={{ color: C.brand, fontWeight: 700 }}>{remainder.toLocaleString("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0})} → {labelCredito}</span>}
        {remainder === 0 && total > 0 && <span style={{ color: C.positive, fontWeight: 700 }}>✓ Pago completo</span>}
      </div>

      {pagos.map((p) => {
        const cuenta = cuentas.find(c => c.id === p.cuentaId);
        return (
          <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background: C.positiveBg, border:`1px solid #A5D6A7`, borderRadius: 8, padding:"8px 12px" }}>
            <span style={{ fontWeight: 700, color: C.positive, fontSize: 13 }}>{cuenta?.nombre || "—"}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{p.monto.toLocaleString("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0})}</span>
            <button style={{ border: "none", background: C.negativeBg, color: C.negative, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }} onClick={() => removePago(p.id)}>✕</button>
          </div>
        );
      })}

      {(remainder > 0 || pagos.length === 0) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={{ ...selectStyle, flex: 2 }} value={pagoLinea.cuentaId}
            onChange={e => setPagoLinea({ ...pagoLinea, cuentaId: e.target.value })}>
            <option value="">— Cuenta —</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input type="number" style={{ ...inputStyle, flex: 1 }} placeholder={remainder > 0 ? remainder.toString() : "Monto"}
            value={pagoLinea.monto} onChange={e => setPagoLinea({ ...pagoLinea, monto: e.target.value })} />
          <button style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: C.ink, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
            onClick={addPago}>+ Agregar</button>
        </div>
      )}

      {total > 0 && pagos.length === 0 && (
        <div style={{ fontSize: 12, color: C.brand, background: C.brandLight, border: `1px solid #FFCC80`, borderRadius: 8, padding: "8px 12px" }}>
          Sin pagos → se guardará como {labelCredito}
        </div>
      )}
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export function OrigenBadge({ origen }) {
  const c = ORIGEN_COLORS[origen] || { bg: "#F5F5F5", color: C.ink3 };
  return <span style={{ ...s.badge, background: c.bg, color: c.color }}>{origen}</span>;
}

export function CategoriaBadge({ cat }) {
  const c = CATEGORIA_COLORS[cat] || { bg: "#F5F5F5", color: C.ink3 };
  return <span style={{ ...s.badge, background: c.bg, color: c.color }}>{cat}</span>;
}

export function StockBadge({ stock, tipo }) {
  if (tipo === "Servicio")    return <span style={{ ...s.badge, background: "#E8F5E9", color: C.positive }}>Servicio</span>;
  if (tipo === "Bajo pedido") return <span style={{ ...s.badge, background: "#F3E8FF", color: "#6B21A8" }}>Bajo pedido</span>;
  if (stock === 0)            return <span style={{ ...s.badge, background: C.negativeBg, color: C.negative }}>Agotado</span>;
  if (stock <= 2)             return <span style={{ ...s.badge, background: "#FFF3E0", color: C.brand }}>Crítico · {stock}</span>;
  return <span style={{ ...s.badge, background: C.positiveBg, color: C.positive }}>{stock} und</span>;
}

export function PagoBadge({ forma }) {
  if (forma === "Crédito") return <span style={{ ...s.badge, background: "#FFF3E0", color: C.brand }}>Crédito</span>;
  if (forma === "Mixto")   return <span style={{ ...s.badge, background: "#E3F2FD", color: "#1565C0" }}>Mixto</span>;
  return <span style={{ ...s.badge, background: C.positiveBg, color: C.positive }}>Contado</span>;
}

export function StatusBadge({ label, type }) {
  const colors = {
    success: { bg: C.positiveBg,  color: C.positive },
    warning: { bg: "#FFF3E0",     color: C.brand },
    danger:  { bg: C.negativeBg,  color: C.negative },
    info:    { bg: "#E3F2FD",     color: "#1565C0" },
    neutral: { bg: "#F5F5F5",     color: C.ink3 },
  };
  const c = colors[type] || colors.neutral;
  return <span style={{ ...s.badge, background: c.bg, color: c.color }}>{label}</span>;
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable({ headers, rows, empty = "Sin registros." }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: C.surface, minWidth: 560 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ textAlign: "center", padding: 32, color: C.ink4, fontSize: 14 }}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="tr-hover" style={{ background: C.surface }}>
                {row.map((cell, j) => (
                  <td key={j} style={s.td}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export function EmptyState({ text, icon, action }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 16px", color: C.ink4, fontSize: 14, border: `1.5px dashed ${C.border2}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {icon && <div style={{ fontSize: 28, marginBottom: 10, opacity: .5 }}>{icon}</div>}
      <div style={{ fontWeight: 600, color: C.ink3 }}>{text}</div>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function Alert({ type = "info", title, text }) {
  const colors = {
    warning: { bg: "#FFF3E0", border: "#FFCC80", title: C.brand,    text: "#E65100" },
    info:    { bg: "#E3F2FD", border: "#90CAF9", title: "#1565C0",  text: "#1976D2" },
    error:   { bg: C.negativeBg, border: "#EF9A9A", title: C.negative, text: C.negative },
    success: { bg: C.positiveBg, border: "#A5D6A7", title: C.positive, text: C.positive },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "12px 16px" }}>
      {title && <div style={{ fontWeight: 700, color: c.title, marginBottom: 4 }}>{title}</div>}
      <div style={{ fontSize: 13, color: c.text }}>{text}</div>
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "4px 0" }} />;
}

export function FinRow({ label, value, sub, type, bold }) {
  const color =
    type === "profit" ? C.positive :
    type === "loss"   ? C.negative :
    type === "cost"   ? C.negative : C.ink;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "3px 0" }}>
      <div>
        <span style={{ fontSize: 14, color: C.ink2, fontWeight: bold ? 700 : 500 }}>{label}</span>
        {sub && <div style={{ fontSize: 12, color: C.ink4, marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontWeight: bold ? 700 : 600, fontSize: bold ? 17 : 14, color }}>{value}</span>
    </div>
  );
}

// ─── History cards ────────────────────────────────────────────────────────────

export function SkuPill({ label, reventa }) {
  return (
    <span style={{
      background: reventa ? "#FFF3E0" : "#F5F5F5",
      color: reventa ? C.brand : C.ink3,
      borderRadius: 5,
      padding: "3px 8px",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "monospace",
    }}>
      {label}{reventa ? " ↩" : ""}
    </span>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryBtn({ children, onClick, disabled, full = true }) {
  return (
    <button
      style={{ ...s.primaryBtn, ...(full ? { width: "100%" } : {}), ...(disabled ? { opacity: .45, cursor: "not-allowed" } : {}) }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function DarkBtn({ children, onClick, full = true, disabled = false }) {
  return (
    <button
      style={{ ...s.darkBtn, ...(full ? { width: "100%" } : {}), ...(disabled ? { opacity: .45, cursor: "not-allowed" } : {}) }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function CancelBtn({ children, onClick }) {
  return (
    <button style={{ ...s.cancelBtn, width: "100%" }} onClick={onClick}>{children}</button>
  );
}

export function EditBtn({ onClick }) {
  return (
    <button style={{ border: "none", background: "#E3F2FD", color: "#1565C0", borderRadius: 7, padding: "6px 11px", cursor: "pointer", fontWeight: 600, fontSize: 12 }} onClick={onClick}>
      ✎ Editar
    </button>
  );
}

export function DeleteBtn({ onClick }) {
  return (
    <button style={{ border: "none", background: C.negativeBg, color: C.negative, borderRadius: 7, padding: "6px 11px", cursor: "pointer", fontWeight: 600, fontSize: 12 }} onClick={onClick}>
      🗑 Eliminar
    </button>
  );
}

export function AddLineBtn({ children, onClick }) {
  return (
    <button style={{ marginTop: 12, border: `1.5px dashed ${C.border2}`, background: "transparent", color: C.ink3, borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13, width: "100%", transition: "all .15s" }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.color = C.brand; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.ink3; }}>
      {children}
    </button>
  );
}

export function RemoveBtn({ onClick }) {
  return (
    <button style={{ border: "none", background: C.negativeBg, color: C.negative, borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontWeight: 700, fontSize: 12, flexShrink: 0 }} onClick={onClick}>✕</button>
  );
}

// ─── TotalBox ─────────────────────────────────────────────────────────────────

export function TotalBox({ rows, finalRow }) {
  return (
    <div style={{ background: "#FAFAFA", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(([label, value, color], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: color || C.ink2 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
      {finalRow && (
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: C.ink, borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 2 }}>
          <span>{finalRow[0]}</span>
          <span style={{ color: C.brand }}>{finalRow[1]}</span>
        </div>
      )}
    </div>
  );
}

// ─── CSV Export button ────────────────────────────────────────────────────────

export function ExportBtn({ onClick, label = "Exportar CSV" }) {
  return (
    <button
      onClick={onClick}
      style={{ border: `1px solid ${C.border2}`, borderRadius: 8, padding: "8px 14px", background: "white", color: C.ink2, fontWeight: 600, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
      onMouseEnter={e => { e.currentTarget.style.background = "#F5F5F5"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
      ↓ {label}
    </button>
  );
}

// ─── Pill filter buttons ──────────────────────────────────────────────────────

export function PillFilter({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              border: `1px solid ${active ? C.brand : C.border2}`,
              background: active ? C.brand : "white",
              color: active ? "white" : C.ink3,
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .15s",
            }}>
            {opt.label}
            {opt.count !== undefined && (
              <span style={{ marginLeft: 5, opacity: .75 }}>({opt.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Search input ─────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.ink4, fontSize: 15, pointerEvents: "none" }}>🔍</span>
      <input
        style={{ ...inputStyle, paddingLeft: 34 }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: C.border, color: C.ink3, borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export const s = {
  panel: {
    background: C.surface,
    borderRadius: 14,
    padding: "20px 22px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    border: `1px solid ${C.border}`,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  panelTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: C.ink,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: C.ink4,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1px solid ${C.border}`,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: C.ink3,
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    background: "#FAFAFA",
    color: C.ink4,
    fontSize: 11,
    fontWeight: 700,
    borderBottom: `1px solid ${C.border}`,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "11px 14px",
    borderBottom: `1px solid ${C.border}`,
    fontSize: 14,
    color: C.ink2,
    verticalAlign: "middle",
  },
  badge: {
    display: "inline-block",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  histCard: {
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: C.surface,
    transition: "box-shadow .15s",
  },
  primaryBtn: {
    border: "none",
    borderRadius: 8,
    padding: "12px 16px",
    background: C.brand,
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
    letterSpacing: "0.2px",
  },
  darkBtn: {
    border: "none",
    borderRadius: 8,
    padding: "12px 16px",
    background: C.ink,
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  cancelBtn: {
    border: `1px solid ${C.border2}`,
    borderRadius: 8,
    padding: "11px 16px",
    background: "white",
    color: C.ink3,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
};
