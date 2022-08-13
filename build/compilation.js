// # Notes
//
// We adjust the configurations according to OS environment variables.
// The `mode` reflects the "NODE_ENV", which is a convention established by Express.
// Source map (`devtool`) is expensive and not needed on CI.
//
// The compilation starts when calling `webpack()` with a callback.
// It is async, sequential. The callback is invoked only once.
// https://webpack.js.org/api/node/#multicompiler

"use strict";

const webpack = require("webpack");
const { createLogger } = require("./logger.js");

const logger = createLogger("Compilation");

/**
 * @type {boolean}
 * @see {@link https://docs.github.com/en/actions/reference/environment-variables}
 * @see {@link https://github.com/actions/runner/blob/main/src/Runner.Sdk/ProcessInvoker.cs}
 */
const Env_Is_Ci = process.env["CI"] === "true" || process.env["GITHUB_ACTIONS"] === "true";

/**
 * Only distinguish "development" or not.
 * @type {"development" | "production"}
 */
const Env_Mode = process.env["NODE_ENV"] === "development" ? "development" : "production";

/**
 * @type {webpack.StatsOptions}
 */
const Stats_Options = {
    all: false,
    assets: true,
    children: true,
    errors: true,
    errorsCount: true,
    outputPath: true,
    timings: true,
    version: true,
    warnings: true,
    warningsCount: true,
};

/**
 * @param {webpack.StatsError} e
 */
const formatCompilationError = (e) => `
ERROR @ ${e.moduleName} (${e.loc})
${e.message}
`;

/**
 * @param {webpack.StatsAsset} a
 */
const formatAssetInfo = (a) => `\
${a.type} : ${a.name ?? "[no name]"} \
: ${a.size} bytes \
${a.emitted ? "[emitted]" : a.comparedForEmit ? "[compared for emit]" : ""}\
`;

/**
 * Collects and formats stats summary by pre-order traversal.
 * The stats tree should be relatively small in real world.
 * @param {webpack.StatsCompilation} i - The beginning node.
 */
const formatStatsInfo = (i) => {
    let r = i.name
        ? `
STATS @ ${i.name}
${i.assets?.map(formatAssetInfo).join("\n") ?? "No asset."}
Compiled in ${i.time} ms. Errors: ${i.errorsCount}. Warnings: ${i.warningsCount}.
`
        : "";

    if (i.children?.length) {
        for (const c of i.children) {
            r += formatStatsInfo(c);
        }
    }

    return r;
};

const run = () => {
    logger.log(`Started. Mode: ${Env_Mode}. CI: ${Env_Is_Ci}.`);

    const configs = require("../webpack.config.js");

    for (const c of configs) {
        c.mode = Env_Mode;

        if (Env_Is_Ci) {
            c.devtool = false;
        }
    }

    webpack(configs, (err, stats) => {
        // `!stats` is just to satisfy type-checking.
        if (err || !stats) {
            throw err;
        }

        /** @type {Required<webpack.StatsCompilation>} */
        // @ts-ignore Too hard to check type. Please debug to inspect it.
        const info = stats.toJson(Stats_Options);

        logger.append(`webpack ${info.version}`, true, true);

        // All errors. Treat warning as error.
        if (info.errorsCount || info.warningsCount) {
            logger.append([...info.errors, ...info.warnings].map(formatCompilationError).join("\n"));
            logger.append(`
Errors: ${info.errorsCount}.
Warnings: ${info.warningsCount}.
`);
        }

        // Summary of each configuration.
        logger.append(formatStatsInfo(info));

        logger.flush();

        if (info.errorsCount) {
            throw new Error("{Compilation} Failed.");
        }

        logger.log("Passing.");
    });
};

module.exports = Object.freeze({ run });
