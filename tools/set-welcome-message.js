/*!
 * Licensed under the MIT License.
 */

// This helps you create the welcome message file.
// It can be either imported as a function, or run as a script.
// As a script, it requires one and only one argument: the welcome message.
// If anything goes wrong, an exception will be thrown.

//@ts-check

"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Creates or overwrites the welcome message file (`welcome.txt`) in the project root.
 *
 * Due to security concerns, code points under Unicode General Category C are not allowed.
 * Thus, EOLs are also not allowed in both the file and the parameter.
 * Thus, the definition of "line" here differs greatly from the POSIX standard.
 * @param {string} message The welcome message. Must be single line, and safe for display.
 * @returns `true` for success.
 */
function setWelcomeMessage(message) {
    if (!message || /^\s*$/.test(message)) {
        throw new Error("The message must contain non-whitespace characters.");
    }

    if (/\p{C}/u.test(message)) {
        throw new Error("Control characters and other code points under Unicode General Category C are not allowed.");
    }

    const messageFilePath = path.resolve(__dirname, "..", "welcome.txt");

    fs.writeFileSync(messageFilePath, message, "utf8");
    console.log(`\nSucceeded.\nMessage: ${message}\nPath: ${messageFilePath}\n`);
    return true;
}

module.exports = setWelcomeMessage;

/* Main. */

if (process.argv[1] === __filename) {
    if (process.argv.length === 3) {
        setWelcomeMessage(process.argv[2]);
    } else {
        throw new Error("\nThis requires one and only one argument.\nAre you calling it in a correct way?\n");
    }
}
