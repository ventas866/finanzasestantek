import { formatMeters } from "./utils.js";

export const CATALOGO_BASE = [
  ...[150,160,170,180,190,200,210,220,230,240,250,260,270,280,290,300].map((l) => ({
    id: `VIG-${l}`, sku: `VIG-${l}`,
    nombre: `Viga semipesada ${formatMeters(l)}`,
    categoria: "Viga", tipo: "Inventario propio", unidad: "und", costoBase: 0,
  })),
  ...[200, 240].flatMap((alto) =>
    [40, 50, 60, 70, 80, 90, 100].map((prof) => ({
      id: `MAR-${alto}-${prof}`, sku: `MAR-${alto}-${prof}`,
      nombre: `Marco semipesado ${formatMeters(alto)} x ${formatMeters(prof)}`,
      categoria: "Marco", tipo: "Inventario propio", unidad: "und", costoBase: 0,
    }))
  ),
  ...[150, 200, 240, 280, 300].flatMap((largo) =>
    [40, 50, 60, 80].map((prof) => ({
      id: `GALV-${largo}-${prof}`, sku: `GALV-${largo}-${prof}`,
      nombre: `Entrepaño galvanizado ${formatMeters(largo)} x ${formatMeters(prof)}`,
      categoria: "Galvanizado", tipo: "Reventa", unidad: "und", costoBase: 0,
    }))
  ),
  ...[150, 200, 240, 280, 300].flatMap((largo) =>
    [40, 50, 60, 80].map((prof) => ({
      id: `MDECO-${largo}-${prof}`, sku: `MDECO-${largo}-${prof}`,
      nombre: `Entrepaño madera económica ${formatMeters(largo)} x ${formatMeters(prof)}`,
      categoria: "Madera económica", tipo: "Inventario propio", unidad: "und", costoBase: 0,
    }))
  ),
  ...[150, 200, 240, 280, 300].flatMap((largo) =>
    [40, 50, 60, 80].map((prof) => ({
      id: `MPREM-${largo}-${prof}`, sku: `MPREM-${largo}-${prof}`,
      nombre: `Entrepaño madera premium ${formatMeters(largo)} x ${formatMeters(prof)}`,
      categoria: "Madera premium", tipo: "Bajo pedido", unidad: "und", costoBase: 0,
    }))
  ),
  { id:"PESADA-TORRE", sku:"PESADA-TORRE", nombre:"Torre estantería pesada", categoria:"Pesada", tipo:"Reventa", unidad:"und", costoBase:0 },
  { id:"PESADA-VIGA",  sku:"PESADA-VIGA",  nombre:"Viga estantería pesada",  categoria:"Pesada", tipo:"Reventa", unidad:"und", costoBase:0 },
  { id:"PESADA-GALV",  sku:"PESADA-GALV",  nombre:"Entrepaño galvanizado pesada", categoria:"Pesada", tipo:"Reventa", unidad:"und", costoBase:0 },
  { id:"PESADA-COMP",  sku:"PESADA-COMP",  nombre:"Estantería pesada completa",   categoria:"Pesada", tipo:"Reventa", unidad:"und", costoBase:0 },
  { id:"SERV-INST",    sku:"SERV-INST",    nombre:"Servicio de instalación",   categoria:"Servicio", tipo:"Servicio", unidad:"serv", costoBase:0 },
  { id:"SERV-TRANS",   sku:"SERV-TRANS",   nombre:"Servicio de transporte",    categoria:"Servicio", tipo:"Servicio", unidad:"serv", costoBase:0 },
  { id:"SERV-DESMON",  sku:"SERV-DESMON",  nombre:"Servicio de desmonte",      categoria:"Servicio", tipo:"Servicio", unidad:"serv", costoBase:0 },
  { id:"SERV-MODIF",   sku:"SERV-MODIF",   nombre:"Servicio de modificación",  categoria:"Servicio", tipo:"Servicio", unidad:"serv", costoBase:0 },
];

export const NAV_ITEMS = [
  { id:"Dashboard",    label:"Dashboard",      icon:"◈" },
  { id:"Inventario",   label:"Inventario",     icon:"⊞" },
  { id:"Compras",      label:"Compras",        icon:"⬇" },
  { id:"Ventas",       label:"Ventas",         icon:"⬆" },
  { id:"Caja",         label:"Caja",           icon:"◎" },
  { id:"Cartera",      label:"Cartera",        icon:"⊙" },
  { id:"Gastos",       label:"Gastos",         icon:"−" },
  { id:"Inversiones",  label:"Inversiones",    icon:"⊕" },
  { id:"Rentabilidad", label:"Rentabilidad",   icon:"%" },
];

export const DEFAULT_CUENTAS = [
  { id:"ef001", nombre:"Efectivo",     tipo:"efectivo", saldoInicial:0, color:"#10b981" },
  { id:"bc001", nombre:"Bancolombia",  tipo:"banco",    saldoInicial:0, color:"#3b82f6" },
  { id:"nq001", nombre:"Nequi",        tipo:"nequi",    saldoInicial:0, color:"#8b5cf6" },
  { id:"bb001", nombre:"BBVA",         tipo:"banco",    saldoInicial:0, color:"#1d4ed8" },
  { id:"sa001", nombre:"Santol",       tipo:"banco",    saldoInicial:0, color:"#dc2626" },
];

export const ORIGEN_COLORS = {
  "Inventario propio": { bg:"#dbeafe", color:"#1d4ed8" },
  "Reventa":           { bg:"#fef3c7", color:"#92400e" },
  "Bajo pedido":       { bg:"#f3e8ff", color:"#6b21a8" },
  "Servicio":          { bg:"#d1fae5", color:"#065f46" },
  "Mixto":             { bg:"#e0e7ff", color:"#4338ca" },
};

export const CATEGORIA_COLORS = {
  "Viga":             { bg:"#e0f2fe", color:"#0369a1" },
  "Marco":            { bg:"#ffe4e6", color:"#be123c" },
  "Galvanizado":      { bg:"#d1fae5", color:"#065f46" },
  "Madera económica": { bg:"#fef9c3", color:"#713f12" },
  "Madera premium":   { bg:"#f3e8ff", color:"#6b21a8" },
  "Pesada":           { bg:"#fee2e2", color:"#991b1b" },
  "Servicio":         { bg:"#f0fdf4", color:"#166534" },
};

export const GASTO_CATEGORIAS = [
  "Financiero","Publicidad","Dominio web","Transporte","Herramientas","Administrativo","Otro"
];
