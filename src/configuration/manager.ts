"use strict";

import * as vscode from "vscode";
import type IDisposable from "../IDisposable";
import type KnownKey from "./KnownKey";
import { deprecated, fallbackMap } from "./defaultFallback";

export type IConfigurationFallbackMap = { readonly [key in KnownKey]?: (scope?: vscode.ConfigurationScope) => any; };

export interface IConfigurationManager extends IDisposable {

    /**
     * Gets the value that an our own key denotes.
     * @param key The configuration key.
     * @param scope The scope, for which the configuration is asked.
     */
    get<T>(key: KnownKey, scope?: vscode.ConfigurationScope): T;

    /**
     * Gets the value that an absolute identifier denotes.
     * @param section The dot-separated identifier (usually a setting ID).
     * @param scope The scope, for which the configuration is asked.
     */
    getByAbsolute<T>(section: string, scope?: vscode.ConfigurationScope): T | undefined;
}

/**
 * This is currently just a proxy that helps mapping our configuration keys.
 */
class ConfigurationManager implements IConfigurationManager {

    private readonly _fallback: IConfigurationFallbackMap;

    constructor(fallback: IConfigurationFallbackMap, deprecatedKeys: readonly string[]) {
        this._fallback = Object.assign<IConfigurationFallbackMap, IConfigurationFallbackMap>(Object.create(null), fallback);
        this.showWarning(deprecatedKeys);
    }

    public dispose(): void { }

    /**
     * Shows an error message for each deprecated key, to help user migrate.
     * This is async to avoid blocking instance creation.
     */
    private async showWarning(deprecatedKeys: readonly string[]): Promise<void> {
        for (const key of deprecatedKeys) {
            const value = vscode.workspace.getConfiguration("markdown.extension").get(key);
            if (value !== undefined && value !== null) {
                // We are not able to localize this string for now.
                // Our NLS module needs to be configured before using, which is done in the extension entry point.
                // This module may be directly or indirectly imported by the entry point.
                // Thus, this module may be loaded before the NLS module is available.
                vscode.window.showErrorMessage(`The setting 'markdown.extension.${key}' has been deprecated.`);
            }
        }
    }

    public get<T>(key: KnownKey, scope?: vscode.ConfigurationScope): T {
        const fallback = this._fallback[key];
        if (fallback) {
            return fallback(scope);
        } else {
            return vscode.workspace.getConfiguration("markdown.extension", scope).get<T>(key)!;
        }
    }

    public getByAbsolute<T>(section: string, scope?: vscode.ConfigurationScope): T | undefined {
        if (section.startsWith("markdown.extension.")) {
            return this.get<T>(section.slice(19) as KnownKey, scope);
        } else {
            return vscode.workspace.getConfiguration(undefined, scope).get<T>(section);
        }
    }
}

export const configManager = new ConfigurationManager(fallbackMap, deprecated);
