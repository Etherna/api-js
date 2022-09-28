export default abstract class BaseSerializer {
  constructor() {}

  abstract serialize(item: object): string
}
