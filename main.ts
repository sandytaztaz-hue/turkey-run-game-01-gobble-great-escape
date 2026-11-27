// Gobble's Great Escape — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ beside this file into the output directory
// and writes dossier.json with buildDossier from vendor/makefun-game.ts.
// Usage: node main.ts --output out   (or MAKEFUN_OUTPUT_DIR=out node main.ts)
// The output is deterministic: the same repo writes the same bytes twice.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const outIndex = args.indexOf('--output');
const out = outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : (process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

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
