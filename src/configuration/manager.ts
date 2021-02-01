"use strict";

import * as vscode from "vscode";
import type IDisposable from "../IDisposable";
import type KnownKey from "./KnownKey";
import defaultFallback from "./defaultFallback";

export type IConfigurationFallbackMap = { readonly [key in KnownKey]?: (scope?: vscode.ConfigurationScope) => any; };

export interface IConfigurationManager extends IDisposable {

    /**
     * Gets the value that an our own key denotes.
     * @param key The configuration key.
     * @param scope The scope, for which the configuration is asked.
     */
    get<T>(key: KnownKey, scope?: vscode.ConfigurationScope): T;

    /**
     * Gets the value that a configuration section denotes.
     * @param section The absolute section identifier (setting ID).
     * @param scope The scope, for which the configuration is asked.
     */
    getByAbsolute<T>(section: string, scope?: vscode.ConfigurationScope): T | undefined;
}

/**
 * This is currently just a proxy that helps mapping our configuration keys.
 */
class ConfigurationManager implements IConfigurationManager {

    private readonly _fallback: IConfigurationFallbackMap;

    constructor(fallback: IConfigurationFallbackMap) {
        this._fallback = Object.assign<IConfigurationFallbackMap, IConfigurationFallbackMap>(Object.create(null), fallback);
    }

    public dispose(): void { }

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

const configManager = new ConfigurationManager(defaultFallback);
export default configManager;
