/**
 * Genera la lista de precarga del service worker tras `next build`.
 *
 * Motivo (2026-08-20): la app se usa EN CAMPO sin internet. Con caché solo
 * de lo visitado, un módulo que nunca se abrió en línea no funcionaba sin
 * señal. Este script recorre `out/`, lista TODOS los archivos del sitio y
 * los inyecta en el sw.js exportado, que los precarga completos en la
 * primera visita con conexión: desde entonces los tres módulos abren sin
 * internet.
 *
 * También versiona la caché con un hash del contenido: cada despliegue
 * estrena caché (y el activate del SW borra las viejas), así nunca se
 * mezclan archivos de dos versiones.
 *
 * Se ejecuta como parte de `npm run build` (local y en GitHub Actions).
 * El sw.js FUENTE (public/) conserva los marcadores: en `next dev` no hay
 * precarga, que sería contraproducente con chunks de desarrollo.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const OUT = 'out';
const SW = join(OUT, 'sw.js');

/** El propio SW no se precarga; el navegador lo gestiona aparte. */
const EXCLUIR = new Set(['sw.js']);

function listar(dir) {
  const archivos = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos.push(...listar(ruta));
    else archivos.push(ruta);
  }
  return archivos;
}

const archivos = listar(OUT)
  .map((r) => relative(OUT, r).replaceAll('\\', '/'))
  .filter((r) => !EXCLUIR.has(r))
  .sort();

// Hash del contenido completo del sitio: si nada cambió, la caché se
// conserva; si algo cambió, se estrena una.
const hash = createHash('sha256');
for (const r of archivos) hash.update(r).update(readFileSync(join(OUT, r)));
const version = hash.digest('hex').slice(0, 12);

let sw = readFileSync(SW, 'utf8');
const antes = sw;
sw = sw.replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(archivos)};`);
sw = sw.replace("const BUILD_ID = 'dev';", `const BUILD_ID = '${version}';`);
if (sw === antes) {
  console.error('generar-precache: no se encontraron los marcadores en out/sw.js');
  process.exit(1);
}
writeFileSync(SW, sw);

const totalKb = Math.round(archivos.reduce((s, r) => s + statSync(join(OUT, r)).size, 0) / 1024);
console.log(`precache: ${archivos.length} archivos (${totalKb} KB) · build ${version}`);
