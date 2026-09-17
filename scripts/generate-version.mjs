#!/usr/bin/env node
/**
 * Gera a versão pública do app a cada build.
 * Patch = commits desde o marco de versionamento (v0.0.1 no primeiro build).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Commits no repo antes do versionamento público (rev-list era 11). */
const VERSION_EPOCH = 11;

function commitCount() {
  try {
    return Number(
      execSync("git rev-list --count HEAD", { cwd: root }).toString().trim(),
    );
  } catch {
    return VERSION_EPOCH + 1;
  }
}

const count = commitCount();
const patch = Math.max(1, count - VERSION_EPOCH);
const version = `0.0.${patch}`;
const display = `v${version}`;

const outPath = path.join(root, "src/lib/app-version.ts");
writeFileSync(
  outPath,
  `/** Gerado em build — não editar à mão. Rode: node scripts/generate-version.mjs */\n` +
    `export const APP_VERSION = ${JSON.stringify(version)};\n` +
    `export const APP_VERSION_LABEL = ${JSON.stringify(display)};\n`,
);

const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`[version] ${display} (commits=${count}, epoch=${VERSION_EPOCH})`);
