# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Geovisor de datos electorales para el municipio de Cárdenas, Tabasco, Mexico. Visualiza resultados del PELO 2023-2024 (Proceso Electoral Local Ordinario) sobre un mapa interactivo. Es una aplicación web estática (sin backend) construida con HTML/JS vanilla, MapLibre GL JS y Observable Plot.

Tiene dos partes:
1. **Pipeline de datos** (Python/Jupyter): convierte .xlsx crudos → CSVs normalizados
2. **Geovisor** (JS estático): consume esos CSVs y GeoJSONs sobre un mapa interactivo

## Development

### Geovisor (frontend)

Dado que la app usa `type="module"` y carga GeoJSON por HTTP, se necesita un servidor local:

```bash
python -m http.server 8080   # luego abrir http://localhost:8080
```

### Pipeline de datos (Python)

El proyecto usa **uv** como gestor de entorno/dependencias (ver `uv.lock`):

```bash
uv sync                  # instalar dependencias en .venv
uv run jupyter notebook  # abrir Jupyter para ejecutar el notebook
```

El único notebook es `notebooks/01_homologacion_datos.ipynb`. Al ejecutarlo completo produce los CSVs en `datos/procesados/`.

## Architecture

### Frontend

Layout de dos paneles en `index.html`:
- **`#mapa`** (izquierda, `flex-grow`): mapa MapLibre GL JS
- **`#panel-lateral`** (derecha, 320 px): gráficas Observable Plot

Flujo de `src/js/main.js`:
1. Inicializa el mapa centrado en Cárdenas (`[-93.37, 18.0]`)
2. Carga capas GeoJSON desde `datos/procesados/` como sources de MapLibre
3. Al hacer clic/hover en una feature, actualiza `#graficas` con Observable Plot

Librerías via CDN (sin bundler):
- **MapLibre GL JS v4** — mapa vectorial
- **Observable Plot v0.6** — gráficas declarativas
- Basemap: CartoDB Positron

### Pipeline de datos

`notebooks/01_homologacion_datos.ipynb` sigue este flujo:

```
datos/insumos/tablas/*.xlsx   →  normalizar_archivo()  →  resultados (1173 filas × casilla)
                                                        →  agregar_por_seccion()
                                                        →  datos/procesados/resultados_seccion_{tipo}.csv
```

Los tres CSVs de salida (`gubernatura`, `diputaciones`, `ayuntamiento`) comparten el mismo esquema:

| Columna | Descripción |
|---|---|
| `seccion` | 4 dígitos con cero a la izquierda |
| `tipo_eleccion` | `gubernatura` / `diputaciones` / `ayuntamiento` |
| `distrito` | `DT-01..03`, `DTO-01..03`, o `None` (ayuntamiento) |
| `PAN`, `PRI`, `PRD`, `PVEM`, `PT`, `MC`, `MORENA`, `CAND_IND` | votos por partido |
| `total_pvem_pt_morena`, `total_pvem_morena`, `total_pan_pri` | totales de coalición |
| `votos_validos`, `cand_no_reg`, `votos_nulos`, `total_votos` | resumen de acta |
| `lista_nominal`, `participacion` | padrón y tasa de participación |

## Data

### Jerarquía geográfica
**Estado → Municipio → Distrito Federal / Distrito Local → Sección**

GeoJSONs en `datos/insumos/geojson/` (WGS84/CRS84): `00_estado`, `00_municipio`, `01_distrito_federal`, `02_distrito_local`, `03_seccion` (9 MB).

### Convenciones de nombres
- `dt` = distrito (gubernatura) | `dto` = distrito (diputaciones)
- `cardenas_*` = datos del municipio de Cárdenas
- `datos/procesados/` = archivos listos para la app, sin transformaciones en el browser

### Notas sobre los datos crudos
- Los .xlsx tienen columnas de sub-coalición (e.g. "PVEM Y MORENA") distintas de las columnas de total de coalición ("TOTAL PVEM Y MORENA"); el notebook descarta las sub-columnas.
- Las filas con `casilla = NaN` en los .xlsx son filas de totales al pie de tabla; se eliminan en la normalización.
- La columna `seccion` puede estar vacía en casillas de VOTO ANTICIPADO; se rellena con `"0000"`.
