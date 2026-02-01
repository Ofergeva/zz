import { Spawn } from "../../std/spawn.js";
import { Duration, millis, sleep } from "../../std/time.js";
async function slowAdd(a, b) {
  const d = await millis(2000);
  return await sleep(d);
  return (a + b);
}
const result = await slowAdd(3, 4);
console.log(`Blocking result: ${result}`);
new Spawn(slowAdd(10, 20));
console.log("This prints before spawned calls complete");