/*!
 * Licensed under the MIT License.
 */

// This helps you create a welcome message file.
// It can be either imported as a function, or run as a script.
// As a script, it requires one or two arguments: the welcome message, the locale ID.
// If anything goes wrong, an exception will be thrown.

//@ts-check

"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Creates or overwrites a welcome message file (`welcome/<locale>.txt`) in the project root.
 *
 * Due to security concerns, code points under Unicode General Category C are not allowed.
 * Thus, EOLs are also not allowed in both the file and the parameter.
 * Thus, the definition of "line" here differs greatly from the POSIX standard.
 * @param {string} message The welcome message. Must be single line, and safe for display.
 * @param {string} locale The locale ID, which should be recognized by VS Code.
 * But you can still provide an arbitrary one, as long as it matches the format.
 * @returns `true` for success.
 */
function setWelcomeMessage(message, locale = "en") {
    if (!message || /^\s*$/.test(message)) {
        throw new Error("The message must contain non-whitespace characters.");
    }

    if (/\p{C}/u.test(message)) {
        throw new Error("Control characters and other code points under Unicode General Category C are not allowed.");
    }

    if (!/^[A-Za-z]+(?:-[A-Za-z]+)*$/.test(locale)) {
        throw new Error("The locale ID must only contain ASCII letters or hyphens, and must begin and end with letters.");
    }

    const messageFilePath = path.resolve(__dirname, "..", "welcome", locale + ".txt");

    fs.mkdirSync(path.resolve(__dirname, "..", "welcome"), { recursive: true });
    fs.writeFileSync(messageFilePath, message, "utf8");
    console.log(`\nSucceeded.\nMessage: ${message}\nPath: ${messageFilePath}\n`);
    return true;
}

module.exports = setWelcomeMessage;

/* Main. */

if (process.argv[1] === __filename) {
    if (process.argv.length <= 4) {
        setWelcomeMessage(process.argv[2], process.argv[3]);
    } else {
        throw new Error("\nThis requires one or two arguments.\nAre you calling it in a correct way?\n");
    }
}
