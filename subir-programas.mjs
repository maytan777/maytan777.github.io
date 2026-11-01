// =====================================================
// Sube programas_sin_contra/ a Supabase Storage (bucket
// programas-sin-contra). Ejecutar UNA sola vez desde la
// carpeta del proyecto:
//
//   1. En Supabase → Settings → API → copia la SERVICE ROLE key
//      (no la anon key). No la compartas ni la subas a GitHub.
//   2. En una terminal (con Node 18+):
//        set SUPABASE_SERVICE_KEY=sb_secret_...   (Windows)
//        node subir-programas.mjs
//   3. Borra la variable del entorno cuando termines.
// =====================================================

import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPABASE_URL = 'https://bidintbjpgpeyscirxwl.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'programas-sin-contra';
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'programas_sin_contra');

if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_KEY. Ejemplo:');
  console.error('  set SUPABASE_SERVICE_KEY=sb_secret_xxx && node subir-programas.mjs');
  process.exit(1);
}

async function* walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function uploadOne(absPath) {
  const rel = relative(ROOT, absPath).split(sep).join('/');
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(rel).replace(/%2F/g, '/')}`;
  const body = await readFile(absPath);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/octet-stream',
      'x-upsert': 'true',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return rel;
}

let ok = 0, fail = 0;
for await (const file of walk(ROOT)) {
  try {
    const rel = await uploadOne(file);
    ok++;
    console.log(`OK  ${rel}`);
  } catch (e) {
    fail++;
    console.error(`FAIL ${file}: ${e.message}`);
  }
}
console.log(`\nListo: ${ok} subidos, ${fail} fallos.`);
