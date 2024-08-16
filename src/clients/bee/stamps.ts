import { EthernaSdkError, StampCalculator, throwSdkError } from "@/classes"
import { ETHERNA_MIN_BATCH_DEPTH, ETHERNA_WELCOME_BATCH_DEPTH, STAMPS_DEPTH_MIN } from "@/consts"
import { calcDilutedTTL, getBatchPercentUtilization, ttlToAmount } from "@/utils"

import type { BeeClient } from "."
import type {
  EthernaGatewayBatch,
  EthernaGatewayBatchPreview,
  EthernaGatewayWelcomeStatus,
} from "./types"
import type { BucketCollisions } from "@/classes"
import type { RequestOptions } from "@/types/clients"
import type { BatchId, PostageBatch, PostageBatchBucketsData } from "@/types/swarm"

const stampsEndpoint = "/stamps"

interface CreatePostageBatchOptions extends RequestOptions {
  label?: string
  useWelcomeIfPossible?: boolean
  onStatusChange?: <T extends "pending-creation" | "created">(
    status: T,
    data: T extends "pending-creation"
      ? { postageBatchRef: string | null }
      : T extends "created"
        ? { batchId: BatchId }
        : never,
  ) => void
}

interface DownloadPostageBatchOptions extends RequestOptions {
  waitUntilUsable?: boolean
}

interface FetchBestBatchIdOptions extends RequestOptions {
  labelQuery?: string
  minDepth?: number
  collisions?: BucketCollisions
}

interface TopupBatchOptions extends RequestOptions {
  by: { type: "amount"; amount: bigint | string } | { type: "time"; seconds: number }
  initialAmount?: bigint | string
  waitUntilUpdate?: boolean
}

interface DiluteBatchOptions extends RequestOptions {
  depth: number
  waitUntilUpdate?: boolean
}

export class Stamps {
  constructor(private instance: BeeClient) {}

  async create(
    depth = STAMPS_DEPTH_MIN,
    amount: bigint | string = "10000000",
    options?: CreatePostageBatchOptions,
  ): Promise<PostageBatch> {
    const { label, useWelcomeIfPossible, onStatusChange, ...opts } = options ?? {}

    if (this.instance.type === "etherna" && depth < ETHERNA_MIN_BATCH_DEPTH) {
      throw new EthernaSdkError(
        "INVALID_ARGUMENT",
        `Minimum depth for an Etherna batch is ${ETHERNA_MIN_BATCH_DEPTH}`,
      )
    }

    try {
      let batchId: BatchId

      switch (this.instance.type) {
        case "bee": {
          const resp = await this.instance.request.post<{ batchID: BatchId }>(
            `${stampsEndpoint}/${amount}/${depth}`,
            null,
            {
              params: {
                label,
              },
              ...this.instance.prepareAxiosConfig(opts),
            },
          )
          batchId = resp.data.batchID
          break
        }
        case "etherna": {
          if (useWelcomeIfPossible && depth <= ETHERNA_WELCOME_BATCH_DEPTH) {
            const { batchID } = await this.createWelcomeBatch(options)
            batchId = batchID
            break
          }

          const resp = await this.instance.apiRequest.post<string>(`/users/current/batches`, null, {
            ...this.instance.prepareAxiosConfig(opts),
            params: {
              depth,
              amount,
              label,
            },
          })

          const referenceId = resp.data

          onStatusChange?.("pending-creation", { postageBatchRef: referenceId })

          let resolver: (batchId: BatchId) => void
          let rejecter: (err: EthernaSdkError) => void
          let timeout: number

          const waitBatchCreation = () => {
            clearTimeout(timeout)

            if (opts?.signal?.aborted) {
              return rejecter(
                new EthernaSdkError("ABORTED_BY_USER", "The operation was aborted by the user"),
              )
            }

            timeout = window.setTimeout(() => {
              this.instance.system.fetchPostageBatchRef(referenceId).then((batchId) => {
                if (batchId) {
                  resolver(batchId)
                }
              })

              waitBatchCreation()
            }, 5000)
          }

          batchId = await new Promise<BatchId>((resolve, reject) => {
            resolver = resolve
            rejecter = reject
            waitBatchCreation()
          })
        }
      }

      if (!batchId) {
        throw new EthernaSdkError(
          "SERVER_ERROR",
          "An unhandled error has occurred while creating batch",
        )
      }

      onStatusChange?.("created", { batchId })

      return await this.download(batchId, { waitUntilUsable: true })
    } catch (error) {
      throwSdkError(error)
    }
  }

