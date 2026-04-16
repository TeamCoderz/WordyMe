#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const EXCLUDED_DIRECTORIES = ["/node_modules/", "/dist/", "/.turbo/", "/coverage/"];

const mode = process.argv[2];
const fileArgs = process.argv.slice(3);
const SOURCE_ROOTS = ["apps/", "packages/"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

if (mode !== "add" && mode !== "check") {
  console.error("Usage: node scripts/spdx-license-cli.mjs <add|check> [files...]");
  process.exit(1);
}

function normalizeRelativePath(filePath) {
  const absoluteRoot = resolve(process.cwd());
  const absolutePath = resolve(filePath);

  if (absolutePath.startsWith(absoluteRoot)) {
    return absolutePath.slice(absoluteRoot.length + 1).replaceAll("\\", "/");
  }

  return filePath.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function hasSupportedExtension(filePath) {
  for (const extension of SOURCE_EXTENSIONS) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }

  return false;
}

function isInExcludedDirectory(filePath) {
  return EXCLUDED_DIRECTORIES.some((directory) => filePath.includes(directory));
}

function isRelevantFile(filePath) {
  if (!filePath || filePath.endsWith("/")) {
    return false;
  }

  if (isInExcludedDirectory(filePath)) {
    return false;
  }

  if (filePath.endsWith(".d.ts") || filePath.endsWith(".gen.ts")) {
    return false;
  }

  const isSourceFile =
    SOURCE_ROOTS.some((prefix) => filePath.startsWith(prefix)) &&
    filePath.includes("/src/") &&
    hasSupportedExtension(filePath);

  return isSourceFile;
}

async function runCommand(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} exited with code ${code ?? 1}`));
    });
  });
}

async function getRepositoryFiles() {
  const chunks = [];

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "inherit"],
      env: process.env,
    });

    child.stdout.on("data", (data) => chunks.push(data));
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`git ls-files --cached --others failed with code ${code ?? 1}`));
    });
  });

  return Buffer.concat(chunks)
    .toString("utf8")
    .split("\u0000")
    .filter(Boolean);
}

async function main() {
  const candidateFiles = fileArgs.length > 0 ? fileArgs : await getRepositoryFiles();
  const normalizedTargets = Array.from(new Set(candidateFiles.map(normalizeRelativePath).filter(isRelevantFile)));

  if (normalizedTargets.length === 0) {
    process.exit(0);
  }

  const baseConfigPath = resolve(".license-check-and-add.base.json");
  const baseConfig = JSON.parse(await readFile(baseConfigPath, "utf8"));
  const tempDir = await mkdtemp(resolve(tmpdir(), "spdx-license-"));
  const tempConfigPath = resolve(tempDir, "license-check-and-add.temp.json");
  const tempIgnorePath = resolve(tempDir, "license-check-and-add.temp.ignore");

  const tempConfig = {
    ...baseConfig,
    ignoreFile: tempIgnorePath,
  };

  const ignoreContents = ["*", ...normalizedTargets.map((target) => `!${target}`)].join("\n") + "\n";
  await writeFile(tempIgnorePath, ignoreContents, "utf8");
  await writeFile(tempConfigPath, JSON.stringify(tempConfig, null, 2) + "\n", "utf8");

  try {
    await runCommand("pnpm", ["exec", "license-check-and-add", mode, "-f", tempConfigPath]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
