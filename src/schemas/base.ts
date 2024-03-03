import { z } from "zod"
import type { EnsAddress, EthAddress } from "../clients"

export const schemaVersion = z.literal(`${z.string()}.${z.string()}`)

export const birthday = z
  .string()
  .regex(/^[0-9]{2}-[0-9]{2}(-[0-9]{4})?$/)
  .refine(
    val => {
      const [day, month, year] = val.split("-")
      return (
        z.number().min(1).max(31).parse(day) &&
        z.number().min(1).max(12).parse(month) &&
        z.number().min(1900).optional().parse(year)
      )
    },
    {
      message: "must be a valid birthday: '<day>-<month>[-<year>]' (eg: '12-05', '12-05-1991')",
    }
  )

export const slicedString = (max: number, min?: number) =>
  z
    .string()
    .min(min ?? 0)
    .transform(v => v.slice(0, max))

export const ethAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, {
    message: "must be a valid ethereum address",
  })
  .transform(v => v as EthAddress)

export const ensAddress = z
  .string()
  .regex(/^[a-z0-9_\-\.]+\.eth$/i, {
    message: "must be a valid ENS name",
  })
  .transform(v => v as EnsAddress)

export const ethSafeAddress = z.string().transform(v => {
  if (ethAddress.safeParse(v).success) return v.toLowerCase()
  return "0x" + "0".repeat(40)
})

export const beeReference = z.string().regex(/^[a-fA-F0-9]{64}$/, {
  message: "must be a valid bee reference",
})

export const beeSafeReference = z
  .string()
  .nullable()
  .transform(v => {
    if (beeReference.safeParse(v).success) return v!.toLowerCase()
    return "0".repeat(64)
  })

export const nonEmptyRecord = <Keys extends z.ZodTypeAny, Values extends z.ZodTypeAny>(
  key: Keys,
  value: Values
): z.ZodEffects<z.ZodRecord<Keys, Values>> =>
  z.record(key, value).refine(val => Object.keys(val).length > 0, {
    message: "must not be empty",
  })

// Types
export type SchemaVersion = z.infer<typeof schemaVersion>
