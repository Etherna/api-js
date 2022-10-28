import { beeReference } from "../../schemas/base"
import { ProfileRawSchema } from "../../schemas/profile"
import BaseDeserializer from "../base-deserializer"
import ImageDeserializer from "../image/deserializer"

import type { Profile } from "../.."

export type ProfileDeserializerOptions = {
  fallbackBatchId: string | null
}

export default class ProfileDeserializer extends BaseDeserializer<
  Profile,
  ProfileDeserializerOptions
> {
  constructor(private beeUrl: string) {
    super()
  }

  deserialize(data: string, opts?: ProfileDeserializerOptions): Profile {
    const profileRaw = ProfileRawSchema.parse(JSON.parse(data))

    const imageDeserializer = new ImageDeserializer(this.beeUrl)

    const profile: Profile = {
      name: profileRaw.name,
      address: profileRaw.address,
      description: profileRaw.description ?? null,
      birthday: profileRaw.birthday,
      location: profileRaw.location,
      website: profileRaw.website,
      avatar: profileRaw.avatar ? imageDeserializer.deserialize(profileRaw.avatar) : null,
      cover: profileRaw.cover ? imageDeserializer.deserialize(profileRaw.cover) : null,
      batchId: profileRaw.batchId ?? (opts ?? {}).fallbackBatchId ?? null,
    }

    return profile
  }
}
