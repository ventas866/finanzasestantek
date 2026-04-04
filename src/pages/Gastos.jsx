import { money } from "../utils.js";
import {
  Panel, SectionHeader, FormGrid, Field, inputStyle, selectStyle,
  DarkBtn, DeleteBtn, EditBtn, EmptyState, Alert, CancelBtn, s,
} from "../ui.jsx";
import { GASTO_CATEGORIAS } from "../constants.js";

export default function Gastos({
  gastos, cuentas,
  form, setForm,
  editingId,
  onSave, onDelete, onEdit, onCancel,
}) {
  const totalGastos = gastos.reduce((a, g) => a + g.valor, 0);
  const porCategoria = gastos.reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
    return acc;
  }, {});

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Gastos" subtitle={`Total registrado: ${money(totalGastos)} · ${gastos.length} registros`} />

      <div style={pageGrid}>
        <Panel title={editingId ? "✎ Editar gasto" : "Registrar gasto"}>
          {editingId && (
            <Alert type="info" text="Editando gasto. Modifica los campos y guarda los cambios." />
          )}
          {editingId && <div style={{ height:12 }} />}
          <FormGrid>
            <Field label="Fecha">
              <input type="date" style={inputStyle} value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </Field>
            <Field label="Categoría">
              <select style={selectStyle} value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {GASTO_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Valor">
              <input type="number" style={inputStyle} placeholder="0" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </Field>
            <Field label="Cuenta de pago">
              <select style={selectStyle} value={form.cuentaId}
                onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}>
                <option value="">— Sin cuenta —</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Descripción" wide>
              <input style={inputStyle} placeholder="Ej: 4x1000, Meta Ads, dominio .co, flete..." value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
          </FormGrid>
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
            <DarkBtn onClick={onSave}>{editingId ? "Guardar cambios" : "Registrar gasto"}</DarkBtn>
            {editingId && <CancelBtn onClick={onCancel}>Cancelar edición</CancelBtn>}
          </div>
        </Panel>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Resumen por categoría */}
          {Object.keys(porCategoria).length > 0 && (
            <Panel title="Por categoría">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {Object.entries(porCategoria)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, val]) => (
                    <div key={cat} style={catRow}>
                      <span style={{ fontWeight:700, color:"#334155" }}>{cat}</span>
                      <span style={{ fontWeight:900, color:"#dc2626" }}>{money(val)}</span>
                    </div>
                  ))}
                <div style={{ ...catRow, borderTop:"1px solid #e2e8f0", paddingTop:8, marginTop:2 }}>
                  <span style={{ fontWeight:700 }}>Total</span>
                  <span style={{ fontWeight:900, color:"#0f172a" }}>{money(totalGastos)}</span>
                </div>
              </div>
            </Panel>
          )}

          {/* Historial */}
          <Panel title={`Historial (${gastos.length})`}>
            {gastos.length === 0 ? (
              <EmptyState icon="💸" text="No hay gastos registrados." />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {gastos.map((item) => (
                  <div key={item.id} style={{ ...s.histCard, ...(item.id === editingId ? { border:"1.5px solid #f97316" } : {}) }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontWeight:700 }}>{item.categoria}</div>
                        <div style={{ fontSize:13, color:"#94a3b8" }}>
                          {item.fecha}
                          {item.cuentaId && ` · ${cuentas.find((c) => c.id === item.cuentaId)?.nombre}`}
                        </div>
                        {item.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{item.descripcion}</div>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontWeight:900, fontSize:18, color:"#dc2626" }}>{money(item.valor)}</span>
                        <EditBtn onClick={() => onEdit(item)} />
                        <DeleteBtn onClick={() => onDelete(item.id)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

const pageGrid = { display:"grid", gridTemplateColumns:"380px 1fr", gap:20, alignItems:"start" };
const catRow = { display:"flex", justifyContent:"space-between", padding:"8px 10px", background:"#f8fafc", borderRadius:8 };
