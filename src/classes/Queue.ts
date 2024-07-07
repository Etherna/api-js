export class Queue {
  tasks: (() => Promise<any>)[] = []
  activeTasks: number = 0
  maxConcurrentTasks: number

  constructor(maxConcurrentTasks: number = Infinity) {
    this.maxConcurrentTasks = maxConcurrentTasks
  }

  enqueue(task: () => Promise<any>) {
    this.tasks.push(task)
    this.runTasks()
  }

  async runTasks() {
    while (this.activeTasks < this.maxConcurrentTasks && this.tasks.length > 0) {
      const task = this.tasks.shift()
      if (task) {
        this.activeTasks++
        task().finally(() => {
          this.activeTasks--
          this.runTasks()
        })
      }
    }
  }

  async drain() {
    while (this.activeTasks > 0 || this.tasks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}
