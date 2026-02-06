// AST Node Types for ZZ Language
// Helper to check if a type is an array
export function isArrayType(type) {
    return typeof type === "object" && type.kind === "array";
}
// Helper to check if a type is a tuple
export function isTupleType(type) {
    return typeof type === "object" && type.kind === "tuple";
}
// Helper to check if a type is an enum
export function isEnumType(type) {
    return typeof type === "object" && type.kind === "enum";
}
// Helper to check if a type is a struct
export function isStructType(type) {
    return typeof type === "object" && type.kind === "struct";
}
// Helper to check if a type is a J type
export function isJType(type) {
    return typeof type === "object" && type.kind === "j";
}
// Helper to check if a type is primitive
export function isPrimitiveType(type) {
    return typeof type === "string";
}
// Helper to check if a type is a valid array element type
export function isArrayElementType(type) {
    return isPrimitiveType(type) || isStructType(type) || isEnumType(type) || isJType(type) || isTupleType(type) || isTypeParameterType(type);
}
// Helper to check if a type is a type parameter
export function isTypeParameterType(type) {
    return typeof type === "object" && type.kind === "typeParameter";
}
// Helper to check if a type is a trait
export function isTraitType(type) {
    return typeof type === "object" && type.kind === "trait";
}
