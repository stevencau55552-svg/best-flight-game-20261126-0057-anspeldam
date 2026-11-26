// Sky Courier: Coral Run — hand-in program (Node 22, standard library only).
// Copies this repository's game/ and screenshots/ into the output folder
// (/output in the grader, MAKEFUN_OUTPUT_DIR locally) and writes
// dossier.json with the kit's buildDossier. Both runs write the same bytes:
// the copy is a plain recursive copy and the dossier is built from the
// copied files alone.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_TEXT_CAP = 163840;
const SHOT_LIMITS = { max: 4, max_bytes: 262144 };
const GAME_LIMITS = { game_max_files: 993, game_max_bytes: 50331648, game_path_max_bytes: 1000 };

function copyEntryTree() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  }
}

function writeEntryDossier() {
  const dossier = buildDossier(outputDir, {
    text_max_bytes: DOSSIER_TEXT_CAP,
    screenshots: SHOT_LIMITS,
    ...GAME_LIMITS,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

copyEntryTree();
writeEntryDossier();
