// @ts-check
import esbuild from "esbuild"
import fs from "node:fs"
import path from "node:path"

// eslint-disable-next-line prettier/prettier
import packageJson from "./package.json" assert { type: "json" }

const entries = [
  "src/index.ts",
  "src/clients/index.ts",
  "src/serializers/index.ts",
  "src/stores/index.ts",
  "src/handlers/index.ts",
  "src/swarm/index.ts",
  "src/utils/index.ts",
]

// Clean 'dist' folder

const DIST_PATH = path.resolve("dist")
if (fs.existsSync(DIST_PATH)) {
  fs.rmSync(DIST_PATH, { recursive: true })
}

// Bundle

await build()

export async function build() {
  await esbuild.build({
    entryPoints: entries,
    outdir: "dist",
    bundle: true,
    sourcemap: false,
    minify: true,
    splitting: true,
    format: "esm",
    target: ["esnext"],
    platform: "browser",
    external: Object.keys(packageJson.peerDependencies),
    treeShaking: true,
  })
  // await buildDefinitions()
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
