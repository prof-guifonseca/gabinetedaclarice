import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const clientDir = resolve(root, "dist/client");
const workerDir = resolve(root, "dist/gabinetedaclarice");
const workerFile = resolve(workerDir, "index.js");
const pagesDir = resolve(root, "dist/pages");

if (!existsSync(clientDir)) {
  throw new Error("dist/client não encontrado. Rode `npm run build` primeiro.");
}
if (!existsSync(workerFile)) {
  throw new Error(
    "dist/gabinetedaclarice/index.js não encontrado. Rode `npm run build` primeiro."
  );
}

// Never leave local .dev.vars artifacts inside dist/
const workerDevVars = resolve(workerDir, ".dev.vars");
if (existsSync(workerDevVars)) {
  rmSync(workerDevVars, { force: true });
}

rmSync(pagesDir, { recursive: true, force: true });
mkdirSync(pagesDir, { recursive: true });
cpSync(clientDir, pagesDir, { recursive: true });

const assetsIgnore = resolve(pagesDir, ".assetsignore");
if (existsSync(assetsIgnore)) {
  rmSync(assetsIgnore, { force: true });
}

const pagesDevVars = resolve(pagesDir, ".dev.vars");
if (existsSync(pagesDevVars)) {
  rmSync(pagesDevVars, { force: true });
}

cpSync(workerFile, resolve(pagesDir, "_worker.js"));

const routesConfig = {
  version: 1,
  include: ["/api/*"],
  exclude: [],
};
writeFileSync(
  resolve(pagesDir, "_routes.json"),
  `${JSON.stringify(routesConfig, null, 2)}\n`,
  "utf8"
);

console.log(
  "[prepare-pages] Pacote pronto em dist/pages/ (client + _worker.js + _routes.json + _headers)"
);
