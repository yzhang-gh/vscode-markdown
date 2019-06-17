import * as fs from "fs";
import * as path from "path";
import { extensions } from "vscode";

interface IConfig {
    locale?: string;
}

interface ILanguagePack {
    [key: string]: string;
}

export class Localize {
    // get language pack when the instance be created
    private bundle = this.resolveLanguagePack();
    constructor(private config: IConfig = {}) { }
    /**
     * translate the key
     * @param key
     * @param args
     */
    public localize(key: string, ...args: any[]) {
        const languagePack = this.bundle;
        const message: string = languagePack[key] || key;
        return this.format(message, args);
    }
    /**
     * format the message
     * @param message
     * @param args
     */
    private format(message: string, args: any[] = []): string {
        let result: string;
        if (args.length === 0) {
            result = message;
        } else {
            result = message.replace(/\{(\d+)\}/g, (match, rest: any[]) => {
                const index = rest[0];
                return typeof args[index] !== "undefined" ? args[index] : match;
            });
        }
        return result;
    }
    /**
     * Get language pack
     */
    private resolveLanguagePack(): ILanguagePack {
        let resolvedLanguage: string = "";
        const rootPath = extensions.getExtension("yzhang.markdown-all-in-one").extensionPath;
        const file = path.join(rootPath, "package");
        const options = this.config;

        if (!options.locale) {
            resolvedLanguage = ".nls.json";
        } else {
            let locale: string | null = options.locale;
            while (locale) {
                const candidate = ".nls." + locale + ".json";
                if (fs.existsSync(file + candidate)) {
                    resolvedLanguage = candidate;
                    break;
                } else {
                    const index = locale.lastIndexOf("-");
                    if (index > 0) {
                        locale = locale.substring(0, index);
                    } else {
                        resolvedLanguage = ".nls.json";
                        locale = null;
                    }
                }
            }
        }

        const languageFilePath = path.join(file + resolvedLanguage);

        if (!fs.existsSync(languageFilePath)) {
            return {};
        }

        return JSON.parse(fs.readFileSync(languageFilePath, "utf-8"));
    }
}

let config: IConfig = {
    locale: "en"
};

try {
    config = Object.assign(
        config,
        JSON.parse((process.env as any).VSCODE_NLS_CONFIG)
    );
} catch (err) {
    //
}

const instance = new Localize(config);

export default instance.localize.bind(instance);
