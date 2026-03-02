// coropleta.js — Escalas de color y expresiones MapLibre para el choropleth

export const PARTIDOS = ['PAN', 'PRI', 'PRD', 'PVEM', 'PT', 'MC', 'MORENA', 'CAND_IND'];

export const COLORES_PARTIDO = {
  PAN:      '#003F9D',
  PRI:      '#C8102E',
  PRD:      '#F5C400',
  PVEM:     '#2E7D32',
  PT:       '#A50000',
  MC:       '#E65C00',
  MORENA:   '#7B1818',
  CAND_IND: '#555555',
};

// Configuración de todas las variables mapeables.
// Orden de aparición en el selector.
export const VARIABLES_CONFIG = [
  { key: 'ganador',              label: 'Partido ganador',      tipo: 'categorico', color: null,      grupo: null },
  { key: 'participacion',        label: 'Participación',         tipo: 'pct',        color: '#2a6fac', grupo: 'General' },
  { key: 'lista_nominal',        label: 'Lista nominal',         tipo: 'numerico',   color: '#2a6fac', grupo: 'General' },
  { key: 'total_votos',          label: 'Total votos',           tipo: 'numerico',   color: '#2a6fac', grupo: 'General' },
  { key: 'votos_validos',        label: 'Votos válidos',         tipo: 'numerico',   color: '#2a6fac', grupo: 'General' },
  { key: 'votos_nulos',          label: 'Votos nulos',           tipo: 'numerico',   color: '#5a6a80', grupo: 'General' },
  { key: 'cand_no_reg',          label: 'Cand. no reg.',         tipo: 'numerico',   color: '#5a6a80', grupo: 'General' },
  { key: 'PAN',                  label: 'PAN',                   tipo: 'partido',    color: '#003F9D', grupo: 'Partidos' },
  { key: 'PRI',                  label: 'PRI',                   tipo: 'partido',    color: '#C8102E', grupo: 'Partidos' },
  { key: 'PRD',                  label: 'PRD',                   tipo: 'partido',    color: '#F5C400', grupo: 'Partidos' },
  { key: 'PVEM',                 label: 'PVEM',                  tipo: 'partido',    color: '#2E7D32', grupo: 'Partidos' },
  { key: 'PT',                   label: 'PT',                    tipo: 'partido',    color: '#A50000', grupo: 'Partidos' },
  { key: 'MC',                   label: 'MC',                    tipo: 'partido',    color: '#E65C00', grupo: 'Partidos' },
  { key: 'MORENA',               label: 'MORENA',                tipo: 'partido',    color: '#7B1818', grupo: 'Partidos' },
  { key: 'CAND_IND',             label: 'Cand. Ind.',            tipo: 'partido',    color: '#555555', grupo: 'Partidos' },
  { key: 'total_pvem_pt_morena', label: 'Total PVEM+PT+MORENA',  tipo: 'numerico',   color: '#4a3070', grupo: 'Coaliciones' },
  { key: 'total_pvem_morena',    label: 'Total PVEM+MORENA',     tipo: 'numerico',   color: '#4a3070', grupo: 'Coaliciones' },
  { key: 'total_pan_pri',        label: 'Total PAN+PRI',         tipo: 'numerico',   color: '#1e3f6e', grupo: 'Coaliciones' },
];

// Retorna los ítems de VARIABLES_CONFIG presentes (con datos no nulos/cero) en las features.
export function variablesPresentes(features) {
  return VARIABLES_CONFIG.filter(cfg => {
    if (cfg.key === 'ganador') return true; // siempre disponible (se computa)
    return features.some(f => (f.properties[cfg.key] ?? 0) > 0);
  });
}

// Añade propiedad `ganador` a cada feature (muta el objeto)
export function agregarGanador(features) {
  for (const f of features) {
    const p = f.properties;
    let maxVotos = 0;
    let ganador = 'OTRO';
    for (const partido of PARTIDOS) {
      const v = p[partido] ?? 0;
      if (v > maxVotos) { maxVotos = v; ganador = partido; }
    }
    p.ganador = ganador;
  }
}

