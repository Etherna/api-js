export default class Queue {
  tasks: Promise<any>[]

  constructor() {
    this.tasks = []
  }

  enqueue(task: () => Promise<any>) {
    this.tasks.push(task())
  }

  async drain() {
    await Promise.all(this.tasks)
  }
}
