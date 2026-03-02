// main.js — Inicialización del mapa y coordinación de módulos

import {
  agregarGanador,
  getPaintVariable,
  renderizarLeyenda,
  variablesPresentes,
  VARIABLES_CONFIG,
} from './coropleta.js';

import {
  renderGraficaAgregada,
  renderGraficaSeccion,
  limpiarGraficaSeccion,
} from './graficas.js';

// ─── Estado de la app ─────────────────────────────────────────────────────
const estado = {
  capa:          'gubernatura',
  variable:      'ganador',
  features:      [],
  seccionActiva: null,
};

// ─── Mapa ─────────────────────────────────────────────────────────────────
const map = new maplibregl.Map({
  container: 'mapa',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [-93.8, 18.1],
  zoom: 9.7,
});

const popup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: 8,
});

// ─── Carga inicial ────────────────────────────────────────────────────────
map.on('load', async () => {
  const geojson = await cargarGeoJSON(estado.capa);
  estado.features = geojson.features;

  map.addSource('secciones', { type: 'geojson', data: geojson });

  map.addLayer({
    id: 'secciones-fill',
    type: 'fill',
    source: 'secciones',
    paint: {
      'fill-color': getPaintVariable('ganador', estado.features),
      'fill-opacity': 0.75,
    },
  });

  map.addLayer({
    id: 'secciones-border',
    type: 'line',
    source: 'secciones',
    paint: { 'line-color': '#ffffff', 'line-width': 0.6, 'line-opacity': 0.8 },
  });

  map.addLayer({
    id: 'secciones-highlight',
    type: 'line',
    source: 'secciones',
    paint: { 'line-color': '#1a2535', 'line-width': 2.5 },
    filter: ['==', 'seccion', ''],
  });

  // Límite municipal (capa de referencia, siempre visible al frente)
  const limiteMunicipal = await fetch('datos/procesados/limite_municipal_tabasco.geojson').then(r => r.json());
  map.addSource('limite-municipal', { type: 'geojson', data: limiteMunicipal });
  map.addLayer({
    id: 'limite-municipal-line',
    type: 'line',
    source: 'limite-municipal',
    paint: { 'line-color': '#1e2d45', 'line-width': 1.8, 'line-opacity': 0.9 },
  });

  construirSelectorVariables(estado.features);
  renderizarLeyenda(document.getElementById('leyenda'), 'ganador', estado.features);
  renderGraficaAgregada(null, estado.features);
  iniciarEventosMapa();
});

// ─── Carga de GeoJSON ─────────────────────────────────────────────────────
async function cargarGeoJSON(capa) {
  const res = await fetch(`datos/procesados/resultados_seccion_${capa}.geojson`);
  const geojson = await res.json();
  agregarGanador(geojson.features);
  return geojson;
}

// ─── Selector de variables (dinámico) ────────────────────────────────────
function construirSelectorVariables(features) {
  const container = document.getElementById('lista-variables');
  container.innerHTML = '';

  const vars = variablesPresentes(features);
  let grupoActual = null;

  for (const cfg of vars) {
    // Separador de grupo
    if (cfg.grupo !== grupoActual) {
      grupoActual = cfg.grupo;
      if (cfg.grupo) {
        const sep = document.createElement('div');
        sep.className = 'var-grupo-label';
        sep.textContent = cfg.grupo;
        container.appendChild(sep);
      }
    }

    const label = document.createElement('label');
    label.className = 'radio-label';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'variable';
    radio.value = cfg.key;
    if (cfg.key === estado.variable) radio.checked = true;

    radio.addEventListener('change', () => {
      estado.variable = cfg.key;
      aplicarPintura();
    });

    label.appendChild(radio);
    label.appendChild(document.createTextNode(cfg.label));
    container.appendChild(label);
  }

  // Si la variable activa ya no existe en la nueva capa, volver a ganador
  const keys = vars.map(v => v.key);
  if (!keys.includes(estado.variable)) {
    estado.variable = 'ganador';
    const radio = container.querySelector('input[value="ganador"]');
    if (radio) radio.checked = true;
  }
}

// ─── Pintura del mapa ─────────────────────────────────────────────────────
function aplicarPintura() {
  const paint = getPaintVariable(estado.variable, estado.features);
  map.setPaintProperty('secciones-fill', 'fill-color', paint);
  renderizarLeyenda(
    document.getElementById('leyenda'),
    estado.variable,
    estado.features,
  );
}

// ─── Eventos del mapa ─────────────────────────────────────────────────────
function iniciarEventosMapa() {
  map.on('mouseenter', 'secciones-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'secciones-fill', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });

  map.on('mousemove', 'secciones-fill', e => {
    if (!e.features.length) return;
    const p = e.features[0].properties;
    popup
      .setLngLat(e.lngLat)
      .setHTML(`<div class="popup-titulo">Sección ${p.seccion}</div>${valorTooltip(p)}`)
      .addTo(map);
  });

  map.on('click', 'secciones-fill', e => {
    if (!e.features.length) return;
    const seccion = e.features[0].properties.seccion;
    const featureCompleta = estado.features.find(f => f.properties.seccion === seccion);
    if (!featureCompleta) return;

    estado.seccionActiva = seccion;
    map.setFilter('secciones-highlight', ['==', 'seccion', seccion]);
    renderGraficaSeccion(featureCompleta, estado.features);
  });
}

function valorTooltip(props) {
  const cfg = VARIABLES_CONFIG.find(v => v.key === estado.variable);
  if (!cfg) return '';

  if (cfg.tipo === 'categorico') {
    return `Ganador: <strong>${props.ganador ?? '—'}</strong>`;
  }
  if (cfg.tipo === 'pct') {
    const val = props[estado.variable] != null
      ? (props[estado.variable] * 100).toFixed(1) + ' %'
      : '—';
    return `${cfg.label}: <strong>${val}</strong>`;
  }
  const val = props[estado.variable] != null
    ? Number(props[estado.variable]).toLocaleString('es-MX')
    : '—';
  return `${cfg.label}: <strong>${val}</strong>`;
}

// ─── Botón cierre del popup de sección ───────────────────────────────────
document.getElementById('popup-cerrar').addEventListener('click', () => {
  limpiarGraficaSeccion();
  map.setFilter('secciones-highlight', ['==', 'seccion', '']);
  estado.seccionActiva = null;
});

// ─── Selector de capas ────────────────────────────────────────────────────
document.querySelectorAll('.btn-capa').forEach(btn => {
  btn.addEventListener('click', async () => {
    const nuevaCapa = btn.dataset.capa;
    if (nuevaCapa === estado.capa) return;

    estado.capa = nuevaCapa;
    estado.seccionActiva = null;

    document.querySelectorAll('.btn-capa').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');

    const geojson = await cargarGeoJSON(nuevaCapa);
    estado.features = geojson.features;
    map.getSource('secciones').setData(geojson);
    map.setFilter('secciones-highlight', ['==', 'seccion', '']);

    construirSelectorVariables(estado.features); // reconstruye lista + ajusta variable activa
    aplicarPintura();
    renderGraficaAgregada(null, estado.features);
    limpiarGraficaSeccion();
  });
});
