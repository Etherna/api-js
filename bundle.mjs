// @ts-check
import { build } from "vite"
import fs from "node:fs"
import path from "node:path"

// eslint-disable-next-line prettier/prettier
import packageJson from "./package.json" assert { type: "json" }

const entries = [
  {
    entry: path.resolve("src/index.ts"),
    fileName: "index",
  },
  {
    entry: path.resolve("src/clients/index.ts"),
    fileName: "clients/index",
  },
  {
    entry: path.resolve("src/handlers/index.ts"),
    fileName: "handlers/index",
  },
  {
    entry: path.resolve("src/serializers/index.ts"),
    fileName: "serializers/index",
  },
  {
    entry: path.resolve("src/stores/index.ts"),
    fileName: "stores/index",
  },
  {
    entry: path.resolve("src/swarm/index.ts"),
    fileName: "swarm/index",
  },
  {
    entry: path.resolve("src/utils/index.ts"),
    fileName: "utils/index",
  },
]

// Clean 'dist' folder

const DIST_PATH = path.resolve("dist")
if (fs.existsSync(DIST_PATH)) {
  fs.rmSync(DIST_PATH, { recursive: true })
}

// Bundle

const watch = process.argv.includes("--watch")

for (const lib of entries) {
  await build({
    mode: watch ? "development" : "production",
    build: {
      outDir: "./dist",
      lib: {
        ...lib,
        formats: ["es"],
      },
      emptyOutDir: false,
      sourcemap: false,
      minify: "esbuild",
      target: "es2017",
      rollupOptions: {
        external: Object.keys(packageJson.peerDependencies),
        treeshake: true,
      }
    },
  });
}

// Copy & edit package.json / README

/** @type {Record<string, any>} */
const packageCopy = packageJson
packageCopy.scripts = {}
packageCopy.dependencies = {}
packageCopy.devDependencies = {}
packageCopy.type = "module"
delete packageCopy.optionalDependencies
delete packageCopy.pnpm

// package.json
fs.writeFileSync(path.join(DIST_PATH, "package.json"), Buffer.from(JSON.stringify(packageCopy, null, 2), "utf-8"))

// README.md
fs.writeFileSync(path.join(DIST_PATH, "README.md"), fs.readFileSync(path.resolve("README.md")))
