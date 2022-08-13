"use strict";

const { createLogger } = require("./logger.js");

const logger = createLogger("Build");

logger.log("Started.");
// This is not necessarily the last line of the log, as others may also register on the event.
process.on("exit", (code) => logger.log(`${code ? "Failed" : "Passing"}.`));

require("./compilation.js").run();
require("./duplicate-changelog.js").run();
