import { env, argv, pid, nodeVersion } from "../../lib/node/index.js";
class Person {
  constructor(name, age, isEmployed) {
    this.name = name;
    this.age = age;
    this.isEmployed = isEmployed;
  }

}
const Mooki = new Person("Mooki", 5, false);
const Alice = new Person("Alice", 30, true);
console.log(("Person Mooki: " + Mooki.name));
console.log(`Person Alice: ${Alice.age}`);