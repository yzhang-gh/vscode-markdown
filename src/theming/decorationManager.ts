"use strict";

import * as vscode from "vscode";
import { configManager } from "../configuration/manager";
import type IDisposable from "../IDisposable";
import { isMdDocument } from "../util/generic";
import { DecorationClass, decorationClassConfigMap, decorationStyles } from "./constant";
import decorationWorkerRegistry from "./decorationWorkerRegistry";

/**
 * Represents a set of decoration ranges.
 */
export interface IDecorationRecord {

    readonly target: DecorationClass;

    /**
     * The ranges that the decoration applies to.
     */
    readonly ranges: readonly vscode.Range[];
}

/**
 * Represents a decoration analysis worker.
 *
 * A worker is a function, which analyzes a document, and returns a thenable that resolves to a `IDecorationRecord`.
 * A worker **may** accept a `CancellationToken`, and then must **reject** the promise when the task is cancelled.
 */
export interface IFuncAnalysisWorker {

    (document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<IDecorationRecord>;
}

export type IWorkerRegistry = { readonly [target in DecorationClass]: IFuncAnalysisWorker; };

/**
 * Represents the state of an asynchronous or long running operation.
 */
const enum TaskState {
    Pending,
    Fulfilled,
    Cancelled,
}

/**
 * Represents a decoration analysis task.
 *
 * Such a task should be asynchronous.
 */
interface IDecorationAnalysisTask {

    /**
     * The document that the task works on.
     */
    readonly document: vscode.TextDocument;

    /**
     * The thenable that represents the task.
     *
     * This is just a handle for caller to await.
     * It must be guaranteed to be still **fulfilled** on cancellation.
     */
    readonly executor: Thenable<unknown>;

    /**
     * The result.
     *
     * Only available when the task is `Fulfilled`. Otherwise, `undefined`.
     */
    readonly result: undefined | readonly IDecorationRecord[];

    /**
     * The state of the task.
     */
    readonly state: TaskState;

    /**
     * Cancels the task.
     */
    cancel(): void;
}

class DecorationAnalysisTask implements IDecorationAnalysisTask {

    private readonly _cts: vscode.CancellationTokenSource;

    private _result: readonly IDecorationRecord[] | undefined = undefined;

    public readonly document: vscode.TextDocument;

    public readonly executor: Thenable<readonly IDecorationRecord[] | void>;

    public get result(): readonly IDecorationRecord[] | undefined {
        return this._result;
    }

    public get state(): TaskState {
        if (this._cts.token.isCancellationRequested) {
            return TaskState.Cancelled;
        } else if (this._result) {
            return TaskState.Fulfilled;
        } else {
            return TaskState.Pending;
        }
    }

    constructor(document: vscode.TextDocument, workers: IWorkerRegistry, targets: readonly DecorationClass[]) {
        this.document = document;

        const token =
            (this._cts = new vscode.CancellationTokenSource()).token;

        // The weird nesting is to defer the task creation to reduce runtime cost.
        // The outermost is a so-called "cancellable promise".
        // If you create a task and cancel it immediately, this design guarantees that most workers are not called.
        // Otherwise, you will observe thousands of discarded microtasks quickly.
        this.executor = new Promise<IDecorationRecord[]>((resolve, reject): void => {
            token.onCancellationRequested(reject);
            if (token.isCancellationRequested) {
                reject();
            }

            resolve(Promise.all(targets.map<Thenable<IDecorationRecord>>(target => workers[target](document, token))));
        })
            .then(result => this._result = result) // Copy the result and pass it down.
            .catch(reason => {
                // We'll adopt `vscode.CancellationError` when it matures.
                // For now, falsy indicates cancellation, and we won't throw an exception for that.
                if (reason) {
                    throw reason;
                }
            });
    }

    public cancel(): void {
        this._cts.cancel();
        this._cts.dispose();
    }
}

interface IDecorationManager extends IDisposable { }

/**
 * Represents a text editor decoration manager.
 *
 * For reliability reasons, do not leak any mutable content out of the manager.
 *
 * VS Code does not define a corresponding `*Provider` interface, so we implement it ourselves.
 * The following scenarios are considered:
 *
 * * Activation.
 * * Opening a document with/without corresponding editors.
 * * Changing a document.
 * * Closing a document.
 * * Closing a Markdown editor, and immediately switching to an arbitrary editor.
 * * Switching between arbitrary editors, including Markdown to Markdown.
 * * Changing configuration after a decoration analysis task started.
 * * Deactivation.
 */
class DecorationManager implements IDecorationManager {

    /**
     * Decoration type instances **currently in use**.
     */
    private readonly _decorationHandles = new Map<DecorationClass, vscode.TextEditorDecorationType>();

    /**
     * Decoration analysis workers.
     */
    private readonly _decorationWorkers: IWorkerRegistry;

    /**
     * The keys of `_decorationWorkers`.
     * This is for improving performance.
     */
    private readonly _supportedClasses: readonly DecorationClass[];

    /**
     * Disposables which unregister contributions to VS Code.
     */
    private readonly _disposables: vscode.Disposable[];

    /**
     * Decoration analysis tasks **currently in use**.
     * This serves as both a task pool, and a result cache.
     */
    private readonly _tasks = new Map<vscode.TextDocument, IDecorationAnalysisTask>();

    /**
     * This is exclusive to `applyDecoration()`.
     */
    private _displayDebounceHandle: vscode.CancellationTokenSource | undefined;

