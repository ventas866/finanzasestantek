import { money } from "../utils.js";
import {
  Panel, SectionHeader, FormGrid, Field, inputStyle, selectStyle,
  PrimaryBtn, EmptyState, s,
} from "../ui.jsx";

const SOCIOS = [
  { value:"Raúl",            label:"Raúl",            pct:"40%", desc:"Socio fundador" },
  { value:"Nicolás y Luisa", label:"Nicolás y Luisa",  pct:"60%", desc:"Socios mayoritarios" },
];

export default function Inversiones({ inversiones, cuentas, form, setForm, onSave }) {
  const totalInversiones = inversiones.reduce((a, x) => a + x.valor, 0);

  const porSocio = SOCIOS.map((sc) => ({
    ...sc,
    total: inversiones.filter((i) => i.socio === sc.value).reduce((a, x) => a + x.valor, 0),
    count: inversiones.filter((i) => i.socio === sc.value).length,
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Inversiones" subtitle={`Capital total aportado: ${money(totalInversiones)}`} />

      <div style={pageGrid}>
        <Panel title="Registrar aporte de socio">
          {/* Selector de socio visual */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {SOCIOS.map((sc) => (
              <div key={sc.value}
                style={{ ...socioCard, ...(form.socio === sc.value ? socioActive : {}) }}
                onClick={() => setForm({ ...form, socio: sc.value })}>
                <div style={{ fontSize:22, fontWeight:900, color: form.socio === sc.value ? "#6366f1" : "#94a3b8" }}>{sc.pct}</div>
                <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{sc.label}</div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>{sc.desc}</div>
              </div>
            ))}
          </div>

          <FormGrid>
            <Field label="Fecha">
              <input type="date" style={inputStyle} value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </Field>
            <Field label="Monto aportado">
              <input type="number" style={inputStyle} placeholder="0" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </Field>
            <Field label="Cuenta donde entra">
              <select style={selectStyle} value={form.cuentaId}
                onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}>
                <option value="">— Sin cuenta —</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Descripción">
              <input style={inputStyle} placeholder="Ej: capital para compra inicial" value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Field>
          </FormGrid>
          <div style={{ marginTop:16 }}>
            <PrimaryBtn onClick={onSave}>Registrar aporte</PrimaryBtn>
          </div>
        </Panel>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Resumen por socio */}
          <Panel title="Resumen por socio">
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {porSocio.map((sc) => (
                <div key={sc.value} style={socioRow}>
                  <div>
                    <div style={{ fontWeight:700 }}>{sc.label} <span style={{ color:"#94a3b8", fontSize:13 }}>({sc.pct})</span></div>
                    <div style={{ fontSize:13, color:"#64748b" }}>{sc.count} aportes</div>
                  </div>
                  <div style={{ fontWeight:900, fontSize:20, color:"#6366f1" }}>{money(sc.total)}</div>
                </div>
              ))}
              <div style={{ ...socioRow, borderTop:"1px solid #e2e8f0", paddingTop:12, marginTop:2 }}>
                <span style={{ fontWeight:700 }}>Total capital</span>
                <span style={{ fontWeight:900, fontSize:20, color:"#0f172a" }}>{money(totalInversiones)}</span>
              </div>
            </div>
          </Panel>

          {/* Historial */}
          <Panel title={`Historial (${inversiones.length})`}>
            {inversiones.length === 0 ? (
              <EmptyState icon="💰" text="No hay aportes registrados." />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {inversiones.map((item) => (
                  <div key={item.id} style={s.histCard}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontWeight:700 }}>{item.socio}</div>
                        <div style={{ fontSize:13, color:"#94a3b8" }}>
                          {item.fecha}
                          {item.cuentaId && ` · ${cuentas.find((c) => c.id === item.cuentaId)?.nombre}`}
                        </div>
                        {item.descripcion && <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{item.descripcion}</div>}
                      </div>
                      <div style={{ fontWeight:900, fontSize:18, color:"#6366f1" }}>{money(item.valor)}</div>
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
const socioCard = { border:"2px solid #e2e8f0", borderRadius:12, padding:"14px 16px", cursor:"pointer", background:"#f8fafc" };
const socioActive = { border:"2px solid #6366f1", background:"#eef2ff" };
const socioRow = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"#f8fafc", borderRadius:10 };
