import {
  ProfileDetailsRaw,
  ProfileDetailsSchema,
  ProfilePreviewRaw,
  ProfilePreviewSchema,
} from "../../schemas/profile"
import { ImageSerializer } from "../image/serializer"

export class ProfileSerializer {
  constructor() {}

  serializePreview(item: object): string {
    const profile = ProfilePreviewSchema.parse(item)

    const imageSerializer = new ImageSerializer()

    const profileRaw: ProfilePreviewRaw = {
      name: profile.name,
      address: profile.address,
      avatar: profile.avatar ? imageSerializer.serialize(profile.avatar) : null,
      batchId: profile.batchId ?? null,
    }
    return JSON.stringify(profileRaw)
  }

  serializeDetails(item: object): string {
    const profile = ProfileDetailsSchema.parse(item)

    const imageSerializer = new ImageSerializer()

    const profileRaw: ProfileDetailsRaw = {
      description: profile.description ?? null,
      birthday: profile.birthday,
      location: profile.location,
      website: profile.website,
      cover: profile.cover ? imageSerializer.serialize(profile.cover) : null,
    }
    return JSON.stringify(profileRaw)
  }
}
