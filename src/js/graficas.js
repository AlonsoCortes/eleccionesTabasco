// graficas.js — Gráficas Observable Plot y fichas de métricas

import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm';
import { PARTIDOS, COLORES_PARTIDO } from './coropleta.js';

const ETIQUETA = {
  PAN: 'PAN', PRI: 'PRI', PRD: 'PRD', PVEM: 'PVEM',
  PT: 'PT', MC: 'MC', MORENA: 'MORENA', CAND_IND: 'Cand. Ind.',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(valor, total) {
  if (!total) return '—';
  return (valor / total * 100).toFixed(1) + ' %';
}

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-MX');
}

// Convierte las propiedades de una o varias features en [{partido, votos}]
function datosPartidos(propsList) {
  const totales = {};
  for (const p of PARTIDOS) totales[p] = 0;
  for (const props of propsList) {
    for (const p of PARTIDOS) totales[p] += props[p] ?? 0;
  }
  return PARTIDOS
    .filter(p => totales[p] > 0)
    .map(p => ({ partido: p, etiqueta: ETIQUETA[p], votos: totales[p] }))
    .sort((a, b) => b.votos - a.votos);
}

function barplotPartidos(datos, ancho) {
  return Plot.plot({
    width: ancho ?? 270,
    marginLeft: 68,
    marginRight: 10,
    marginTop: 8,
    marginBottom: 24,
    x: { label: 'Votos', tickFormat: d => d >= 1000 ? (d / 1000).toFixed(0) + 'k' : d },
    y: { label: null },
    marks: [
      Plot.barX(datos, {
        x: 'votos',
        y: 'etiqueta',
        fill: d => COLORES_PARTIDO[d.partido] ?? '#888',
        sort: { y: '-x' },
        tip: true,
        title: d => `${d.etiqueta}: ${fmt(d.votos)} votos`,
      }),
      Plot.ruleX([0], { stroke: '#ccc' }),
    ],
  });
}

function metricaHTML(valor, etiqueta) {
  return `<div class="metrica"><span class="metrica-valor">${valor}</span><span class="metrica-etiqueta">${etiqueta}</span></div>`;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Renderiza barplot + métricas clave para la capa completa.
 * @param {HTMLElement} container  #panel-agregados
 * @param {Array}       features   todas las features del GeoJSON activo
 */
export function renderGraficaAgregada(container, features) {
  const props = features.map(f => f.properties);

  // Métricas
  const totalVotos   = props.reduce((s, p) => s + (p.total_votos   ?? 0), 0);
  const listaNominal = props.reduce((s, p) => s + (p.lista_nominal ?? 0), 0);
  const votosNulos   = props.reduce((s, p) => s + (p.votos_nulos   ?? 0), 0);
  const particip     = listaNominal > 0 ? totalVotos / listaNominal : 0;

  const metricas = document.getElementById('metricas-agregadas');
  metricas.innerHTML =
    metricaHTML(fmt(listaNominal), 'Lista nominal') +
    metricaHTML(fmt(totalVotos),  'Total votos') +
    metricaHTML((particip * 100).toFixed(1) + ' %', 'Participación') +
    metricaHTML(pct(votosNulos, totalVotos), 'Votos nulos');

  // Barplot
  const grafDiv = document.getElementById('grafica-agregada');
  grafDiv.innerHTML = '';
  const datos = datosPartidos(props);
  grafDiv.appendChild(barplotPartidos(datos, grafDiv.clientWidth || 270));
}

/**
 * Renderiza ficha completa de una sección seleccionada.
 * @param {Object} feature        feature clickeada
 * @param {Array}  todosFeatures  todas las features (para comparación)
 */
export function renderGraficaSeccion(feature, todosFeatures) {
  const p = feature.properties;
  const todasProps = todosFeatures.map(f => f.properties);

  // Mostrar popup
  const popup = document.getElementById('popup-seccion');
  popup.classList.remove('oculto');
  document.getElementById('popup-sec-id').textContent = p.seccion;

  // Métricas de la sección
  const participSeccion  = p.lista_nominal > 0 ? p.total_votos / p.lista_nominal : 0;
  const participMunicipal = (() => {
    const tv = todasProps.reduce((s, q) => s + (q.total_votos ?? 0), 0);
    const ln = todasProps.reduce((s, q) => s + (q.lista_nominal ?? 0), 0);
    return ln > 0 ? tv / ln : 0;
  })();

  const metDiv = document.getElementById('popup-sec-metricas');
  metDiv.innerHTML =
    metricaHTML((participSeccion * 100).toFixed(1) + ' %', 'Participación') +
    metricaHTML(fmt(p.total_votos), 'Total votos') +
    metricaHTML(fmt(p.lista_nominal), 'Lista nominal') +
    metricaHTML(pct(p.votos_nulos, p.total_votos), 'Votos nulos') +
    (p.distrito ? metricaHTML(p.distrito, 'Distrito') : '');

  // Comparación participación
  const diffPp = ((participSeccion - participMunicipal) * 100).toFixed(1);
  const signo  = diffPp >= 0 ? '+' : '';
  const clase  = diffPp >= 0 ? 'positivo' : 'negativo';
  metDiv.insertAdjacentHTML('beforeend',
    `<div class="metrica comparacion">
      <span class="metrica-valor ${clase}">${signo}${diffPp} pp</span>
      <span class="metrica-etiqueta">vs. municipio</span>
    </div>`
  );

  // Barplot de la sección
  const grafDiv = document.getElementById('popup-sec-grafica');
  grafDiv.innerHTML = '';
  const datos = datosPartidos([p]);
  grafDiv.appendChild(barplotPartidos(datos, 225));
}

/**
 * Limpia el panel de particulares (cuando se cambia de capa).
 */
export function limpiarGraficaSeccion() {
  document.getElementById('popup-seccion').classList.add('oculto');
  document.getElementById('popup-sec-id').textContent = '—';
  document.getElementById('popup-sec-metricas').innerHTML = '';
  document.getElementById('popup-sec-grafica').innerHTML = '';
}
