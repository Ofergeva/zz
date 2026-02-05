async function first(arr) {
  return arr[0];
}
const nums = [10, 20, 30];
const firstNum = await first(nums);
console.log(`First number: ${firstNum}`);
const words = ["hello", "world"];
const firstWord = await first(words);
console.log(`First word: ${firstWord}`);
console.log("Function generics test passed!");