// Punto de entrada principal del geovisor
// Inicializa el mapa y coordina los demás módulos

const map = new maplibregl.Map({
  container: 'mapa',
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  center: [-93.37, 18.0], // Cárdenas, Tabasco (lon, lat)
  zoom: 10,
});

map.on('load', () => {
  // TODO: cargar capas GeoJSON (secciones, distritos)
  // TODO: conectar con panel lateral y gráficas
});
