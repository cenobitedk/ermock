# express-request-mock

Express middleware to mock requests with JSON and JS files.

## Features

- File based mocks using JSON and JS files.
- Flexible configuration with [cosmiconfig](https://www.npmjs.com/package/cosmiconfig).
- Supports preflight requests using [cors](https://www.npmjs.com/package/cors).
- Uses express style path matching with [path-to-regexp](https://www.npmjs.com/package/path-to-regexp).

## Installation

```
npm i express-request-mock
```

## Usage

```
const express = require("express");
const ermock = require("express-request-mock");

const app = express();

// Add middleware as early as possible.
app.use(ermock());

// Setup routes etc.
```

## Setup

It uses [cosmiconfig](https://www.npmjs.com/package/cosmiconfig) and thus supports any of the following:

- `ermock` property in `package.json`
- `.ermockrc` file in JSON or YAML format
- `.ermockrc.json` file
- `.ermockrc.yaml`, `.ermockrc.yml`, or `.ermockrc.js` file
- `ermock.config.js` file exporting a JS object

Furthemore it also accepts a configuration object when setting up in express, eg.:

```
app.use(mocker({
    root: "/api/",
    dir: "my-mock-reposnses",
    delay: 500,
    table: { ... }
}));
```

the complete configuration will consist of default values, file based configuration (cosmiconfig) and object based configuration merged in the mentioned order.  
This makes it possible to dynamically overwrite properties, e.g. the `root` prefix upon application load.

## Configuration

The configuration object accepts the following properties:

| Property      | Type             | Default value | Description                                                             |
| ------------- | ---------------- | ------------- | ----------------------------------------------------------------------- |
| `root`        | string           | `""`          | Path prefix, e.g. `"/api"`                                              |
| `dir`         | string           | `""`          | Folder name where mock files can be found, e.g. `"mocks"`               |
| `table`       | string or object | `{}`          | Filename or object with url path as key and filename as key, see below. |
| `delay`       | number           | `0`           | Add delay to reponses in milliseconds.                                  |
| `corsOptions` | object           | `{}`          | Options object to use with [cors](https://www.npmjs.com/package/cors).  |

## Table configuration

The `table` accepts either a filename (relative to application root) or an object with the table configuration.  
If you supply a filename it will be loaded automatically, e.g. `mocks/table.json` or `mock-table.json`.

The object must:

- have `url path` as **key**, starting with forward slash and excluding the `root` prefix.
- have `filename` as **value**, either a `.json` file or `.js` file returning a method.

The path matching is done with [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) using **default options**.

Example of table configuration:

```
// mock-table.json
{
    "/myservice/users": "users.json",
    "/myservice/user/:id": "user.js
}

// users.json
{
    "users": [
        1,
        2
    ]
}

// user.js
module.exports = function (props) {
    const { id } = props;

    if (id === 1) {
        return {
            id,
            name: "Arnold S.",
            email: "illbeback@gmail.com",
            username: "T800",
            permissions: ["ALL"]
        };
    } else {
        return {
            id,
            name: "Connor, Sarah",
            email: "",
            username: "donttrustthemachines",
            permissions: ["RESTRICTED"]
        }
    }

}
```

When a method is returned from the mock file, it is executed with the match object containing named keys and indexed values from the path matched. See the following example:

```
// table config
{
    "/service/subscription/:id([^/\\?]+)(\\?.*)?": "mockfile.js"
}

// req url:
//  "/service/subscription/123?userinfo=true"

// mockfile.js
module.exports = function (props) {
    // props = { '0': '?userinfo=true', id: '123' }
}
```

For detailed configuration of the url path, see the [path-to-regexp readme](https://github.com/pillarjs/path-to-regexp#readme).

## License

MIT