  async download(batchId: BatchId, options?: DownloadPostageBatchOptions): Promise<PostageBatch> {
    try {
      const { waitUntilUsable, ...opts } = options ?? {}

      const fetchBatch = async () => {
        switch (this.instance.type) {
          case "bee": {
            const postageResp = await this.instance.request.get<PostageBatch>(
              `${stampsEndpoint}/${batchId}`,
              {
                ...this.instance.prepareAxiosConfig(opts),
              },
            )
            return postageResp.data
          }
          case "etherna": {
            const resp = await this.instance.apiRequest.get<EthernaGatewayBatch>(
              `/users/current/batches/${batchId}`,
              {
                ...this.instance.prepareAxiosConfig(opts),
              },
            )
            return this.parseGatewayPostageBatch(resp.data)
          }
        }
      }

      if (!waitUntilUsable) {
        return await fetchBatch()
      }

      return await this.waitBatchValid(batchId, (batch) => batch.usable, opts)
    } catch (error) {
      throwSdkError(error)
    }
  }

  async downloadAll(
    labelQuery?: string,
    options?: RequestOptions,
  ): Promise<(PostageBatch | EthernaGatewayBatchPreview)[]> {
    try {
      switch (this.instance.type) {
        case "bee": {
          const postageResp = await this.instance.request.get<{ stamps: PostageBatch[] }>(
            stampsEndpoint,
            {
              ...this.instance.prepareAxiosConfig(options),
            },
          )
          return postageResp.data.stamps.filter(
            (batch) => !labelQuery || batch.label.toLowerCase().includes(labelQuery.toLowerCase()),
          )
        }
        case "etherna": {
          const resp = await this.instance.request.get<EthernaGatewayBatchPreview[]>(
            `/users/current/batches`,
            {
              ...this.instance.prepareAxiosConfig(options),
              params: {
                labelContainsFilter: labelQuery,
              },
            },
          )
          return resp.data
        }
      }
    } catch (error) {
      throwSdkError(error)
    }
  }

  async downloadBuckets(
    batchId: BatchId,
    options?: RequestOptions,
  ): Promise<PostageBatchBucketsData> {
    try {
      switch (this.instance.type) {
        case "bee": {
          const postageResp = await this.instance.request.get<PostageBatchBucketsData>(
            `${stampsEndpoint}/${batchId}/buckets`,
            {
              ...this.instance.prepareAxiosConfig(options),
            },
          )
          return postageResp.data
        }
        case "etherna": {
          throw new EthernaSdkError("NOT_IMPLEMENTED", "This method is not implemented for Etherna")
        }
      }
    } catch (error) {
      throwSdkError(error)
    }
  }

