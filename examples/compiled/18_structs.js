class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  toString() {
    return `(${this.x}, ${this.y})`;
  }
  manhattanDistance() {
    return (this.x + this.y);
  }
}
const p1 = new Point(10, 20);
console.log(`Point 1: ${p1.toString()}`);
const p2 = new Point(5, 15);
console.log(`Point 2: ${p2.toString()}`);
console.log(`p1.x = ${p1.x}`);
console.log(`p1.y = ${p1.y}`);
console.log(`p1 Manhattan distance: ${p1.manhattanDistance()}`);
console.log(`p2 Manhattan distance: ${p2.manhattanDistance()}`);
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  greet() {
    return `Hello, I'm ${this.name}!`;
  }
  intro() {
    return `${this.name} is ${this.age} years old`;
  }
  isAdult() {
    return (this.age >= 18);
  }
}
const alice = new Person("Alice", 30);
console.log(alice.greet());
console.log(alice.intro());
console.log(`Is adult: ${alice.isAdult()}`);
const bob = new Person("Bob", 16);
console.log(bob.greet());
console.log(`Bob is adult: ${bob.isAdult()}`);
class Counter {
  constructor(value) {
    this.value = value;
  }
  get() {
    return this.value;
  }
  display() {
    return `Counter: ${this.value}`;
  }
}
let counter = new Counter(0);
console.log(counter.display());
counter.value = 10;
console.log(counter.display());
counter.value = (counter.value + 5);
console.log(`After increment: ${counter.get()}`);
class Rectangle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  area() {
    return (this.width * this.height);
  }
  perimeter() {
    return ((this.width + this.height) * 2);
  }
  isSquare() {
    return (this.width == this.height);
  }
  fitsInside(maxW, maxH) {
    return ((this.width <= maxW) && (this.height <= maxH));
  }
}
const rect = new Rectangle(10, 5);
console.log(`Rectangle: ${rect.width}x${rect.height}`);
console.log(`Area: ${rect.area()}`);
console.log(`Perimeter: ${rect.perimeter()}`);
console.log(`Is square: ${rect.isSquare()}`);
console.log(`Fits in 20x20: ${rect.fitsInside(20, 20)}`);
console.log(`Fits in 8x8: ${rect.fitsInside(8, 8)}`);
const square = new Rectangle(7, 7);
console.log(`Square: ${square.width}x${square.height}`);
console.log(`Is square: ${square.isSquare()}`);