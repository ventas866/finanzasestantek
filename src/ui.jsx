import { ORIGEN_COLORS, CATEGORIA_COLORS } from "./constants.js";

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Panel({ title, titleRight, children, flush = false }) {
  return (
    <div style={s.panel}>
      {title && (
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>{title}</h3>
          {titleRight && <div>{titleRight}</div>}
        </div>
      )}
      <div style={flush ? {} : {}}>{children}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:4 }}>
      <div>
        <h2 style={{ margin:0, fontSize:24, fontWeight:900, color:"#0f172a" }}>{title}</h2>
        {subtitle && <p style={{ margin:"4px 0 0", fontSize:14, color:"#64748b" }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display:"flex", gap:8 }}>{actions}</div>}
    </div>
  );
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export function FormSection({ label, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={s.formSectionLabel}>{label}</div>
      {children}
    </div>
  );
}

export function FormGrid({ children }) {
  return <div style={s.formGrid}>{children}</div>;
}

export function Field({ label, children, wide = false, hint }) {
  return (
    <div style={wide ? { ...s.field, gridColumn:"1 / -1" } : s.field}>
      <span style={s.fieldLabel}>{label}</span>
      {children}
      {hint && <span style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{hint}</span>}
    </div>
  );
}

export const inputStyle = {
  border:"1px solid #e2e8f0",
  borderRadius:10,
  padding:"10px 12px",
  fontSize:14,
  outline:"none",
  background:"white",
  boxSizing:"border-box",
  width:"100%",
  color:"#0f172a",
};

export const selectStyle = { ...inputStyle, cursor:"pointer" };

// ─── Data display ─────────────────────────────────────────────────────────────

export function KpiCard({ label, value, sub, accent = "#64748b", icon, size = "md", highlight }) {
  const isNeg = highlight === "negative";
  const isPos = highlight === "positive";
  return (
    <div style={{
      ...s.kpiCard,
      borderTop:`3px solid ${accent}`,
      ...(isNeg ? { background:"#fff1f2" } : {}),
      ...(isPos && size === "md" ? { background:"#f0fdf4" } : {}),
    }}>
      <div style={s.kpiLabel}>
        {icon && <span style={{ marginRight:6, opacity:.7 }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        ...s.kpiValue,
        fontSize: size === "sm" ? 20 : size === "lg" ? 34 : 26,
        color: isNeg ? "#dc2626" : isPos ? "#059669" : "#0f172a",
      }}>
        {value}
      </div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  );
}

export function FinRow({ label, value, sub, type, bold }) {
  const color =
    type === "profit" ? "#059669" :
    type === "loss"   ? "#dc2626" :
    type === "cost"   ? "#ef4444" : "#0f172a";
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"3px 0" }}>
      <div>
        <span style={{ fontSize:14, color:"#334155", fontWeight: bold ? 700 : 500 }}>{label}</span>
        {sub && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
      </div>
      <span style={{ fontWeight: bold ? 900 : 700, fontSize: bold ? 18 : 15, color }}>{value}</span>
    </div>
  );
}

