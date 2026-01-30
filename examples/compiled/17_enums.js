const Color = Object.freeze({ Red: 'Red', Green: 'Green', Blue: 'Blue' });
const Status = Object.freeze({ Active: 'Active', Inactive: 'Inactive', Pending: 'Pending' });
const primary = Color.Red;
console.log(`Primary color: ${primary}`);
let current = Color.Green;
console.log(`Current color: ${current}`);
current = Color.Blue;
console.log(`Changed to: ${current}`);
if ((current == Color.Blue)) {
  console.log("It's blue!");
}
if ((primary == Color.Red)) {
  console.log("Primary is red!");
}
function printColor(c) {
  if ((c == Color.Red)) {
  console.log("The color is RED");
} else if ((c == Color.Green)) {
  console.log("The color is GREEN");
} else {
  console.log("The color is BLUE");
}
}
printColor(Color.Red);
printColor(Color.Green);
printColor(Color.Blue);
function getDefaultColor() {
  return Color.Green;
}
const defaultColor = getDefaultColor();
console.log(`Default color: ${defaultColor}`);
const myStatus = Status.Active;
console.log(`Status: ${myStatus}`);
if ((myStatus == Status.Active)) {
  console.log("We are active!");
}