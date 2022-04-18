// # Notes
//
// vsce will modify `README.md` and `CHANGELOG.md` during packaging.
// Thus, we create the `changes.md` for ours to consume.
// Due to relative paths in the file, it has to be under the project root.

"use strict";

const fs = require("fs");
const path = require("path");
const { createLogger } = require("./logger.js");

const logger = createLogger("Duplicate Changelog");

const run = () => {
    logger.log("Started.");

    const projectRoot = path.resolve(__dirname, "..");
    const src = path.resolve(projectRoot, "CHANGELOG.md");
    const dest = path.resolve(projectRoot, "changes.md");

    logger.log(`\nFrom: ${src}\nTo:   ${dest}`);
    fs.copyFileSync(src, dest);

    logger.log("Passing.");
};

module.exports = Object.freeze({ run });