  /**
   * Find best usable batchId to use.
   * Use the option:
   * - `minDepth` to filter batches with a minimum depth
   * - `labelQuery` to filter batches by label
   * - `stampCalculator` to provide the bucket collision to upload (best to find the batch with most buckets available)
   *
   * @param options
   * @returns The best batchId to use or null if no batch is found
   */
  async fetchBestBatchId(
    options?: FetchBestBatchIdOptions,
  ): Promise<(BatchId & { collisions?: BucketCollisions }) | null> {
    try {
      const batches = await this.downloadAll(options?.labelQuery, options)
      const minBatchDepth = options?.minDepth ?? STAMPS_DEPTH_MIN

      for (const batch of batches) {
        if (options?.collisions) {
          const batchId = "batchID" in batch ? batch.batchID : batch.batchId
          const { isUsable, batchCollisions } = await this.fetchIsFillableBatch(
            batchId,
            options.collisions,
          )

          if (!isUsable) {
            continue
          }

          const augmentedBatchId = batchId as BatchId & { collisions?: BucketCollisions }
          Object.assign(augmentedBatchId, { collisions: batchCollisions })

          return augmentedBatchId
        }

        const postageBatch = "utilization" in batch ? batch : await this.download(batch.batchId)

        if (!postageBatch.usable) {
          continue
        }

        if (postageBatch.depth < minBatchDepth) {
          continue
        }

        if (getBatchPercentUtilization(postageBatch) < 1) {
          return postageBatch.batchID
        }
      }

      return null
    } catch (error) {
      throwSdkError(error)
    }
  }

  /**
   * Topup batch (increase TTL)
   *
   * @param batchId Id of the swarm batch
   * @param byAmount Amount to add to the batch
   */
  async topup(batchId: BatchId, options: TopupBatchOptions): Promise<boolean> {
    const { by, waitUntilUpdate, ...opts } = options
    const price = await this.instance.chainstate.getCurrentPrice(opts)
    const amount =
      by.type === "amount"
        ? by.amount
        : ttlToAmount(by.seconds, price, this.instance.chain.blockTime)
    const initialAmount = options.initialAmount ?? (await this.download(batchId)).amount

    try {
      switch (this.instance.type) {
        case "bee": {
          await this.instance.request.patch<{ batchID: BatchId }>(
            `${stampsEndpoint}/topup/${batchId}/${amount}`,
            null,
            {
              ...this.instance.prepareAxiosConfig(opts),
            },
          )
          break
        }
        case "etherna": {
          await this.instance.apiRequest.patch(
            `/postage/batches/${batchId}/topup/${amount}`,
            null,
            {
              ...this.instance.prepareAxiosConfig(opts),
            },
          )
          break
        }
      }

      if (waitUntilUpdate) {
        await this.waitBatchValid(batchId, (batch) => batch.amount > initialAmount, opts)
      }

      return true
    } catch (error) {
      throwSdkError(error)
    }
  }

  /**
   * Dillute batch (increase size)
   *
   * @param batchId Id of the swarm batch
   * @param options Dilute options
   */
  async dilute(batchId: BatchId, options: DiluteBatchOptions): Promise<boolean> {
    const { depth, waitUntilUpdate, ...opts } = options

    try {
      switch (this.instance.type) {
        case "bee": {
          await this.instance.request.patch<{ batchID: BatchId }>(
            `${stampsEndpoint}/dilute/${batchId}/${depth}`,
            null,
            {
              ...this.instance.prepareAxiosConfig(opts),
            },
          )
          break
        }
        case "etherna": {
          await this.instance.apiRequest.patch(
            `/users/current/batches/${batchId}/dilute/${depth}`,
            null,
            {
              ...this.instance.prepareAxiosConfig(opts),
            },
          )
          break
        }
      }

      if (waitUntilUpdate) {
        await this.waitBatchValid(batchId, (batch) => batch.depth === depth, opts)
      }

      return true
    } catch (error) {
      throwSdkError(error)
    }
  }

  /**
   * (unofficial api) - Dilute a batch + Auto topup to keep the same TTL
   *
   * @param batchId Id of batch to extend
   * @param options Dilute options
   */
  async expand(batchId: BatchId, options: DiluteBatchOptions) {
    const [batch, price] = await Promise.all([
      this.download(batchId),
      this.instance.chainstate.getCurrentPrice(),
    ])

    const newTTL = calcDilutedTTL(batch.batchTTL, batch.depth, options.depth)
    const ttl = Math.abs(batch.batchTTL - newTTL)
    const amount = ttlToAmount(ttl, price, this.instance.chain.blockTime).toString()

    // topup batch (before dilute to avoid possible expiration)
    await this.topup(batchId, {
      by: {
        type: "amount",
        amount,
      },
      // we are forced to wait the topup before diluting
      waitUntilUpdate: true,
    })

    // dilute batch
    await this.dilute(batchId, options)

    return true
  }