export function InfoTable({ rows }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {rows.map(([label, value, type], i) => (
        <FinRow key={i} label={label} value={value} type={type} />
      ))}
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export function OrigenBadge({ origen }) {
  const c = ORIGEN_COLORS[origen] || { bg:"#f1f5f9", color:"#475569" };
  return <span style={{ ...s.badge, background:c.bg, color:c.color }}>{origen}</span>;
}

export function CategoriaBadge({ cat }) {
  const c = CATEGORIA_COLORS[cat] || { bg:"#f1f5f9", color:"#475569" };
  return <span style={{ ...s.badge, background:c.bg, color:c.color }}>{cat}</span>;
}

export function StockBadge({ stock, tipo }) {
  if (tipo === "Servicio")     return <span style={{ ...s.badge, background:"#f0fdf4", color:"#166534" }}>Servicio</span>;
  if (tipo === "Bajo pedido")  return <span style={{ ...s.badge, background:"#f3e8ff", color:"#6b21a8" }}>Bajo pedido</span>;
  if (stock === 0)             return <span style={{ ...s.badge, background:"#fee2e2", color:"#991b1b" }}>Agotado</span>;
  if (stock <= 2)              return <span style={{ ...s.badge, background:"#fef3c7", color:"#92400e" }}>Crítico · {stock}</span>;
  return <span style={{ ...s.badge, background:"#d1fae5", color:"#065f46" }}>{stock} und</span>;
}

export function PagoBadge({ forma }) {
  if (forma === "Crédito") return <span style={{ ...s.badge, background:"#fef3c7", color:"#92400e" }}>Crédito</span>;
  return <span style={{ ...s.badge, background:"#d1fae5", color:"#065f46" }}>Contado</span>;
}

export function StatusBadge({ label, type }) {
  const colors = {
    success: { bg:"#d1fae5", color:"#065f46" },
    warning: { bg:"#fef3c7", color:"#92400e" },
    danger:  { bg:"#fee2e2", color:"#991b1b" },
    info:    { bg:"#dbeafe", color:"#1d4ed8" },
    neutral: { bg:"#f1f5f9", color:"#475569" },
  };
  const c = colors[type] || colors.neutral;
  return <span style={{ ...s.badge, background:c.bg, color:c.color }}>{label}</span>;
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function DataTable({ headers, rows, empty = "Sin registros." }) {
  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
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
              <td colSpan={headers.length} style={{ ...s.td, textAlign:"center", padding:28, color:"#94a3b8" }}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={i % 2 !== 0 ? { background:"#f8fafc" } : {}}>
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
    <div style={s.emptyState}>
      {icon && <div style={{ fontSize:32, marginBottom:8, opacity:.4 }}>{icon}</div>}
      <div style={{ fontWeight:600 }}>{text}</div>
      {action && <div style={{ marginTop:12 }}>{action}</div>}
    </div>
  );
}

export function Alert({ type = "info", title, text }) {
  const colors = {
    warning: { bg:"#fffbeb", border:"#fcd34d", title:"#92400e", text:"#b45309" },
    info:    { bg:"#eff6ff", border:"#93c5fd", title:"#1e40af", text:"#2563eb" },
    error:   { bg:"#fef2f2", border:"#fca5a5", title:"#991b1b", text:"#dc2626" },
    success: { bg:"#f0fdf4", border:"#86efac", title:"#166534", text:"#15803d" },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:"12px 16px" }}>
      {title && <div style={{ fontWeight:700, color:c.title, marginBottom:4 }}>{title}</div>}
      <div style={{ fontSize:14, color:c.text }}>{text}</div>
    </div>
  );
}

export function Divider() {
  return <div style={{ height:1, background:"#e2e8f0", margin:"4px 0" }} />;
}

// ─── History cards ────────────────────────────────────────────────────────────

export function HistCard({ children }) {
  return <div style={s.histCard}>{children}</div>;
}

