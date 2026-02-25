# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Geovisor de datos electorales para el municipio de Cárdenas, Tabasco, Mexico. Visualiza resultados del PELO 2023-2024 (Proceso Electoral Local Ordinario) sobre un mapa interactivo. Es una aplicación web estática (sin backend) construida con HTML/JS vanilla, MapLibre GL JS y Observable Plot.

## Development

Dado que la app usa `type="module"` y carga GeoJSON por HTTP, se necesita un servidor local (abrir `index.html` directamente con `file://` no funciona con MapLibre):

```bash
# Python (recomendado, sin dependencias)
python -m http.server 8080

# Node.js
npx serve .

# VS Code: extensión "Live Server"
```

Luego abrir `http://localhost:8080`.

## Project Structure

```
eleccionesTabasco/
├── index.html                  # Entrada principal — carga MapLibre, Observable Plot y main.js
├── src/
│   ├── js/
│   │   └── main.js             # Inicialización del mapa y coordinación de módulos
│   └── css/
│       └── estilos.css         # Layout: header + mapa + panel lateral
├── datos/
│   ├── insumos/                # Datos fuente (no rastreados en git)
│   │   ├── geojson/            # Límites geográficos (WGS84/CRS84)
│   │   │   ├── 00_estado.geojson
│   │   │   ├── 00_municipio.geojson
│   │   │   ├── 01_distrito_federal.geojson
│   │   │   ├── 02_distrito_local.geojson
│   │   │   └── 03_seccion.geojson   # Secciones electorales (más granular, 9 MB)
│   │   └── tablas/             # Resultados electorales (.xlsx)
│   └── procesados/             # GeoJSON/CSV derivados listos para la app
└── CLAUDE.md
```

## Architecture

La app sigue un layout de dos paneles:
- **`#mapa`** (izquierda, flex-grow): mapa MapLibre GL JS
- **`#panel-lateral`** (derecha, 320px): gráficas Observable Plot y filtros

El flujo esperado:
1. `main.js` inicializa el mapa centrado en Cárdenas (`[-93.37, 18.0]`)
2. Carga capas GeoJSON desde `datos/procesados/` como sources de MapLibre
3. Al hacer clic/hover en una feature, actualiza el panel lateral con gráficas Observable Plot

## Data

### Jerarquía geográfica
**Estado → Municipio → Distrito Federal / Distrito Local → Sección**

### Convenciones de nombres
- `dt` = distrito (gubernatura)
- `dto` = distrito (diputaciones)
- `ayuntamientos` = elecciones municipales
- `gubernatura` = elección de gobernador
- `diputaciones` = legislatura estatal
- Archivos `cardenas_*` = datos del municipio de Cárdenas

### datos/procesados/
Aquí van los GeoJSON filtrados o enriquecidos con datos electorales listos para consumir directamente desde la app (sin transformaciones en el browser).

## Key Libraries (via CDN)

- **MapLibre GL JS v4** — renderizado de mapas vectoriales
- **Observable Plot v0.6** — gráficas declarativas
- Basemap: CartoDB Positron (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`)