  // Utils methods

  private async createWelcomeBatch(options?: CreatePostageBatchOptions): Promise<PostageBatch> {
    const { onStatusChange, ...opts } = options ?? {}

    try {
      const welcomeResp = await this.instance.apiRequest.get<EthernaGatewayWelcomeStatus>(
        `/users/current/welcome`,
        {
          ...this.instance.prepareAxiosConfig(opts),
        },
      )

      if (!welcomeResp.data.isFreePostageBatchConsumed) {
        await this.instance.apiRequest.post(`/users/current/welcome`, null, {
          ...this.instance.prepareAxiosConfig(opts),
        })
      }

      onStatusChange?.("pending-creation", { postageBatchRef: null })

      const start = Date.now()

      const maxDuration = 1000 * 60 * 10 // 10 minute
      let resolver: (batch: PostageBatch) => void
      let rejecter: (err: EthernaSdkError) => void
      let timeout: number

      const waitBatch = async () => {
        clearTimeout(timeout)

        if (opts?.signal?.aborted) {
          return rejecter(
            new EthernaSdkError("ABORTED_BY_USER", "The operation was aborted by the user"),
          )
        }

        if (Date.now() - start > maxDuration) {
          return rejecter(
            new EthernaSdkError("TIMEOUT", "The operation has timed out. Please try again."),
          )
        }

        timeout = window.setTimeout(() => {
          this.downloadAll().then((batches) => {
            const firstBatch = batches[0]
            if (firstBatch) {
              if ("amount" in firstBatch) {
                resolver(firstBatch)
              } else {
                this.download(firstBatch.batchId).then(resolver)
              }
            } else {
              waitBatch()
            }
          })
          waitBatch()
        }, 5000)
      }

      return await new Promise<PostageBatch>((resolve, reject) => {
        resolver = resolve
        rejecter = reject
        waitBatch()
      })
    } catch (error) {
      throwSdkError(error)
    }
  }

  private parseGatewayPostageBatch(batch: EthernaGatewayBatch): PostageBatch {
    const { id, amountPaid: _p, normalisedBalance: _b, ...postageBatch } = batch
    return {
      batchID: id,
      ...postageBatch,
    }
  }

  private async waitBatchValid(
    batchId: BatchId,
    isValidCallback: (batch: PostageBatch) => boolean,
    options?: RequestOptions,
  ): Promise<PostageBatch> {
    let resolver: (batch: PostageBatch) => void
    let rejecter: (err: EthernaSdkError) => void
    let timeout: number

    const waitBatchValid = async () => {
      clearTimeout(timeout)

      if (options?.signal?.aborted) {
        return rejecter(
          new EthernaSdkError("ABORTED_BY_USER", "The operation was aborted by the user"),
        )
      }

      timeout = window.setTimeout(() => {
        this.download(batchId, options).then((batch) => {
          if (isValidCallback(batch)) {
            resolver(batch)
          } else {
            waitBatchValid()
          }
        })
        waitBatchValid()
      }, 5000)
    }

    return await new Promise<PostageBatch>((resolve, reject) => {
      resolver = resolve
      rejecter = reject
      waitBatchValid()
    })
  }

  private fetchIsFillableBatch = async (batchId: BatchId, collisions: BucketCollisions) => {
    const bucketsInfos = await this.downloadBuckets(batchId)

    const stampCalculator = new StampCalculator()
    stampCalculator.bucketCollisions = collisions
    stampCalculator.seed(bucketsInfos.buckets)

    return {
      batchId,
      isUsable: stampCalculator.minDepth <= bucketsInfos.depth,
      batchCollisions: stampCalculator.bucketCollisions,
    }
  }
}
