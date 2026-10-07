// Loads the browser scripts into a Node VM so tests can use window.KG.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

function loadKG(files) {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  for (const file of files) {
    const code = fs.readFileSync(path.join(ROOT, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }
  return context.KG;
}

// Script order as listed in index.html, so tests stay in sync with the page.
function scriptsFromIndex() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
}

module.exports = { loadKG, scriptsFromIndex, ROOT };
