import { platform, arch, type, cpus } from "../../lib/node/os.js";
import { Path, sep } from "../../lib/node/path.js";
const platformS = platform();
const archS = arch();
const typeS = type();
let cpusS = "";
cpusS = cpus().map(c => c.model).join(", ")
console.log(`Platform: ${platformS}`);
console.log(`Architecture: ${archS}`);
console.log(`OS CPUs: ${cpusS}`);
console.log(`OS Type: ${typeS}`);
console.log(`Path Separator: ${sep}`);