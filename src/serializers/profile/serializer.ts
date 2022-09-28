import { ProfileSchema } from "../../schemas/profile"
import type { ProfileRaw } from "../../schemas/profile"
import BaseSerializer from "../base-serializer"
import ImageSerializer from "../image/serializer"

export default class ProfileSerializer extends BaseSerializer {
  constructor() {
    super()
  }

  serialize(item: object): string {
    const profile = ProfileSchema.parse(item)

    const imageSerializer = new ImageSerializer()

    const profileRaw: ProfileRaw = {
      name: profile.name,
      address: profile.address,
      description: profile.description ?? null,
      birthday: profile.birthday,
      location: profile.location,
      website: profile.website,
      avatar: profile.avatar ? imageSerializer.serialize(profile.avatar) : null,
      cover: profile.cover ? imageSerializer.serialize(profile.cover) : null,
      batchId: profile.batchId!,
    }
    return JSON.stringify(profileRaw)
  }
}
