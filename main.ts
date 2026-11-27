// Gobble's Great Escape — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from beside this file into the output directory
// and writes output/dossier.json with buildDossier from vendor/makefun-game.ts.
//   node main.ts --output out
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// The program is deterministic: two runs write byte-identical output.
// It takes no input but this repository: no network, no environment secrets,
// nothing read from outside the directory that holds it.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

function outputDir(argv) {
  const flag = argv.indexOf('--output');
  if (flag !== -1 && argv[flag + 1]) return argv[flag + 1];
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

const out = outputDir(process.argv.slice(2));

// Start from a clean output directory so a stale file can never leak into a run.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The playable game: plain static files, game/index.html at its root.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// The screenshots: real renders of the game's own code, first by name the cover.
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier the judge reads: the same caps the scorer's gate uses.
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
