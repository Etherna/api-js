/// <reference types="vitest" />

import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  test: {},
  resolve: {
    alias: [{ find: "@", replacement: resolve(__dirname, "src") }],
  },
})
