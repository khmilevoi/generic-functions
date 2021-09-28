const universalType = "*";

const defgeneric = (name) => {
  const methods = new Map();
  const addMethod = (type, { types, func }) => {
    const list = methods.get(type) || [];

    methods.set(type, [...list, { types, func }]);
  };

  const call = function (...args) {
    return executeMethod(args, methods, name);
  };

  call.defmethod = (types, func, type = "primary") => {
    addMethod(type, { types: parseTypes(types), func });

    return call;
  };

  call.findMethod = (...args) => {
    return function () {
      return executeMethod(args, methods, name);
    };
  };

  call.removeMethod = (...args) => {
    const beforeMethods = methods.get("before") || [];

    const primaryMethods = methods.get("primary") || [];

    const afterMethods = methods.get("after") || [];

    methods.set(
      "before",
      beforeMethods.filter(({ types }) => {
        try {
          return checkTypes(args, types) != null;
        } catch (e) {
          return true;
        }
      })
    );

    methods.set(
      "primary",
      primaryMethods.filter(({ types }) => {
        try {
          return checkTypes(args, types) != null;
        } catch (e) {
          return true;
        }
      })
    );

    methods.set(
      "after",
      afterMethods.filter(({ types }) => {
        try {
          return checkTypes(args, types) != null;
        } catch (e) {
          return true;
        }
      })
    );

    return call;
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

const executeMethod = (args, methods, name) => {
  const { before, primary, after, around } = findMethod(args, methods);

  const [method, ...next] = primary;

  const context = {
    next,
    name,
  };

  if (method == null && !before.length && !after.length && !around.length) {
    throw new TypeError("Unknown Type");
  }

  const create = ([item, ...list]) => {
    return item.bind({
      next: list.length ? [create(list)] : [],
      name,
    });
  };

  const f = create([
    ...around,
    (...args) => {
      before.forEach((f) => f.bind(context)(...args));
      const res = method && method.bind(context)(...args);
      after.forEach((f) => f.bind(context)(...args));

      return res;
    },
  ]);

  return f(...args);
};

const findMethod = (args, methods) => {
  if (!Array.isArray(args)) {
    throw new TypeError("Invalid args");
  }

  if (!(methods instanceof Map)) {
    throw new TypeError("Invalid methods");
  }

  const beforeMethods = methods.get("before") || [];

  const before = beforeMethods
    .map(({ types }, index) => ({ result: checkTypes(args, types), index }))
    .filter((item) => item.result != null)
    .sort((left, right) => left.result - right.result);

  const primaryMethods = methods.get("primary") || [];

  const primary = primaryMethods
    .map(({ types }, index) => ({ result: checkTypes(args, types), index }))
    .filter((item) => item.result != null)
    .sort((left, right) => left.result - right.result);

  const afterMethods = methods.get("after") || [];

  const after = afterMethods
    .map(({ types }, index) => ({ result: checkTypes(args, types), index }))
    .filter((item) => item.result != null)
    .sort((left, right) => right.result - left.result);

  const aroundMethods = methods.get("around") || [];

  const around = aroundMethods
    .map(({ types }, index) => ({ result: checkTypes(args, types), index }))
    .filter((item) => item.result != null)
    .sort((left, right) => left.result - right.result);

  return {
    before: before.map(({ index }) => beforeMethods[index].func),
    primary: primary.map(({ index }) => primaryMethods[index].func),
    after: after.map(({ index }) => afterMethods[index].func),
    around: around.map(({ index }) => aroundMethods[index].func),
  };
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

  let res = 0;

  for (const index in args) {
    const value = args[index];

    const check = checkType(value, type[index]);

    if (check.result) {
      res += check.specific;
    } else {
      return null;
    }
  }

  return res;
};

const checkType = (value, { type }) => {
  if (type === universalType) {
    return { result: true, specific: Infinity };
  }

  if (typeof value === type) {
    return { result: true, specific: Infinity };
  }

  const { result, deps } = checkInstanceOf(value, type);

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

const callNextMethod = (context, ...args) => {
  const list = context.next || [];

  if (list.length === 0) {
    throw new Error(
      `No next method found for ${context.name} in ${JSON.stringify(args)}`
    );
  }

  const curr = list.shift();

  return curr && curr(...args);
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

function Mammal() {}

function Rhino() {}

Rhino.prototype = new Mammal();
Rhino.prototype.constructor = Rhino;

function Platypus() {}

Platypus.prototype = new Mammal();
Platypus.prototype.constructor = Platypus;

try {
  const name = defgeneric("name")
    .defmethod("Mammal", function () {
      return "Mammy";
    })
    .defmethod("Platypus", function (p) {
      return "Platty " + callNextMethod(this, p);
    });

  console.log(name(new Rhino()));
  console.log(name(new Platypus()));
} catch (e) {
  console.error(2, e);
}

try {
  let msgs = "";
  const log = function (str) {
    msgs += str;
  };
  const describe = defgeneric("describe")
    .defmethod("Platypus", function () {
      log("Platy" + arguments.length.toString());
      return "P";
    })
    .defmethod("Mammal", function () {
      log("Mammy" + arguments.length.toString());
      return "M";
    })
    .defmethod(
      "Platypus",
      function () {
        log("platypus" + arguments.length.toString());
      },
      "before"
    )
    .defmethod(
      "Platypus",
      function () {
        log("/platypus" + arguments.length.toString());
      },
      "after"
    )
    .defmethod(
      "Mammal",
      function () {
        log("mammal" + arguments.length.toString());
      },
      "before"
    )
    .defmethod(
      "Mammal",
      function () {
        log("/mammal" + arguments.length.toString());
      },
      "after"
    )
    .defmethod(
      "object",
      function () {
        log("object" + arguments.length.toString());
      },
      "before"
    )
    .defmethod(
      "object",
      function () {
        log("/object" + arguments.length.toString());
      },
      "after"
    );

  const res = describe(new Platypus());

  console.log(`${res}:${msgs}`);
} catch (e) {
  console.error(3, e);
}

const laysEggs = defgeneric("lays-eggs");

laysEggs
  .defmethod(
    "Platypus",
    function () {
      console.log("Before platypus egg check.");
    },
    "before"
  )
  .defmethod(
    "Mammal",
    function () {
      console.log("Before mammal egg check.");
    },
    "before"
  )
  .defmethod(
    "*",
    function () {
      console.log("Before egg check.");
    },
    "before"
  )
  .defmethod(
    "Platypus",
    function () {
      console.log("After platypus egg check.");
    },
    "after"
  )
  .defmethod(
    "Mammal",
    function () {
      console.log("After mammal egg check.");
    },
    "after"
  );

laysEggs.defmethod(
  "Platypus",
  function (p) {
    console.log(">>>Around platypus check.");
    var ret = callNextMethod(this, p);
    console.log("<<<Around platypus check.");
    return ret;
  },
  "around"
);
laysEggs.defmethod(
  "Mammal",
  function (p) {
    console.log(">>>Around mammal check.");
    var ret = callNextMethod(this, p);
    console.log("<<<Around mammal check.");
    return ret;
  },
  "around"
);

laysEggs(new Platypus());
