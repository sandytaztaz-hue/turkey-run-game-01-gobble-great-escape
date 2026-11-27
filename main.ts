// Gobble's Great Escape — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from beside this file into the output dir and
// writes dossier.json with the vendored make.fun library. Accepts
// --output <dir>; otherwise MAKEFUN_OUTPUT_DIR, otherwise /output.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const argv = process.argv.slice(2);
let out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const oi = argv.indexOf('--output');
if (oi !== -1 && argv[oi + 1]) out = argv[oi + 1];

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('wrote dossier to ' + join(out, 'dossier.json'));
