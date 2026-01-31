const Color = Object.freeze({ Red: 'Red', Green: 'Green', Blue: 'Blue' });
function describeColor(c) {
  (function() {
  const __match_8 = c;
  if (__match_8 === Color.Red) {
    console.log("Warm color: Red");
  }
   else if (__match_8 === Color.Green) {
    console.log("Nature color: Green");
  }
   else if (__match_8 === Color.Blue) {
    console.log("Cool color: Blue");
  }
})();;
}
console.log("=== Enum Matching ===");
describeColor(Color.Red);
describeColor(Color.Green);
describeColor(Color.Blue);
function describeNumber(n) {
  (function() {
  const __match_22 = n;
  if (__match_22 === 0) {
    console.log("Zero");
  }
   else if (__match_22 === 1) {
    console.log("One");
  }
   else if (true) {
    console.log("Some other number");
  }
})();;
}
console.log("");
console.log("=== Literal Matching ===");
describeNumber(0);
describeNumber(1);
describeNumber(42);
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

}
function describePoint(p) {
  (function() {
  const __match_39 = p;
  if (__match_39.x === 0 && __match_39.y === 0) {
    console.log("Origin");
  }
   else if (__match_39.x === 0) {
    const y = __match_39.y;
    console.log(`Y-axis at y=${y}`);
  }
   else if (__match_39.y === 0) {
    const x = __match_39.x;
    console.log(`X-axis at x=${x}`);
  }
   else if (true) {
    const x = __match_39.x;
    const y = __match_39.y;
    console.log(`Point at (${x}, ${y})`);
  }
})();;
}
console.log("");
console.log("=== Struct Destructuring ===");
describePoint(new Point(0, 0));
describePoint(new Point(0, 5));
describePoint(new Point(3, 0));
describePoint(new Point(3, 4));
function classifyPoint(p) {
  (function() {
  const __match_56 = p;
  if ((true) && (((__match_56.x > 0) && (__match_56.y > 0)))) {
    const x = __match_56.x;
    const y = __match_56.y;
    console.log("Quadrant I");
  }
   else if ((true) && (((__match_56.x < 0) && (__match_56.y > 0)))) {
    const x = __match_56.x;
    const y = __match_56.y;
    console.log("Quadrant II");
  }
   else if ((true) && (((__match_56.x < 0) && (__match_56.y < 0)))) {
    const x = __match_56.x;
    const y = __match_56.y;
    console.log("Quadrant III");
  }
   else if ((true) && (((__match_56.x > 0) && (__match_56.y < 0)))) {
    const x = __match_56.x;
    const y = __match_56.y;
    console.log("Quadrant IV");
  }
   else if (true) {
    console.log("On an axis");
  }
})();;
}
console.log("");
console.log("=== Guards ===");
classifyPoint(new Point(1, 1));
classifyPoint(new Point((-1), 1));
classifyPoint(new Point((-1), (-1)));
classifyPoint(new Point(1, (-1)));
classifyPoint(new Point(0, 5));
function scoreGrade(score) {
  return (function() {
  const __match_75 = score;
  if (__match_75 === 100) {
    return 10;
  }
   else if (true) {
    return 0;
  }
})();;
}
console.log("");
console.log("=== Match as Expression ===");
const perfectScore = scoreGrade(100);
const otherScore = scoreGrade(85);
console.log(`Perfect score bonus: ${perfectScore}`);
console.log(`Other score bonus: ${otherScore}`);
function processValue(n) {
  (function() {
  const __match_90 = n;
  if ((true) && ((__match_90 > 100))) {
    const v = __match_90;
    console.log(`Large value: ${v}`);
  }
   else if ((true) && ((__match_90 > 50))) {
    const v = __match_90;
    console.log(`Medium value: ${v}`);
  }
   else if (true) {
    const v = __match_90;
    console.log(`Small value: ${v}`);
  }
})();;
}
console.log("");
console.log("=== Binding Pattern ===");
processValue(150);
processValue(75);
processValue(25);
console.log("");
console.log("Pattern matching complete!");