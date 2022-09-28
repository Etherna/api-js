// @ts-check
import { watch } from "chokidar"
import path from "node:path"

import { build } from "./bundle.mjs"

// Watch in dev mode

const args = process.argv
if (!args.includes("-w")) process.exit(0)

console.log("Watching for file changes...")

const watcher = watch(path.resolve("src"), { persistent: true })
watcher.on("add", build).on("change", build).on("unlink", build)
