export default class Cache<K, V> extends Map<K, V> {
  constructor(public maxRecords = 100) {
    super()
  }
}

Cache.prototype.set = function (key, value) {
  Map.prototype.set.call(this, key, value)

  if (this.size > this.maxRecords) {
    while (this.size > this.maxRecords) {
      this.delete(this.keys().next().value)
    }
  }

  return this
}
