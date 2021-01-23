"use strict";

import * as fs from "fs";
import * as path from "path";
import type VisualStudioCodeLocaleId from "../contract/VisualStudioCodeLocaleId";

/**
 * Finds localized resources that match the given pattern under the directory.
 *
 * ### Remarks
 *
 * Comparison is case-**sensitive** (SameValueZero).
 *
 * When an exact match cannot be found, this function performs fallback as per RFC 4647 Lookup.
 *
 * Make sure the directory does not change.
 * Call this function as **few** as possible.
 * This function may scan the directory thoroughly, thus is very **expensive**.
 *
 * ### Exceptions
 *
 * * The path to the directory is not absolute.
 * * The directory does not exist.
 * * Read permission is not granted.
 *
 * @param directory The **absolute** file system path to the directory that Node.js can recognizes, including UNC on Windows.
 * @param baseName The string that the file name begins with.
 * @param suffix The string that the file name ends with.
 * @param locales The locale IDs that can be inserted between `baseName` and `suffix`. Sorted by priority, from high to low.
 * @param separator The string to use when joining `baseName`, `locale`, `suffix` together. Defaults to `.` (U+002E).
 * @returns An array of absolute paths to matched files, sorted by priority, from high to low. Or `undefined` when no match.
 * @example
 * // Entries under directory `/tmp`:
 * // Directory f.nls.zh-cn.json/
 * // File      f.nls.json
 * // File      f.nls.zh.json
 *
 * resolveResource("/tmp", "f.nls", "json", ["ja", "zh-cn"]);
 *
 * // Returns:
 * ["/tmp/f.nls.zh.json", "/tmp/f.nls.json"];
 */
export default function resolveResource(
    directory: string,
    baseName: string,
    suffix: string,
    locales: VisualStudioCodeLocaleId[],
    separator: string = ".",
): string[] | undefined {
    if (!path.isAbsolute(directory)) {
        throw new Error("The directory must be an absolute file system path.");
    }

    // Throw an exception, if we do not have permission, or the directory does not exist.
    const files: readonly string[] = fs.readdirSync(directory, { withFileTypes: true }).reduce<string[]>((res, crt) => {
        if (crt.isFile()) {
            res.push(crt.name);
        }
        return res;
    }, []);

    const result: string[] = [];

    let splitIndex: number;
    for (let loc of locales as string[]) {
        while (true) {
            const fileName = baseName + separator + loc + separator + suffix;
            const resolvedPath = path.resolve(directory, fileName);
            if (!result.includes(resolvedPath) && files.includes(fileName)) {
                result.push(resolvedPath);
            }

            // Fallback according to RFC 4647 section 3.4. Although they are different systems, algorithms are common.
            splitIndex = loc.lastIndexOf("-");
            if (splitIndex > 0) {
                loc = loc.slice(0, splitIndex);
            } else {
                break;
            }
        }
    }

    // Fallback. The use of block is to keep the function scope clean.
    {
        const fileName = baseName + separator + suffix;
        const resolvedPath = path.resolve(directory, fileName);
        // As long as parameters are legal, this `resolvedPath` won't have been in `result`. Thus, only test `fileName`.
        if (files.includes(fileName)) {
            result.push(resolvedPath);
        }
    }

    return result.length === 0 ? undefined : result;
}
