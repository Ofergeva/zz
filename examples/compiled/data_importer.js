import { read } from "../../std/fs.js";
import { join, sep, cwd } from "../../std/path.js";
import { starts, ends, slice, split, trim, replace } from "../../std/string.js";
const fileData = read(join(cwd, "examples/compiled/data/sample.json"));
class Person {
  constructor(name, age, city) {
    this.name = name;
    this.age = age;
    this.city = city;
  }

}
function parsePeople(data) {
  if (((!starts(data, "[")) || (!ends(data, "]")))) {
  throw "Invalid JSON array";
} else {
  const peopleData = split(slice(data, 1, (-1)), "}");
  const dataLen = peopleData.length;
  for (let __start = 0, __end = (dataLen - 1), idx = __start; __start <= __end ? idx <= __end : idx >= __end; __start <= __end ? idx++ : idx--) {
  let personData = peopleData[idx];
  personData = trim(replace(replace(personData, "{", ""), ",", ""));
  if ((trim(personData) == "")) {
  console.log("Skipping empty entry");
} else {
  const fields = split(personData, "\n");
  const fieldsLen = fields.length;
  let name = "";
  let age = 0;
  let city = "";
  for (let __start = 0, __end = (fieldsLen - 1), idxx = __start; __start <= __end ? idxx <= __end : idxx >= __end; __start <= __end ? idxx++ : idxx--) {
  const field = trim(replace(fields[idxx], "{", ""));
  const keyValue = split(field, ":");
  if ((keyValue.length != 2)) {
  throw ("Invalid field format: " + field);
} else {
  let key = replace(trim(keyValue[0]), "\"", "");
  let value = replace(trim(keyValue[1]), "\"", "");
  (function() {
  const __match_38 = key;
  if (__match_38 === "name") {
    name = value;
  }
   else if (__match_38 === "age") {
    age = Math.trunc(Number(value));
  }
   else if (__match_38 === "city") {
    city = value;
  }
})();
}
}
  const person = new Person(name, age, city);
  console.log(`Parsed Person: ${person.name}, Age: ${person.age}, City: ${person.city}`);
}
}
}
}
parsePeople(fileData);