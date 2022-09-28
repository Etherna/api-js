export default abstract class BaseDeserializer<T, O = any> {
  constructor() {}

  abstract deserialize(data: string, opts?: O): T
}
