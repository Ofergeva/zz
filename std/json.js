export async function parse(jsonStr) {
  try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
}
export async function stringify(obj) {
  return JSON.stringify(obj);
}
export async function format(obj, indent) {
  return JSON.stringify(obj, null, indent);
}
export async function isValid(jsonStr) {
  try {
      JSON.parse(jsonStr);
      return true;
    } catch (e) {
      return false;
    }
}
export async function get(obj, path) {
  const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }
    return current;
}
export async function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
export async function merge(left, right) {
  return { ...left, ...right };
}
export async function keys(obj) {
  return Object.keys(obj);
}
export async function values(obj) {
  return Object.values(obj);
}