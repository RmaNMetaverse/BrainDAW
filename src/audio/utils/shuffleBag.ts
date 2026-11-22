export class ShuffleBag<T> {
  private remaining: T[] = [];
  private previous: T | undefined;

  constructor(private readonly items: readonly T[], private readonly random = Math.random) {}

  next(): T | undefined {
    if (!this.remaining.length) {
      this.remaining = [...this.items];
      for (let index = this.remaining.length - 1; index > 0; index--) {
        const other = Math.floor(this.random() * (index + 1));
        [this.remaining[index], this.remaining[other]] = [this.remaining[other], this.remaining[index]];
      }
      if (this.remaining.at(-1) === this.previous && this.remaining.length > 1) {
        const last = this.remaining.length - 1;
        [this.remaining[last], this.remaining[0]] = [this.remaining[0], this.remaining[last]];
      }
    }
    this.previous = this.remaining.pop();
    return this.previous;
  }
}
