"use strict";

/**
 * @see <https://code.visualstudio.com/api/references/vscode-api#Disposable>
 * @see <https://github.com/dotnet/runtime/blob/master/src/libraries/System.Private.CoreLib/src/System/IDisposable.cs>
 * @see <https://referencesource.microsoft.com/#mscorlib/system/idisposable.cs>
 */
export default interface IDisposable {

    /**
     * Performs application-defined tasks associated with freeing, releasing, or resetting resources.
     */
    dispose(): any;
}
