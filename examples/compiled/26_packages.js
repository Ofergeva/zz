import { greet, shout, add } from "./pkg/greeting.js";
const msg = await greet("World");
console.log(msg);
const loud = await shout("hello");
console.log(loud);
const sum = await add(10, 20);
console.log(sum);