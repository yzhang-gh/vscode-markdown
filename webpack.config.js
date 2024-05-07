// @ts-check

// # Notes
//
// ## Target and environment
//
// Specify the `target` option precisely to help webpack 5 to do subtle optimization.
// For example, use `node16` instead of `node` when targeting Node.js 16 or higher.
// When in doubt, check: https://github.com/webpack/webpack/blob/main/lib/config/target.js
//
// ## Source map and debugging
//
// Source map, which is critical for debugging, is a tricky part.
// TypeScript compiler emits maps with relative source paths and no source content.
// Webpack is controlled by `devtool` and `devtoolModuleFilenameTemplate` which defaults to its `webpack` protocol.
// Webpack's internal paths are something between file system path and URL. Quite awkward.
// The VS Code JavaScript Debugger can understand various URLs,
// and allows rewriting via the `sourceMapPathOverrides` in launch configuration.
//
// Recommendation:
// Webpack's default file name template often works fine.
// File URL may improve the experience of Node.js debugging.
// Exclude source content to save space.
//
// Helpful resources:
// https://code.visualstudio.com/docs/nodejs/nodejs-debugging
// https://survivejs.com/webpack/building/source-maps/
// https://github.com/webpack/webpack/issues/3603
// https://github.com/webpack/webpack/issues/8226
// https://github.com/microsoft/vscode-js-debug/blob/main/src/configuration.ts
// https://github.com/microsoft/vscode-js-debug/tree/main/src/targets
// https://www.typescriptlang.org/tsconfig#sourceMap
// https://chromedevtools.github.io/devtools-protocol/v8/
// https://gist.github.com/jarshwah/389f93f2282a165563990ed60f2b6d6c
//
// ## Webpack mode
//
// The `mode` is not set here.
// The build pipeline or CI sets it according to OS environment variables.
// In all other scenarios, please use webpack-cli flags.

"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

/** @typedef {import("webpack").Configuration} WebpackConfig **/

/** @type {WebpackConfig} */
const Config_Base = {
    context: __dirname,
    entry: {
        main: "./src/extension.ts",
    },
    resolve: {
        extensions: [".ts", ".js"],
        mainFields: ["module", "main"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                include: path.resolve(__dirname, "src"),
                use: [
                    {
                        loader: "ts-loader",
                    },
                ],
            },
        ],
    },
    externals: {
        vscode: "commonjs vscode", // It is only present in the VS Code extension hosts.
    },
    devtool: "nosources-source-map",
};

/** @type {WebpackConfig} */
const Config_Node = {
    ...Config_Base,
    name: "node",
    target: "node14",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist", "node"),
        library: { type: "commonjs2" },
        webassemblyModuleFilename: "zola_slug_bg.wasm",
        // Don't use `absoluteResourcePath`, as it's often not a file system path.
        devtoolModuleFilenameTemplate: (info) => pathToFileURL(path.resolve(__dirname, info.resourcePath)).href,
    },
    experiments: {
        asyncWebAssembly: true,
    }
};

module.exports = [Config_Node];
