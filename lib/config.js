const { cosmiconfigSync } = require("cosmiconfig");
const { isString, isNumber, isPlainObject } = require("is-what");
const path = require("path");
const debug = require("debug")("express-request-mock");

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
  const explorer = cosmiconfigSync("ermock");
  return explorer.search();
}

function processConfiguration(customConfig) {
  const searchedConfig = resolveConfig();
  const configuration = Object.assign(
    {},
    defaults,
    searchedConfig && searchedConfig.config,
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
