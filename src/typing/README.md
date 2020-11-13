# Common type definitions

Type definitions used across the whole product.

These types are internal contracts that are not scoped to one specific module.

## Naming conventions

* Pascal Case: The file holds only one type, which is of the same name as the file, and is the default export.
* camel Case: The file holds multiple types.

## Usage

`index.d.ts` wraps all definitions, thus, you can easily write:

```typescript
import type * as typing from "./typing";
```
