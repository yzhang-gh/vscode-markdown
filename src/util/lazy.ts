export interface ILazy<T> {
    readonly isValueCreated: boolean;
    readonly value: T;
}

/**
 * @see {@link https://docs.microsoft.com/en-us/dotnet/framework/performance/lazy-initialization}
 */
export class Lazy<T> implements ILazy<T> {
    private readonly _factory: () => T;

    private _isValueCreated = false;

    private _value: T | null = null;

    public get isValueCreated(): boolean {
        return this._isValueCreated;
    }

    public get value(): T {
        if (!this._isValueCreated) {
            this._value = this._factory();
            this._isValueCreated = true;
        }

        return this._value!;
    }

    constructor(factory: () => T) {
        this._factory = factory;
    }
}
