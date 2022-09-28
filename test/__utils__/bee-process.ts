import type { AxiosError } from "axios"
import axios from "axios"
import { exec } from "child_process"

export type ChildProcess = ReturnType<typeof exec>

const beeEndpoint = "http://localhost:1633"
const beeDebugEndpoint = "http://localhost:1635"

export const startBee = async () => {
  const process = await runProcess("bee dev --restricted")
  await waitService(beeEndpoint)
  return process
}

export const createPostaBatch = async () => {
  const batchResp = await axios.post(`${beeDebugEndpoint}/stamps/10000000/20`)
  const { batchID } = batchResp.data
  return batchID
}

const runProcess = (cmd: string): Promise<ChildProcess> => {
  return new Promise<ChildProcess>((res, rej) => {
    const childProcess = exec(cmd)
    childProcess.on("error", error => {
      rej(error)
    })
    childProcess.on("exit", code => {
      if (code !== 0) {
        rej(new Error(`Process exited with code ${code}`))
      }
    })
    childProcess.stdout!.on("data", () => res(childProcess))
  })
}

const waitService = async (url: string, timeout = 1000) => {
  let tries = 0

  return new Promise<void>((res, rej) => {
    const interval = setInterval(() => {
      axios
        .get(url)
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
