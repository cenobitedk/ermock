const { pathToRegexp } = require("path-to-regexp");
const pkg = require("../package.json");
const debug = require("debug")(pkg.name);
const cors = require("cors");
const path = require("path");

const cwd = process.cwd();
const processConfiguration = require("./config");
const { getArgs } = require("./tools");

const mockHandler = function(conf) {
  const configuration = processConfiguration(conf);

  const { root, table, dir, delay, corsOptions } = configuration;

  const corsHandler = cors(corsOptions);

  const stack = [];
  Object.keys(table).forEach(url => {
    const keys = [];
    stack.push({
      path: pathToRegexp(root + url, keys),
      keys,
      file: table[url]
    });
  });

  function hasExactMatch(url) {
    return table.hasOwnProperty(url.replace(root, ""));
  }

  function getExactMatch(url) {
    return table[url.replace(root, "")];
  }

  function getResponse(match) {
    const { file, args = {} } = match;
    const response = require(path.join(cwd, dir, file));

    if (!response) {
      return null;
    }

    if (typeof response === "function") {
      return response(args);
    } else {
      return response;
    }
  }

  function getMatch(req) {
    const { url, method } = req;

    let match;

    if (hasExactMatch(url)) {
      debug(`Matched exact url: ${method} ${url}`);
      match = {
        file: getExactMatch(url)
      };
    } else {
      let i = 0;
      let layer;
      let regexMatch;

      while (!regexMatch && i < stack.length) {
        layer = stack[i++];
        regexMatch = layer.path.exec(url);
      }

      if (regexMatch) {
        debug(`Matched url: ${method} ${url}`);
        match = {
          file: layer.file,
          args: getArgs(regexMatch, layer)
        };
      }
    }

    return match;
  }

  function sendResponse(match, res) {
    const { file } = match;
    const response = getResponse(match);
    if (response) {
      debug(
        `${
          delay ? `${delay}ms Delayed response` : "Responding"
        } with mock file ${file}`
      );
      setTimeout(function() {
        res.setHeader("X-Mocked-Response-File", match.file);
        res.setHeader("X-Mocked-Response-Delay", delay);
        res.send(response);
      }, delay);
    } else {
      debug("Could not load the response file: " + file);
    }
  }

  return function(req, res, next) {
    try {
      if (stack.length) {
        const match = getMatch(req);
        if (match) {
          corsHandler(req, res, () => sendResponse(match, res));
        } else {
          next();
        }
      } else {
        next();
      }
    } catch (e) {
      debug(e);
      next();
    }
  };
};

module.exports = mockHandler;
