import { AxiosError } from "axios"

export const ErrorCodes = [
  "NOT_FOUND",
  "SERVER_ERROR",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "PERMISSION_DENIED",
  "MISSING_FUNDS",
  "MISSING_BATCH_ID",
  "ABORTED_BY_USER",
  "INVALID_ARGUMENT",
  "UNSUPPORTED_OPERATION",
  "TIMEOUT",
] as const

export type ErrorCode = (typeof ErrorCodes)[number]

export class EthernaSdkError extends Error {
  code: ErrorCode
  axiosError?: AxiosError

  constructor(code: ErrorCode, message: string, axiosError?: AxiosError) {
    super(message)
    this.code = code
    this.axiosError = axiosError
    this.name = "EthernaSdkError"
  }
}

export function throwSdkError(err: unknown): never {
  if (err instanceof EthernaSdkError) {
    throw err
  }

  if (err instanceof AxiosError) {
    switch (err.status) {
      case 400:
        throw new EthernaSdkError("BAD_REQUEST", err.message, err)
      case 401:
        throw new EthernaSdkError("UNAUTHORIZED", err.message, err)
      case 402:
        throw new EthernaSdkError("MISSING_FUNDS", err.message, err)
      case 403:
        throw new EthernaSdkError("PERMISSION_DENIED", err.message, err)
      case 404:
        throw new EthernaSdkError("NOT_FOUND", err.message, err)
      default:
        throw new EthernaSdkError(
          (err.status ?? 500) >= 500 ? "SERVER_ERROR" : "BAD_REQUEST",
          err.message,
          err,
        )
    }
  }

  if (err instanceof Error) {
    throw new EthernaSdkError("SERVER_ERROR", err.message)
  }

  throw new EthernaSdkError("SERVER_ERROR", String(err))
}
