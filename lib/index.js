const pathToRegexp = require("path-to-regexp");
const debug = require("debug")("mock-handler");
const cors = require("cors");
const path = require("path");

const mockHandler = function(options) {
  const {
    root = "",
    table = {},
    mockFolder = "",
    corsOptions = {
      origin: true,
      credentials: true,
      optionsSuccessStatus: 200
    }
  } = options;

  const corsHandler = cors(corsOptions);

  const stack = [];
  Object.keys(table).forEach(url => {
    stack.push({
      path: pathToRegexp(root + url),
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
    const { file, args = [] } = match;

    const response = require(path.join(process.cwd(), mockFolder, file));

    if (!response) {
      debug("Could not load the response file: " + file);
      return null;
    }

    if (typeof response === "function") {
      debug("Responding with mock function: " + file);
      return response.apply(this, args);
    } else {
      debug("Responding with mock file: " + file);
      return response;
    }
  }

  function getMatch(req) {
    const { url, method } = req;

    let match;

    if (hasExactMatch(url)) {
      debug(["Matched exact url:", method, url].join(" "));
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
        debug(["Matched url:", method, url].join(" "));
        match = {
          file: layer.file,
          args: regexMatch.slice(1)
        };
      }
    }

    return match;
  }

  return function(req, res, next) {
    try {
      if (stack.length) {
        const match = getMatch(req);
        if (match) {
          corsHandler(req, res, function() {
            const response = getResponse(match);
            if (response) {
              res.setHeader("X-Mocked-Response", match.file);
              res.send(response);
            }
          });
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
