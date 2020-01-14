const { isString, isNumber, isPlainObject } = require("is-what");
const path = require("path");
const pkg = require("../package.json");
const debug = require("debug")(pkg.name);

const defaults = require("./defaults");
const cwd = process.cwd();

function validateTable(table) {
  let valid = true;
  if (Object.keys(table).length === 0) {
    debug("'table' has no entries");
  }
  Object.keys(table).forEach(key => {
    if (typeof key !== "string" || typeof table[key] !== "string") {
      valid = false;
    } else if (!key.length || !table[key].length) {
      valid = false;
    }
  });
  return valid;
}

function validateConfiguration(configuration) {
  const types = {
    root: isString,
    table: [isString, isPlainObject],
    dir: isString,
    delay: isNumber,
    corsOptions: isPlainObject
  };

  return Object.keys(configuration).every(key => {
    const value = configuration[key];
    let valid;
    if (Array.isArray(types[key])) {
      valid = types[key].some(isWhat => isWhat(value));
    } else {
      valid = types[key](value);
    }
    if (key === "table") {
      valid = validateTable(value);
    }
    if (!valid) {
      if (key === "table") {
        debug(
          "'table' must be an object with both keys and values as non-empty strings"
        );
      } else {
        debug(`Type for "${key}" is wrong. Check configuration.`);
      }
    }
    return valid;
  });
}

function resolveConfig() {
  // const explorer = cosmiconfigSync(pkg.name);
  // return explorer.search();
  const key = pkg.name;
  const result = {
    config: undefined,
    filepath: undefined,
    isEmpty: true
  };

  const hostPkgPath = path.join(cwd, "package.json");
  const hostPkg = require(hostPkgPath);
  if (hostPkg.hasOwnProperty(key)) {
    result.isEmpty = false;
    result.config = hostPkg[key];
    result.file = hostPkgPath;
  }

  if (result.isEmpty) {
    const files = [
      `.${key}rc`,
      `.${key}rc.json`,
      `.${key}rc.js`,
      `${key}.config.js`
    ];
    let i = 0;
    let fileName;
    let filePath;
    let config;

    while (result.isEmpty && i < files.length) {
      fileName = files[i++];
      filePath = path.join(cwd, fileName);
      config = require(filePath);
      result.isEmpty = Boolean(file);
    }

    if (!result.isEmpty) {
      result.file = filePath;
      const isFunction = typeof config === "function";
      result.config = isFunction ? config() : config;
    }
  }

  if (!result.isEmpty) {
    delete result.isEmpty;
  }

  return result;
}

function processConfiguration(customConfig) {
  const searchedConfig = resolveConfig();
  const configuration = Object.assign(
    {},
    defaults,
    searchedConfig.config,
    customConfig
  );

  const { table, root } = configuration;

  if (typeof table === "string") {
    try {
      configuration.table = require(path.join(cwd, table));
    } catch (e) {
      debug(e);
    }
  }

  const isValidConf = validateConfiguration(configuration);

  if (!isValidConf) {
    throw Error("Exiting due to faulty configuration.");
  }

  configuration.root = `/${root.replace("/", "").trim()}`;

  return configuration;
}

module.exports = processConfiguration;
