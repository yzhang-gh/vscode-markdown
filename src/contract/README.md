# Top-level contracts and constants

## Conventions

### General

Very few things are allowed to be under this directory. They are not scoped to a few specific modules, instead, must be globally recognized and used across the whole product, and well-known outside our codebase.

Currently, here are:

* Well-known constants.
* Public API definitions, aka public contracts.

### Naming

* The name of files, types, enum members, constants must match the [StrictPascalCase](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/naming-convention.md#format) format.
* Names here are globally uniquely recognized, that is, once a name is assigned to a type here, no other identifier can have the same name in our codebase.
* If a file holds only one type, then it may only provide the [default export](https://www.typescriptlang.org/docs/handbook/modules.html#default-exports), and the type must be of the same name as the file.
* If a file holds multiple types, then the types must be under the same topic, which is the file name.

### Organization

* Each file must be a module.
* Only the following are allowed:
  * [Const enum](https://www.typescriptlang.org/docs/handbook/enums.html#const-enums).
  * [Interface](https://www.typescriptlang.org/docs/handbook/interfaces.html).
  * [Literal](https://www.typescriptlang.org/docs/handbook/literal-types.html).
  * [Type alias](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-aliases).
* Sort in alphabetical order whenever possible.