    constructor(workers: IWorkerRegistry) {
        this._decorationWorkers = Object.assign<IWorkerRegistry, IWorkerRegistry>(Object.create(null), workers);
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_Accessors#property_names
        this._supportedClasses = Object.keys(workers).map(Number);

        // Here are many different kinds of calls. Bind `this` context carefully.

        // Load all.
        vscode.workspace.textDocuments.forEach(this.updateCache, this);
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.applyDecoration(activeEditor);
        }

        // Register event listeners.
        this._disposables = [
            vscode.workspace.onDidOpenTextDocument(this.updateCache, this),

            vscode.workspace.onDidChangeTextDocument(event => {
                this.updateCache(event.document);
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document === event.document) {
                    this.applyDecoration(activeEditor);
                }
            }),

            vscode.workspace.onDidCloseTextDocument(this.collectGarbage, this),
            vscode.window.onDidChangeActiveTextEditor(editor => { if (editor) { this.applyDecoration(editor); } }),
        ];
    }

    public dispose(): void {
        // Unsubscribe event listeners.
        for (const disposable of this._disposables) {
            disposable.dispose();
        }
        this._disposables.length = 0;

        // Stop rendering.
        if (this._displayDebounceHandle) {
            this._displayDebounceHandle.cancel();
            this._displayDebounceHandle.dispose();
        }
        this._displayDebounceHandle = undefined;

        // Terminate tasks.
        for (const task of this._tasks.values()) {
            task.cancel();
        }
        this._tasks.clear();

        // Remove decorations.
        for (const handle of this._decorationHandles.values()) {
            handle.dispose();
        }
        this._decorationHandles.clear();
    }

    /**
     * Applies a set of decorations to the text editor asynchronously.
     *
     * This method is expected to be started frequently on volatile state.
     * It begins with a short sync part, to make immediate response to event possible.
     * Then, it internally creates an async job, to keep data access correct.
     * It stops silently, if any condition is not met.
     *
     * For performance reasons, it only works on the **active** editor (not visible editors),
     * although VS Code renders decorations as long as the editor is visible.
     * Besides, we have a threshold to stop analyzing large documents.
     * When it is reached, related task will be unavailable, thus by design, this method will quit.
     */
    private applyDecoration(editor: vscode.TextEditor): void {
        if (!isMdDocument(editor.document)) {
            return;
        }
        const document = editor.document;

        // The task can be in any state (typically pending, fulfilled, obsolete) during this call.
        // The editor can be suspended or even disposed at any time.
        // Thus, we have to check at each stage.

        const task = this._tasks.get(document);
        if (!task || task.state === TaskState.Cancelled) {
            return;
        }

        // Discard the previous operation, in case the user is switching between editors fast.
        // Although I don't think a debounce can make much value.
        if (this._displayDebounceHandle) {
            this._displayDebounceHandle.cancel();
            this._displayDebounceHandle.dispose();
        }

        const debounceToken =
            (this._displayDebounceHandle = new vscode.CancellationTokenSource()).token;

        // Queue the display refresh job.
        (async (): Promise<void> => {
            if (task.state === TaskState.Pending) {
                await task.executor;
            }

            if (task.state !== TaskState.Fulfilled || debounceToken.isCancellationRequested) {
                return;
            }

            const results = task.result!;

            for (const { ranges, target } of results) {
                let handle = this._decorationHandles.get(target);

                // Recheck applicability, since the user may happen to change settings.
                if (configManager.get(decorationClassConfigMap[target]) as boolean) {
                    // Create a new decoration type instance if needed.
                    if (!handle) {
                        handle = vscode.window.createTextEditorDecorationType(decorationStyles[target]);
                        this._decorationHandles.set(target, handle);
                    }
                } else {
                    // Remove decorations if the type is disabled.
                    if (handle) {
                        handle.dispose();
                        this._decorationHandles.delete(target);
                    }
                    continue;
                }

                if (
                    debounceToken.isCancellationRequested
                    || task.state !== TaskState.Fulfilled // Confirm the cache is still up-to-date.
                    || vscode.window.activeTextEditor !== editor // Confirm the editor is still active.
                ) {
                    return;
                }

                // Create a shallow copy for VS Code to use. This operation shouldn't cost much.
                editor.setDecorations(handle, Array.from(ranges));
            }
        })();
    }

    /**
     * Terminates tasks that are linked to the document, and frees corresponding resources.
     */
    private collectGarbage(document: vscode.TextDocument): void {
        const task = this._tasks.get(document);
        if (task) {
            task.cancel();
            this._tasks.delete(document);
        }
    }

    /**
     * Initiates and **queues** a decoration cache update task that is linked to the document.
     */
    private updateCache(document: vscode.TextDocument): void {
        if (!isMdDocument(document)) {
            return;
        }

        // Discard previous tasks. Effectively mark existing cache as obsolete.
        this.collectGarbage(document);

        // Stop if the document exceeds max length.
        // The factor is for compatibility. There should be new logic someday.
        if (document.getText().length * 1.5 > configManager.get("syntax.decorationFileSizeLimit")) {
            return;
        }

        // Create the new task.
        this._tasks.set(document, new DecorationAnalysisTask(
            document,
            this._decorationWorkers,
            // No worry. `applyDecoration()` should recheck applicability.
            this._supportedClasses.filter(target => configManager.get(decorationClassConfigMap[target]) as boolean)
        ));
    }
}

export const decorationManager: IDecorationManager = new DecorationManager(decorationWorkerRegistry);
