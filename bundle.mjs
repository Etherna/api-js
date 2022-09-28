// @ts-check
import { watch } from "chokidar"
import esbuild from "esbuild"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

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

async function build() {
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

async function buildDefinitions() {
  const program = ts.createProgram({
    rootNames: entries,
    options: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      lib: ["DOM", "DOM.Iterable", "ESNext"],
      types: ["node"],
      declaration: true,
      declarationMap: true,
      emitDeclarationOnly: true,
      outDir: "dist",
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      strictNullChecks: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      sourceMap: false,
    },
  })
  const emitResult = program.emit()

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start ?? 0
      )
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    }
  })
}


// Copy & edit package.json

/** @type {Record<string, any>} */
const packageCopy = packageJson
packageCopy.scripts = {}
packageCopy.dependencies = {}
packageCopy.devDependencies = {}
packageCopy.type = "module"
delete packageCopy.optionalDependencies
delete packageCopy.pnpm

fs.writeFileSync(path.join(DIST_PATH, "package.json"), Buffer.from(JSON.stringify(packageCopy, null, 2), "utf-8"))

// Watch in dev mode

const args = process.argv
if (!args.includes("-w")) process.exit(0)

console.log("Watching for file changes...")

const watcher = watch(path.resolve("src"), { persistent: true })
watcher.on("add", build).on("change", build).on("unlink", build)
