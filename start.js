// Runs in front of the server on every start. It keeps a connection to the
// engine's models in the server's own settings, so nothing has to be typed
// in, makes the folders under extensions/ show up as installed extensions,
// then hands over to the server itself.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = import.meta.dirname;
const server = path.join(here, "node_modules", "sillytavern");
const url = process.env.MODELS_URL;
const key = process.env.MODELS_KEY;
const root = process.env.DATA_ROOT;
const LABEL = "Chrysalis";

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

if (root) {
  const userDir = path.join(root, "default-user");
  fs.mkdirSync(userDir, { recursive: true });

  if (url && key) {
    // the key can change (a new approval after a removal): kept current on
    // every start, beside whatever keys were added by hand
    const secretsFile = path.join(userDir, "secrets.json");
    const secrets = readJson(secretsFile, {});
    const kept = Array.isArray(secrets.api_key_custom) ? secrets.api_key_custom : [];
    const own = kept.find((s) => s && s.label === LABEL);
    if (own) own.value = key;
    else kept.push({ id: randomUUID(), value: key, label: LABEL, active: !kept.some((s) => s && s.active) });
    secrets.api_key_custom = kept;
    secrets._migrated ??= [];
    fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 4));

    // the connection itself is chosen once; after that it is the user's to change
    const marker = path.join(root, ".models-linked");
    if (!fs.existsSync(marker)) {
      const settingsFile = path.join(userDir, "settings.json");
      const settings = readJson(settingsFile, null) ?? readJson(path.join(server, "default", "content", "settings.json"), {});
      settings.main_api = "openai";
      settings.oai_settings = { ...settings.oai_settings, chat_completion_source: "custom", custom_url: url, custom_model: "default" };
      settings.power_user = { ...settings.power_user, auto_connect: true };
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
      fs.writeFileSync(marker, "");
    }
  }

  // Each folder under extensions/ is linked into the user's extensions, so
  // what is written there loads like any installed extension and outlives a
  // new version of the server. Links whose folder is gone are taken away;
  // extensions installed from inside the server are real folders and stay.
  const ours = path.join(here, "extensions");
  const theirs = path.join(userDir, "extensions");
  fs.mkdirSync(theirs, { recursive: true });
  for (const name of fs.readdirSync(theirs)) {
    const link = path.join(theirs, name);
    if (fs.lstatSync(link).isSymbolicLink() && !fs.existsSync(link)) fs.unlinkSync(link);
  }
  if (fs.existsSync(ours)) {
    for (const entry of fs.readdirSync(ours, { withFileTypes: true })) {
      const link = path.join(theirs, entry.name);
      if (!entry.isDirectory() || fs.existsSync(link)) continue;
      fs.symlinkSync(path.join(ours, entry.name), link, "junction");
    }
  }
}

// The server reads its image decoders as files and refuses any that sit
// outside its own folder. Installed as a package, the decoders are its
// neighbours in node_modules/, so every picture it was handed (an avatar, a
// persona, a thumbnail) failed to open. Whatever the server installs as its
// way of fetching is kept, and decoders from this app's own packages are
// answered here before it is asked.
const packages = fs.realpathSync(path.join(here, "node_modules")) + path.sep;
let serverFetch = globalThis.fetch;
const fetchWithDecoders = (input, init) => {
  const address = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
  if (typeof address === "string" && address.startsWith("file:") && address.endsWith(".wasm")) {
    const file = fs.realpathSync(fileURLToPath(address));
    if (file.startsWith(packages)) return Promise.resolve(new Response(fs.readFileSync(file), { headers: { "content-type": "application/wasm" } }));
  }
  return serverFetch(input, init);
};
Object.defineProperty(globalThis, "fetch", { configurable: true, get: () => fetchWithDecoders, set: (next) => { serverFetch = next; } });

// A reply cancelled halfway (the stop button, a closed tab) surfaces under
// this runtime as an uncaught error from the abandoned stream. The server
// treats every uncaught error as fatal; this one is not a reason to stop.
const cancelled = (err) => {
  const cause = err?.code === "ERR_UNHANDLED_ERROR" ? err.context : err;
  return cause?.name === "AbortError" || cause?.code === "ABORT_ERR";
};
const listen = process.on.bind(process);
process.on = (event, handler) => listen(event, event !== "uncaughtException" ? handler : (err, ...rest) => {
  if (!cancelled(err)) handler(err, ...rest);
});

await import(path.join(server, "server.js"));
