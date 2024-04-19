import { ProfileDetailsRawSchema, ProfilePreviewRawSchema } from "../../schemas/profile"
import { ImageDeserializer } from "../image/deserializer"

import type { ProfileDetails, ProfilePreview } from "../../schemas/profile"

export type ProfileDeserializerOptions = {
  fallbackBatchId?: string | null
}

export class ProfileDeserializer {
  constructor(private beeUrl: string) {}

  deserializePreview(data: string, opts?: ProfileDeserializerOptions): ProfilePreview {
    const profileRaw = ProfilePreviewRawSchema.parse(JSON.parse(data))

    const imageDeserializer = new ImageDeserializer(this.beeUrl)

    const preview: ProfilePreview = {
      name: profileRaw.name,
      address: profileRaw.address,
      avatar: profileRaw.avatar ? imageDeserializer.deserialize(profileRaw.avatar) : null,
      batchId: profileRaw.batchId ?? (opts ?? {}).fallbackBatchId ?? null,
    }

    return preview
  }

  deserializeDetails(data: string): ProfileDetails {
    const profileRaw = ProfileDetailsRawSchema.parse(JSON.parse(data))

    const imageDeserializer = new ImageDeserializer(this.beeUrl)

    const profile: ProfileDetails = {
      description: profileRaw.description ?? null,
      birthday: profileRaw.birthday,
      location: profileRaw.location,
      website: profileRaw.website,
      cover: profileRaw.cover ? imageDeserializer.deserialize(profileRaw.cover) : null,
    }

    return profile
  }
}
