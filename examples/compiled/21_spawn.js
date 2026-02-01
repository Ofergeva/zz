import { Spawn } from "../../std/spawn.js";
import { sleep, seconds } from "../../std/time.js";
async function slowAdd(a, b) {
  await sleep(await seconds(1));
  console.log(`Starting slowAdd with ${a} and ${b}`);
  if ((b == 200)) {
  throw "Simulated error for b == 200";
}
  return (a + b);
}
async function handleError(e) {
  console.error(`Spawn error: ${e}`);
}
const result = await slowAdd(3, 4);
console.log(`Blocking result: ${result}`);
new Spawn(slowAdd(10, 20));
await new Spawn(slowAdd(100, 200)).onError(handleError);
console.log("This prints before spawned calls complete");