// Expresión MapLibre: color por partido ganador
export function getPaintGanador() {
  const expr = ['match', ['get', 'ganador']];
  for (const [partido, color] of Object.entries(COLORES_PARTIDO)) {
    expr.push(partido, color);
  }
  expr.push('#888888');
  return expr;
}

// Expresión MapLibre genérica según la variable y sus features
export function getPaintVariable(varName, features) {
  if (varName === 'ganador') return getPaintGanador();

  const cfg = VARIABLES_CONFIG.find(v => v.key === varName);
  if (!cfg) return getPaintGanador();

  const color = cfg.color ?? '#2a4a7f';

  if (cfg.tipo === 'pct') {
    // participacion está normalizada 0–1
    return [
      'interpolate', ['linear'], ['get', varName],
      0.10, '#e8f1fb',
      0.30, '#a8c8f0',
      0.50, '#5a9fd4',
      0.65, '#2a6fac',
      0.80, '#1e3f6e',
    ];
  }

  // Para numerico y partido: escala min→max de los datos reales
  const vals = features
    .map(f => f.properties[varName] ?? 0)
    .filter(v => v > 0);

  if (!vals.length) return ['literal', '#cccccc'];

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);

  return [
    'interpolate', ['linear'], ['get', varName],
    0,    '#f0f3f7',
    minV, lerpColor('#f0f3f7', color, 0.15),
    maxV, color,
  ];
}

// Renderiza la leyenda como clases discretas
export function renderizarLeyenda(container, varName, features) {
  container.innerHTML = '';

  const cfg = VARIABLES_CONFIG.find(v => v.key === varName);
  const tituloLabel = cfg ? cfg.label : varName;

  // Subtítulo de contexto
  const titulo = document.createElement('p');
  titulo.className = 'leyenda-subtitulo';
  titulo.textContent = tituloLabel;
  container.appendChild(titulo);

  if (varName === 'ganador') {
    const ul = document.createElement('ul');
    ul.className = 'leyenda-lista';
    const ganadoresPresentes = new Set(features.map(f => f.properties.ganador));
    for (const [p, color] of Object.entries(COLORES_PARTIDO)) {
      if (!ganadoresPresentes.has(p)) continue;
      const li = document.createElement('li');
      li.innerHTML = `<span class="leyenda-color" style="background:${color}"></span>${p}`;
      ul.appendChild(li);
    }
    container.appendChild(ul);
    return;
  }

  if (!cfg) return;

  const color = cfg.color ?? '#2a4a7f';
  const vals = features.map(f => f.properties[varName] ?? 0).filter(v => v > 0);
  if (!vals.length) return;

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);

  const etiquetarFn = cfg.tipo === 'pct'
    ? v => (v * 100).toFixed(0) + ' %'
    : v => fmt(v);

  _leyendaClases(container, '#f0f3f7', color, minV, maxV, etiquetarFn);
}

// ─── helpers internos ────────────────────────────────────────────────────────

const N_CLASES = 5;

function _leyendaClases(container, colorFondo, colorMax, minV, maxV, etiquetarFn) {
  const ul = document.createElement('ul');
  ul.className = 'leyenda-lista';
  const paso = (maxV - minV) / N_CLASES;

  for (let i = 0; i < N_CLASES; i++) {
    const desde = minV + i * paso;
    const hasta = minV + (i + 1) * paso;
    // Interpolar color en el punto medio de la clase (t de 0 a 1)
    const t = (i + 0.5) / N_CLASES;
    const color = lerpColor(colorFondo, colorMax, t);

    const label = i === N_CLASES - 1
      ? `${etiquetarFn(desde)} – ${etiquetarFn(maxV)}`
      : `${etiquetarFn(desde)} – ${etiquetarFn(hasta)}`;

    const li = document.createElement('li');
    li.innerHTML = `<span class="leyenda-color" style="background:${color}"></span>${label}`;
    ul.appendChild(li);
  }

  container.appendChild(ul);
}

function fmt(n) {
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

// Interpola linealmente entre colorA (t=0) y colorB (t=1)
function lerpColor(colorA, colorB, t) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
