#!/usr/bin/env node
// read json from stdin, output typescript description
let data = "";

process.stdin.on('data', chunk => data += chunk);

function typeToString(x, indent = "") {
    if(typeof x === 'string') return x;
    if(x.array)
        return typeToString(x.array, indent)+"[]";
    if(x.object)
        return "{\n"
            + Object.keys(x.object).map(key => `${indent+"    "}${key}: ${typeToString(x.object[key], indent + "    ")}`).join(",\n")
            + "\n"+indent+"}"
}
function isPrimitive(x) {
    return typeof x !== "object" || x === null;
}
function primitiveType(x) {
    if(typeof x !== "object") return typeof x;
    if(x === null) return null;
    throw "not a prim";
}
function typesEqual(a, b) {
    return a === b;
}
function muddleTypesOf(t1, t2) {
    //console.log("muddle", t1, t2);
    if (!t1.object || !t2.object) {
        return typesEqual(t1, t2) ? t1 : {or: [t1, t2]};
    } else {
        for(const key of Object.keys(t2.object)) {
            t1.object[key] = muddleTypesOf(t1.object[key], t2.object[key]);
        }
    }
    return t1;
}

function inferTypeOf(data) {
    //console.log("infer: ", data);
    if(isPrimitive(data)) {
        return primitiveType(data);
    }
    if(data instanceof Array) {
        if(data.length === 0) return {array: "never"};
        return {array: data.map(inferTypeOf).reduce((a,b) => muddleTypesOf(a,b))};
    }
    const attrs = {};
    for(const key of Object.keys(data)) {
        
        attrs[key] = inferTypeOf(data[key]);
    }
    return {object: attrs};
}

process.stdin.on('end', () => {
    let data2 = JSON.parse(data);
    console.log("// generated using "+process.argv[1]);
    console.log("export interface "+ process.argv[2] + " " +typeToString(inferTypeOf(data2)));
})