export function SkuPill({ label }) {
  return <span style={s.skuPill}>{label}</span>;
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryBtn({ children, onClick, disabled, full = true }) {
  return (
    <button
      style={{ ...s.primaryBtn, ...(full ? { width:"100%" } : {}), ...(disabled ? s.btnDisabled : {}) }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function DarkBtn({ children, onClick, full = true }) {
  return (
    <button style={{ ...s.darkBtn, ...(full ? { width:"100%" } : {}) }} onClick={onClick}>
      {children}
    </button>
  );
}

export function CancelBtn({ children, onClick }) {
  return (
    <button style={{ ...s.cancelBtn, width:"100%" }} onClick={onClick}>{children}</button>
  );
}

export function EditBtn({ onClick }) {
  return <button style={s.editBtn} onClick={onClick}>✎ Editar</button>;
}

export function DeleteBtn({ onClick }) {
  return <button style={s.deleteBtn} onClick={onClick}>✕ Eliminar</button>;
}

export function AddLineBtn({ children, onClick }) {
  return (
    <button style={s.addLineBtn} onClick={onClick}>{children}</button>
  );
}

export function RemoveBtn({ onClick }) {
  return <button style={s.removeBtn} onClick={onClick}>✕</button>;
}

// ─── Totals box ───────────────────────────────────────────────────────────────

export function TotalBox({ rows, finalRow }) {
  return (
    <div style={s.totalBox}>
      {rows.map(([label, value, color], i) => (
        <div key={i} style={{ ...s.totalRow, ...(color ? { color } : {}) }}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
      {finalRow && (
        <div style={{ ...s.totalRow, ...s.totalRowFinal }}>
          <span>{finalRow[0]}</span>
          <span>{finalRow[1]}</span>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export const s = {
  panel: {
    background:"white",
    borderRadius:16,
    padding:"22px 24px",
    boxShadow:"0 1px 4px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.04)",
    border:"1px solid #e2e8f0",
  },
  panelHeader: {
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:18,
  },
  panelTitle: {
    margin:0,
    fontSize:16,
    fontWeight:800,
    color:"#0f172a",
  },
  formSectionLabel: {
    fontSize:11,
    fontWeight:800,
    color:"#94a3b8",
    letterSpacing:"0.1em",
    textTransform:"uppercase",
    marginBottom:12,
    paddingBottom:8,
    borderBottom:"1px solid #f1f5f9",
  },
  formGrid: {
    display:"grid",
    gridTemplateColumns:"1fr 1fr",
    gap:14,
  },
  field: {
    display:"flex",
    flexDirection:"column",
    gap:5,
  },
  fieldLabel: {
    fontSize:12,
    fontWeight:700,
    color:"#475569",
  },
  kpiCard: {
    background:"white",
    borderRadius:14,
    padding:"16px 18px",
    boxShadow:"0 1px 4px rgba(15,23,42,.06)",
    border:"1px solid #e2e8f0",
    borderTop:"3px solid #e2e8f0",
  },
  kpiLabel: {
    fontSize:12,
    color:"#64748b",
    fontWeight:600,
    marginBottom:8,
    display:"flex",
    alignItems:"center",
  },
  kpiValue: {
    fontSize:26,
    fontWeight:900,
    color:"#0f172a",
    lineHeight:1.1,
  },
  kpiSub: {
    fontSize:12,
    color:"#94a3b8",
    marginTop:5,
  },
  badge: {
    display:"inline-block",
    borderRadius:6,
    padding:"3px 8px",
    fontSize:12,
    fontWeight:700,
  },
  tableWrap: {
    overflowX:"auto",
    border:"1px solid #e2e8f0",
    borderRadius:12,
  },
  table: {
    width:"100%",
    borderCollapse:"collapse",
    background:"white",
    minWidth:600,
  },
  th: {
    textAlign:"left",
    padding:"11px 14px",
    background:"#f8fafc",
    color:"#64748b",
    fontSize:11,
    fontWeight:800,
    borderBottom:"1px solid #e2e8f0",
    letterSpacing:"0.06em",
    textTransform:"uppercase",
    whiteSpace:"nowrap",
  },
  td: {
    padding:"11px 14px",
    borderBottom:"1px solid #f1f5f9",
    fontSize:14,
    color:"#334155",
    verticalAlign:"middle",
  },
  emptyState: {
    textAlign:"center",
    padding:"36px 16px",
    color:"#94a3b8",
    fontSize:14,
    border:"1px dashed #e2e8f0",
    borderRadius:12,
    display:"flex",
    flexDirection:"column",
    alignItems:"center",
  },
  histCard: {
    border:"1px solid #e2e8f0",
    borderRadius:12,
    padding:"14px 16px",
    display:"flex",
    flexDirection:"column",
    gap:10,
  },
  skuPill: {
    background:"#f1f5f9",
    color:"#475569",
    borderRadius:6,
    padding:"3px 8px",
    fontSize:12,
    fontWeight:700,
    fontFamily:"monospace",
  },
  totalBox: {
    background:"#f8fafc",
    border:"1px solid #e2e8f0",
    borderRadius:12,
    padding:"14px 16px",
    marginTop:12,
    display:"flex",
    flexDirection:"column",
    gap:8,
  },
  totalRow: {
    display:"flex",
    justifyContent:"space-between",
    fontSize:14,
    color:"#334155",
  },
  totalRowFinal: {
    fontWeight:900,
    fontSize:16,
    color:"#0f172a",
    borderTop:"1px solid #e2e8f0",
    paddingTop:8,
  },
  primaryBtn: {
    border:"none",
    borderRadius:10,
    padding:"12px 16px",
    background:"#f97316",
    color:"white",
    fontWeight:800,
    cursor:"pointer",
    fontSize:14,
  },
  darkBtn: {
    border:"none",
    borderRadius:10,
    padding:"12px 16px",
    background:"#0f172a",
    color:"white",
    fontWeight:800,
    cursor:"pointer",
    fontSize:14,
  },
  cancelBtn: {
    border:"1px solid #e2e8f0",
    borderRadius:10,
    padding:"11px 16px",
    background:"white",
    color:"#475569",
    fontWeight:700,
    cursor:"pointer",
    fontSize:14,
  },
  btnDisabled: {
    opacity:.5,
    cursor:"not-allowed",
  },
  editBtn: {
    border:"none",
    background:"#eff6ff",
    color:"#1d4ed8",
    borderRadius:8,
    padding:"7px 12px",
    cursor:"pointer",
    fontWeight:700,
    fontSize:13,
  },
  deleteBtn: {
    border:"none",
    background:"#fef2f2",
    color:"#dc2626",
    borderRadius:8,
    padding:"7px 12px",
    cursor:"pointer",
    fontWeight:700,
    fontSize:13,
  },
  addLineBtn: {
    marginTop:12,
    border:"1.5px dashed #cbd5e1",
    background:"transparent",
    color:"#475569",
    borderRadius:10,
    padding:"10px 16px",
    fontWeight:700,
    cursor:"pointer",
    fontSize:14,
    width:"100%",
  },
  removeBtn: {
    border:"none",
    background:"#fef2f2",
    color:"#dc2626",
    borderRadius:6,
    padding:"5px 8px",
    cursor:"pointer",
    fontWeight:700,
    fontSize:12,
    flexShrink:0,
  },
};
