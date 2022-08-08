# func-di

A functional, immutable, type safe and simple dependency injection library inspired by angular.

- [Why func-di](#why-func-di)
- [Installation](#installation)
- [Usage](#usage)
  - [TypeScript](#typescript)
  - [JavaScript](#javascript)
- [License](#license)

## Why func-di

- 0 dependency: extremely lightweight
- functional: no class and decorator
- immutable: stable dependency if you do not dynamically switch the whole ioc container
- type safe: good develop experience and static type checks

## Installation

For `Node.JS` tool chains:

```sh
npm install func-di # or other package manager
```

Or no tool chain:

```html
<script type="module">
  import { token, inject, container } from "https://unpkg.com/func-di"; // or other CDN URL
  // Support ES module out of the box
</script>
```

## Usage

See test cases for more details.

### TypeScript

```typescript
import { token, inject, factory, implementation, container, provide } from "func-di";
// 0. Define your dependency with interface/type:
interface ServiceA {
  foo(): number;
}

interface ServiceB {
  bar: string;
}
// 1. Define dependencies with interface/type:
const dependencyA = token<ServiceA>("ServiceA");
const dependencyB = token<ServiceB>("ServiceB");

// 2. Implement the dependencies:

// Implement a dependency factory without other dependency:
const serviceAImpl = factory(dependencyA, () => {
  return {
    foo() {
      return 111;
    },
  };
});
// Or implement a dependency factory with other injected dependency:
const serviceBImpl = inject({
  serviceA: dependencyA,
}).implements(dependencyB, ({ serviceA }) => {
  return {
    bar: serviceA.foo().toFixed(2),
  };
});
// Or implement a dependency with a direct instance:
const serviceBDirectImpl = implementation(dependencyB, { bar: "777" });

// 3. Create IOC container with service providers:

const iocContainer = container([
  // Use `stateful` if you want to cache the instance.
  // Use `stateless` if you want to create instance on every request.
  provide.stateful(serviceAImpl),
  provide.stateful(serviceBImpl),
]);

// 4. Get implementation from the container:
const serviceB = iocContainer.request(dependencyB);
console.log(serviceB.bar); // 111.00

// 5. You can create child containers to overwrite some dependency implementaions.

const childContainer = iocContainer.fork([provide.stateful(serviceBDirectImpl)]);

console.log(childContainer.request(dependencyB).bar); // 777
```

### JavaScript

If you are using `JavaScript` with `TypeScript` language service (using `vscode`, `Web Storm` or other editor and installed `func-di` via `Node.JS` tool chain), you can pass a default instance to `token` for type inference.

```javascript
// @ts-check
// ^^^^^^^^^ Use this directive to enable TypeScript checks in JavaScript code.
import { token, inject, factory, implementation, container, provide } from "func-di";
// 1. Define dependencies with default implementation. Types will be inferred automatically.
const dependencyA = token("ServiceA", {
  /**
   * Use type annotation in `JSDoc` comment for concrete types.
   * In this example, TypeScript will infer return type as `0` without this type annotation.
   * @returns {number}
   */
  foo() {
    return 0;
  },
});
const dependencyB = token("ServiceB", { bar: "" });

// The next steps are the same with the TypeScript example.
```

You can also annotate your dependency token with generic type `Token` in this way (not recommended, use TypeScript directly instead):

```javascript
// @ts-check
// ^^^^^^^^^ Use this directive to enable TypeScript checks in JavaScript code.
import { token, inject, factory, implementation, container, provide } from "func-di";
// 0. Define your dependency with interface/type:
/**
 * @typedef {{
 *  foo(): number;
 * }} ServiceA
 * @typedef {{
 *  bar: string;
 * }} ServiceB
 */
// 1. Define dependencies with `JSDoc` type annotation:
/** @type {import('func-di').Token<ServiceA>} */
const dependencyA = token("ServiceA");
/** @type {import('func-di').Token<ServiceB>} */
const dependencyB = token("ServiceB");

// The next steps are the same with the TypeScript example.
```

## License

```text
 __________________
< The MIT license! >
 ------------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```
