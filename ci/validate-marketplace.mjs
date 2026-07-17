#!/usr/bin/env node
/**
 * Offline validator for the pixida-marketplace marketplace.
 *
 * Zero dependencies (Node built-ins only), no network, no auth — safe to run in a
 * locked-down CI runner. Checks:
 *   - .claude-plugin/marketplace.json parses and has name / owner / plugins[]
 *   - each plugin entry has a name + source, and the source directory exists
 *   - each plugin's .claude-plugin/plugin.json parses, has name/version, and the
 *     name matches the marketplace entry
 *   - each plugin's hooks/hooks.json (if present) parses and is well-formed
 *   - every embedded `node -e "..."` hook command passes `node --check`
 *
 * Exit code 0 = all good; non-zero = at least one problem (printed below).
 */
import { readFileSync, existsSync, statSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const errors = [];
const err = (m) => errors.push(m);

function readJson(path) {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`invalid JSON in ${path}: ${e.message}`);
  }
}

function nodeCheck(script, label) {
  const tmp = join(tmpdir(), `hookcheck-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  try {
    writeFileSync(tmp, script);
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  } catch (e) {
    err(`${label}: embedded node script failed syntax check — ${String(e.stderr || e.message).trim()}`);
  } finally {
    try { rmSync(tmp); } catch {}
  }
}

function validateHooks(hooksPath, pluginName) {
  let cfg;
  try {
    cfg = readJson(hooksPath);
  } catch (e) {
    err(e.message);
    return;
  }
  if (typeof cfg.hooks !== "object" || cfg.hooks === null) {
    err(`${pluginName}: hooks/hooks.json must contain a top-level "hooks" object`);
    return;
  }
  for (const [event, matchers] of Object.entries(cfg.hooks)) {
    if (!Array.isArray(matchers)) {
      err(`${pluginName}: hooks.${event} must be an array`);
      continue;
    }
    for (const matcher of matchers) {
      const handlers = matcher?.hooks;
      if (!Array.isArray(handlers)) {
        err(`${pluginName}: hooks.${event}[].hooks must be an array`);
        continue;
      }
      for (const h of handlers) {
        if (h?.type === "command") {
          if (typeof h.command !== "string" || !h.command.trim()) {
            err(`${pluginName}: hooks.${event} command handler is missing a "command" string`);
            continue;
          }
          const m = /node -e "([\s\S]*)"\s*$/.exec(h.command);
          if (m) {
            const body = m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
            nodeCheck(body, `${pluginName} (${event})`);
          }
        }
      }
    }
  }
}

// --- marketplace.json ---
const mpPath = join(root, ".claude-plugin", "marketplace.json");
if (!existsSync(mpPath)) {
  err(`missing ${mpPath} — the marketplace catalog must live at .claude-plugin/marketplace.json`);
} else {
  let mp;
  try {
    mp = readJson(mpPath);
  } catch (e) {
    err(e.message);
    mp = null;
  }
  if (mp) {
    if (!mp.name) err("marketplace.json: missing \"name\"");
    if (!mp.owner || !mp.owner.name) err("marketplace.json: missing owner.name");
    if (!Array.isArray(mp.plugins) || mp.plugins.length === 0) {
      err("marketplace.json: \"plugins\" must be a non-empty array");
    } else {
      const seen = new Set();
      for (const entry of mp.plugins) {
        const name = entry?.name;
        if (!name) { err("marketplace.json: a plugin entry is missing \"name\""); continue; }
        if (seen.has(name)) err(`marketplace.json: duplicate plugin name "${name}"`);
        seen.add(name);

        const src = entry.source;
        if (typeof src !== "string") {
          err(`${name}: only local (string) sources are validated here; got ${JSON.stringify(src)}`);
          continue;
        }
        const pluginDir = join(root, src);
        if (!existsSync(pluginDir) || !statSync(pluginDir).isDirectory()) {
          err(`${name}: source directory not found: ${src}`);
          continue;
        }
        const manifestPath = join(pluginDir, ".claude-plugin", "plugin.json");
        if (!existsSync(manifestPath)) {
          err(`${name}: missing plugin manifest at ${src}/.claude-plugin/plugin.json`);
        } else {
          try {
            const man = readJson(manifestPath);
            if (!man.name) err(`${name}: plugin.json missing "name"`);
            else if (man.name !== name) err(`${name}: plugin.json name "${man.name}" does not match marketplace entry "${name}"`);
            if (!man.version) err(`${name}: plugin.json missing "version"`);
          } catch (e) {
            err(e.message);
          }
        }
        const hooksPath = join(pluginDir, "hooks", "hooks.json");
        if (existsSync(hooksPath)) validateHooks(hooksPath, name);
      }
    }
  }
}

// --- report ---
if (errors.length) {
  console.error(`✗ marketplace validation failed (${errors.length} problem${errors.length > 1 ? "s" : ""}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("✓ marketplace validation passed");
