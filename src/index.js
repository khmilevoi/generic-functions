const universalType = "*";

const defgeneric = (name) => {
  const methods = new Map();
  const addMethod = (type, { types, func }) => {
    const list = methods.get(type) || [];

    methods.set(type, [...list, { types, func }]);
  };

  const call = function (...args) {
    const method = findMethod(args, methods);

    if (method == null) {
      return new TypeError("Unknown Type");
    }

    return method(...args);
  };

  call.defmethod = (types, func, type = "primary") => {
    addMethod(type, { types: parseTypes(types), func });

    return call;
  };

  call.findMethod = (...args) => {
    return findMethod(args, methods);
  };

  return call;
};

const parseTypes = (types) => {
  if (typeof types !== "string") {
    throw new TypeError("Invalid Types");
  }

  return types
    .split(",")
    .map((item) => item.trim())
    .map(parseType);
};

const parseType = (type) => {
  if (typeof type !== "string") {
    throw new TypeError("Invalid Type");
  }

  return { type };
};

const findMethod = (args, methods) => {
  if (!Array.isArray(args)) {
    throw new TypeError("Invalid args");
  }

  if (!(methods instanceof Map)) {
    throw new TypeError("Invalid methods");
  }

  const primaryMethods = methods.get("primary");

  const item = primaryMethods.find(({ types }) => checkTypes(args, types));

  return item && item.func;
};

const checkTypes = (args, type) => {
  if (!Array.isArray(args)) {
    return false;
  }

  if (!Array.isArray(type)) {
    return false;
  }

  if (type.length !== args.length) {
    return false;
  }

  return args.every((value, index) => checkType(value, type[index]));
};

const checkType = (value, { type }) => {
  if (type === universalType) {
    return true;
  }

  if (typeof value === type) {
    return true;
  }

  return value instanceof global[type];
};

const append = defgeneric("append");
append.defmethod("Array,Array", (a, b) => a.concat(b));
append.defmethod("*,Array", (a, b) => [a].concat(b));
append.defmethod("Array,*", (a, b) => a.concat([b]));

console.log(append([1, 2], [3, 4]));
console.log(append(1, [2, 3, 4]));
console.log(append([1, 2, 3], 4));
console.log(append(1, 2));

debugger;
