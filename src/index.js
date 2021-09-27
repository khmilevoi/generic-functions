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

  const [item] = primaryMethods
    .map(({ types }, index) => ({ result: checkTypes(args, types), index }))
    .filter((item) => item.result)
    .sort((left, right) => left.result - right.result);

  return item && primaryMethods[item.index].func;
};

const checkTypes = (args, type) => {
  if (!Array.isArray(args)) {
    throw new TypeError("Invalid args");
  }

  if (!Array.isArray(type)) {
    throw new TypeError("Invalid type");
  }

  if (type.length !== args.length) {
    throw new TypeError("Invalid length");
  }

  for (const index in args) {
    const value = args[index];

    const check = checkType(value, type[index]);

    if (check.result) {
      return check.specific;
    }
  }

  return null;
};

const checkType = (value, { type }) => {
  if (type === universalType) {
    return { result: true, specific: -Infinity };
  }

  if (typeof value === type) {
    return { result: true, specific: -Infinity };
  }

  const { result, deps } = checkInstanceOf(value, type).result;

  return {
    result: !!result,
    specific: deps,
  };
};

const checkInstanceOf = (value, type, deps = 0) => {
  if (typeof value !== "object") {
    return { result: false, deps };
  }

  if (typeof type !== "string") {
    return { result: false, deps };
  }

  if (value == null) {
    return { result: false, deps };
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype == null) {
    return { result: false, deps };
  }

  if (prototype.constructor == null) {
    return { result: false, deps };
  }

  if (prototype.constructor.name !== type) {
    return checkInstanceOf(prototype, type, deps + 1);
  }

  return { result: true, deps };
};

try {
  const append = defgeneric("append");
  append.defmethod("Array,Array", (a, b) => a.concat(b));
  append.defmethod("*,Array", (a, b) => [a].concat(b));
  append.defmethod("Array,*", (a, b) => a.concat([b]));

  console.log(append([1, 2], [3, 4]));
  console.log(append(1, [2, 3, 4]));
  console.log(append([1, 2, 3], 4));
  console.log(append(1, 2));
} catch (e) {
  console.error(1, e);
}

try {
  function Mammal() {}

  function Rhino() {}

  Rhino.prototype = new Mammal();
  Rhino.prototype.constructor = Rhino;

  function Platypus() {}

  Platypus.prototype = new Mammal();
  Platypus.prototype.constructor = Platypus;

  const name = defgeneric("name")
    .defmethod("Mammal", function () {
      return "Mammy";
    })
    .defmethod("Platypus", function (p) {
      return "Platty "; //+ callNextMethod(this, p);
    });

  console.log(name(new Rhino()));
  console.log(name(new Platypus()));
} catch (e) {
  console.error(2, e);
}

debugger;
