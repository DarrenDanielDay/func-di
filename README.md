# func-di

<div align="center">
  <img src="./logo.png" />
</div>

English | [简体中文](./README.zh-CN.md)

---

[![Auto Test CI](https://github.com/DarrenDanielDay/func-di/actions/workflows/test.yml/badge.svg)](https://github.com/DarrenDanielDay/func-di/actions/) [![Publish CI](https://github.com/DarrenDanielDay/func-di/actions/workflows/publish.yml/badge.svg)](https://github.com/DarrenDanielDay/func-di/actions/) [![npm version](https://badge.fury.io/js/func-di.svg)](https://badge.fury.io/js/func-di)

A functional, immutable, type safe and simple dependency injection library inspired by [`Angular`](https://angular.io/guide/dependency-injection).

- [Why func-di](#why-func-di)
- [Installation](#installation)
- [Usage](#usage)
  - [TypeScript](#typescript)
  - [JavaScript](#javascript)
  - [React Support](#react-support)
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
<!-- Use `importmap` to make alias for `func-di`, `react`, `react-dom` and thier dependencies. -->
<!-- You can choose any other CDN URL you'd like. -->
<script type="importmap">
  {
    "imports": {
      "func-di": "https://unpkg.com/func-di/dist/index.browser.esm.min.js",
      "func-di/react": "https://unpkg.com/func-di/dist/react.browser.esm.min.js",
      "func-di/hooks": "https://unpkg.com/func-di/dist/hooks.browser.esm.min.js",
      "react": "https://ga.jspm.io/npm:react@18.2.0/index.js",
      "react-dom/client": "https://ga.jspm.io/npm:react-dom@18.2.0/index.js",
      "process": "https://ga.jspm.io/npm:process@0.11.10/browser.js",
      "scheduler": "https://ga.jspm.io/npm:scheduler@0.23.0/index.js"
    }
  }
</script>
<script type="module">
  import { token, inject, container } from "func-di";
  import { useInjection } from "func-di/hooks";
  import { Inject, Provide, connectInjectionHooks } from "func-di/react";
  import React from "react";
  import ReactDOM from "react-dom/client";
  // Support ES module out of the box
</script>
```

> Tired of the `importmap` code? Try [es-modularize](https://github.com/DarrenDanielDay/es-modularize)!

If want to use React support in browser directly without `Node.JS` tool chain, add the above `importmap` code before all script elements in your HTML. Note that `importmap` is not currently supported in every modern browser (e.g. `FireFox`, `Safari`). You might need this tool: <https://github.com/guybedford/es-module-shims> for those browsers.

## Usage

See test cases for more details.

### TypeScript

```typescript
import { token, inject, factory, implementation, container, provide } from "func-di";
// 0. Define dependency types with interface/type:
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
// Inject as parameter of factory function:
const serviceBImpl = inject({
  serviceA: dependencyA,
}).implements(dependencyB, function ({ serviceA }) {
  // You can get the injected dependency via both parameter and `this` context.
  assert.strictEqual(this.serviceA, serviceA);
  return {
    bar: serviceA.foo().toFixed(2),
  };
},
// To define how to dispose the dependency instance and release resources, you can pass an optional function.
(instance) => {
  console.log('dispose instance of ServiceB:', instance.bar);
});
// Inject container itself as parameter of factory function:
const serviceBImpl2 = dependencyB.implementAs(function (ioc) {
  // You can get the IoC container instance via both parameter and `this` context.
  assert.strictEqual(this, ioc);
  // Functions on IoC container instances have nothing to do with `this` context.
  // It's OK to destruct to use them as variables.
  // Actually all functions of `func-di` have nothing to do with `this` context.
  const { request } = ioc;
  return {
    bar: request(dependencyA).foo().toFixed(2),
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

// 6. To release stateful instance, call `clear()`. To release all resources, call `dispose()`.
// Note that `dispose()` will also dispose its child containers.
// Clear instance cache. `stateful` providers will create new dependency instance when requested.
iocContainer.clear();     // output: dispose instance of ServiceB: 111.00
// Clear instance cache, registered dependency info and perform `dispose()` on its children.
iocContainer.dispose();   
// After calling `dispose()`, all calls of method on this container instance will result an error.
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
// 0. Define your dependency types with interface/type:
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

### React Support

You can use these `APIs` to connect `func-di` with `React` components. Use `Inject` to create consumer components and `Provide` to create provider components.

Using `Inject` does not create nested HOCs. Your render function and dependency injection will be executed within the same component's render logic.

Using `Provide` will create a nested component. It has only one `IoCContext.Provider` element inside and provides the corresponding container as `value`.

```tsx
// Relevant dependency declarations and implementations
import React from "react";
import ReactDOM from "react-dom/client";
import { Inject, Provide } from "func-di/react";
interface CountService {
  count: number;
}
interface MessageService {
  renderMessage(tag: string): React.ReactElement;
}
const countService = token<CountService>("count");
const rootCountImpl = implementation(countService, { count: 6 });
const messageService = token<MessageService>("message");
const msgImpl = inject({ countService }).implements(messageService, ({ countService }) => {
  return {
    renderMessage(tag) {
      return (
        <div>
          <span>{tag}</span>
          <span>{countService.count}</span>
        </div>
      );
    },
  };
});

// Create a consumer component
const CountMessage = Inject({ countService, messageService })
  .props<{ tag: string }>()
  .composed.fc(({ messageService, tag }) => messageService.renderMessage(tag));

// Create a provider component
const RootIoC = Provide([provide.stateful(rootCountImpl), provide.stateful(msgImpl)]).dependent();

// Use
ReactDOM.createRoot(document.querySelector("#root")!).render(
  <RootIoC>
    <CountMessage tag="foo" />
  </RootIoC>
);
```

#### hooks

> These APIs are still experimental and may be modified in the future.

You can also use these hooks directly inside react components to get injected dependencies. Like normal hooks, they must be executed within the execution context of the react component.

- `useContainer()`: get the IOC container
- `useContainerRequest(token)`: get the IOC container and request dependency
- `useInjection(token)`: get dependency within specific context

`useInjection` is recommended. Please don't forget to wrap your component with `connectInjectionHooks` to get the correct execution context.

```tsx
// Some of the same code as above has been omitted.
import { useInjection } from "func-di/hooks";
import { connectInjectionHooks } from "func-di/react";
const Component: React.FC = () => {
  const { count } = useInjection(countService);
  return (
    <div>
      <p>
        <span>injection</span>
        <span>{count}</span>
      </p>
    </div>
  );
};
const ConnectedComponent = connectInjectionHooks(Component);
ReactDOM.createRoot(document.querySelector("#another-root")).render(
  <RootIoC>
    <ConnectedComponent />
  </RootIoC>
);
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
