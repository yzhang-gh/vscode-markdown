/*!
 * Licensed under the MIT License.
 */

// This is designed for vsce pre-publish. See `package.json`.
// https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prepublish-step

//@ts-check

"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRootPath = path.resolve(__dirname, "..");

/* Check environment. */

// Warn if the caller might be using this module in a wrong way.
if (process.cwd() !== projectRootPath) {
    console.error(`\nYour working directory is: ${process.cwd()}\nNot the project root.\nAre you calling it in a correct way?\n`);
}

/* Prepare welcome materials. */

console.log("\nPrepare welcome materials...\n");

const welcomeDirPath = path.resolve(projectRootPath, "welcome");

// Delete `WELCOMED` flag file.
try {
    fs.unlinkSync(path.resolve(welcomeDirPath, "WELCOMED"));
} catch { }

// vsce will modify `README.md` and `CHANGELOG.md` during packaging.
// Thus, we create the `changes.md` for our extension to consume.
// Due to relative paths in the file, it has to be under the project root.
let isWelcomeMessagesExist = false;
try {
    isWelcomeMessagesExist = fs.readdirSync(welcomeDirPath, { withFileTypes: true })
        .some(i => i.isFile() && i.name.endsWith(".txt"));
} catch { }

if (isWelcomeMessagesExist) {
    const srcPath = path.resolve(projectRootPath, "CHANGELOG.md");
    const destPath = path.resolve(projectRootPath, "changes.md");

    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied.\nFrom: ${srcPath}\nTo: ${destPath}`);
} else {
    console.error("Skipped: Create 'changes.md'.");
}

/* Compile. */

console.log("\nCompile extension...\n");

spawn("npx", ["webpack", "--mode", "production"], {
    cwd: projectRootPath,
    shell: process.platform === "win32", // Windows compatibility.
    stdio: "inherit",
}).on("error", e => { throw e; });
