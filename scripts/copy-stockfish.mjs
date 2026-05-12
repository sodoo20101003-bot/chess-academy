#!/usr/bin/env node
/**
 * Stockfish файлуудыг `node_modules/stockfish.wasm/`-аас
 * `public/stockfish/` руу хуулна.
 *
 * Ашиглах:
 *   npm install stockfish.wasm@0.10.0
 *   node scripts/copy-stockfish.mjs
 *
 * Эсвэл `package.json`-д "postinstall": "node scripts/copy-stockfish.mjs"
 * гэж нэмбэл `npm install` бүрд автоматаар ажиллана.
 */

import { mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'node_modules', 'stockfish.wasm')
const dest = join(root, 'public', 'stockfish')

if (!existsSync(src)) {
  console.warn('[copy-stockfish] node_modules/stockfish.wasm олдсонгүй — алгаслаа.')
  console.warn('  `npm install stockfish.wasm@0.10.0` ажиллуулна уу.')
  process.exit(0)
}

mkdirSync(dest, { recursive: true })

// stockfish.wasm пакетийн дотор `stockfish.js`, `stockfish.wasm`, заримдаа `stockfish.worker.js` байна
const files = readdirSync(src).filter((f) =>
  /^stockfish(\.worker)?\.(js|wasm)$/.test(f)
)

if (files.length === 0) {
  console.warn('[copy-stockfish] stockfish файл олдсонгүй —', src)
  process.exit(0)
}

for (const f of files) {
  copyFileSync(join(src, f), join(dest, f))
  console.log(`[copy-stockfish] ${f} → public/stockfish/${f}`)
}

console.log(`[copy-stockfish] Амжилттай — ${files.length} файл хуулагдсан.`)
