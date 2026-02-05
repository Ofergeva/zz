class Stack {
  constructor(items) {
    this.items = items;
  }
  async push(item) {
    await this.items.push(item);
  }
  async len() {
    return this.items.length;
  }
}
const intStack = new Stack([]);
await intStack.push(10);
await intStack.push(20);
console.log(`Int stack length: ${await intStack.len()}`);
const strStack = new Stack([]);
await strStack.push("hello");
await strStack.push("world");
console.log(`String stack length: ${await strStack.len()}`);
console.log("Stack<T> generics test passed!");