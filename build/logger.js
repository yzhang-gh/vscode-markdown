"use strict";

class Logger {
    /**
     * The logger name. Read-only.
     * @type {string}
     */
    #name;

    /**
     * The output buffer.
     * @type {string[]}
     */
    #buffer;

    /**
     * @param {string} name - Human-readable name of the logger.
     */
    constructor(name) {
        this.#name = name;

        this.#buffer = [];
    }

    get name() {
        return this.#name;
    }

    /**
     * @param {string} message
     * @param {boolean} withName
     * @param {boolean} withTime
     */
    #format(message, withName, withTime) {
        // https://2ality.com/2011/10/string-concatenation.html
        let result = "";

        if (withTime) {
            result += `[${new Date().toISOString()}] `;
        }

        if (withName) {
            result += `{${this.#name}} `;
        }

        result += message;

        return result;
    }

    /**
     * Adds a message to the log, which will show on a manual flush.
     * A Line Feed will be appended automatically.
     * @param {string} message
     * @param {boolean} withName - `true` to prepend the logger name.
     * @param {boolean} withTime - `true` to prepend timestamp.
     */
    append(message, withName = false, withTime = false) {
        this.#buffer.push(this.#format(message, withName, withTime));
    }

    /**
     * Flushes the output buffer.
     */
    flush() {
        if (this.#buffer.length) {
            console.log(this.#buffer.join("\n"));
        }
        this.#buffer.length = 0;
    }

    /**
     * Writes a message to the console immediately, always with timestamp and the logger name.
     * @param {string} message
     */
    log(message) {
        console.log(this.#format(message, true, true));
    }
}

/**
 * @param {string} label - The logger name representing this output channel.
 */
const createLogger = (label) => {
    const logger = new Logger(label);
    process.on("exit", () => logger.flush());
    return logger;
};

// Sort in alphabetical order.
module.exports = Object.freeze({
    createLogger,
});
