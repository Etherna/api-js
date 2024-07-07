import { exec } from "child_process"
import axios from "axios"

import { BatchId } from "../../src/clients"

import type { AxiosError } from "axios"

export type ChildProcess = ReturnType<typeof exec>

export type BeeProcess = ChildProcess & {
  port: number
  url: string
}

const processes: BeeProcess[] = []

export const startBee = async () => {
  const process = await runProcess()
  await waitService(process)
  return process
}

export const createPostageBatch = async (process: BeeProcess) => {
  const batchResp = await axios.post(`${process.url}/stamps/10000000/20`)
  const { batchID } = batchResp.data
  return batchID as BatchId
}

const runProcess = (): Promise<BeeProcess> => {
  return new Promise<BeeProcess>((res, rej) => {
    const port = +("1633" + processes.length)
    const cmd = `bee dev --api-addr=':${port}'`

    const childProcess = exec(cmd) as BeeProcess
    childProcess.port = port
    childProcess.url = `http://localhost:${port}`

    childProcess.on("error", (error) => {
      rej(error)
    })
    childProcess.on("exit", (code) => {
      if (code !== 0) {
        rej(new Error(`Process exited with code ${code}`))
      }
    })
    childProcess.stdout!.on("data", () => res(childProcess))
  })
}

const waitService = async (process: BeeProcess, timeout = 1000) => {
  let tries = 0

  return new Promise<void>((res, rej) => {
    const interval = setInterval(() => {
      axios
        .get(process.url)
        .then(() => {
          clearInterval(interval)
          res()
        })
        .catch((error: AxiosError) => {
          if (error.code !== "ECONNREFUSED") {
            clearInterval(interval)
            rej(new Error(`Service not available, code: ${error.code}`))
          }

          tries++

          if (tries > 30) {
            clearInterval(interval)
            rej(new Error("Timeout"))
          }
        })
    }, timeout)
  })
}
