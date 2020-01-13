function decode_param(val) {
  if (typeof val !== "string" || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = "Failed to decode param '" + val + "'";
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}

function getArgs(match, layer) {
  const { keys } = layer;
  const params = {};

  for (var i = 1; i < match.length; i++) {
    let key = keys[i - 1];
    let prop = key.name;
    let val = decode_param(match[i]);

    if (val !== undefined || !hasOwnProperty.call(params, prop)) {
      params[prop] = val;
    }
  }

  return params;
}

module.exports = {
  getArgs
};
