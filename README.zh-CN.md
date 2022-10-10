# func-di

![logo.png](./logo.png)

[English](./README.md) | 简体中文

---

[![Auto Test CI](https://github.com/DarrenDanielDay/func-di/actions/workflows/test.yml/badge.svg)](https://github.com/DarrenDanielDay/func-di/actions/) [![Publish CI](https://github.com/DarrenDanielDay/func-di/actions/workflows/publish.yml/badge.svg)](https://github.com/DarrenDanielDay/func-di/actions/) [![npm version](https://badge.fury.io/js/func-di.svg)](https://badge.fury.io/js/func-di)

一个受 [`Angular`](https://angular.cn/guide/dependency-injection) 启发的函数式、不可变、类型安全且简单的依赖注入库。

- [为什么选择 func-di](#为什么选择-func-di)
- [安装](#安装)
- [用法](#用法)
  - [TypeScript](#typescript)
  - [JavaScript](#javascript)
  - [React 支持](#react-支持)
    - [hooks](#hooks)
- [许可证](#许可证)

## 为什么选择 func-di

- 零依赖：非常轻量级
- 函数式：没有类和装饰器
- 不可变：稳定依赖，除非动态切换整个容器
- 类型安全：更好的开发体验和静态类型检查

## 安装

对于`Node.JS`的工具链：

```sh
npm install func-di # 或者其他包管理器
```

或者没有工具链：

```html
<!-- 使用 import map 为 `react` 创建别名 -->
<script type="importmap">
  {
    "imports": {
      "react": "https://unpkg.com/es-react"
    }
  }
</script>
<script type="module">
  import { token, inject, container } from "https://unpkg.com/func-di/dist/func-di.browser.esm.min.js"; // 或者其他CDN链接
  // 开箱即用的ES Module支持
</script>
```

如果想直接在浏览器中使用 React 支持而不使用 `Node.JS` 工具链，请在 HTML 中的所有脚本元素之前添加以上代码。 请注意，目前并非所有现代浏览器都支持`<script type="importmap">`（例如`FireFox`、`Safari`）。 对于这些浏览器，您可能需要此工具：<https://github.com/guybedford/es-module-shims>。

## 用法

有关详细信息，请参阅测试用例。

### TypeScript

```typescript
import { token, inject, factory, implementation, container, provide } from "func-di";
// 0. 使用interface/type定义依赖类型：
interface ServiceA {
  foo(): number;
}

interface ServiceB {
  bar: string;
}
// 1. 使用interface/type定义依赖项：
const dependencyA = token<ServiceA>("ServiceA");
const dependencyB = token<ServiceB>("ServiceB");

// 2. 实现依赖

// 实现一个没有其他依赖的依赖工厂：
const serviceAImpl = factory(dependencyA, () => {
  return {
    foo() {
      return 111;
    },
  };
});
// 或者使用其他注入的依赖项实现依赖项工厂：
// 注入依赖作为工厂函数的入参：
const serviceBImpl = inject({
  serviceA: dependencyA,
}).implements(dependencyB, function ({ serviceA }) {
  // 你可以通过参数或者this上下文来获取被注入的依赖。
  assert.strictEqual(this.serviceA, serviceA);
  return {
    bar: serviceA.foo().toFixed(2),
  };
});
// 注入整个容器自身作为入参：
const serviceBImpl2 = dependencyB.implementAs(function (ioc) {
  // 你可以通过参数或者`this`上下文来获取IoC容器实例。
  assert.strictEqual(this, ioc);
  // IoC容器上的函数与`this`上下文无关。
  // 将他们解构成变量使用是可以的。
  // 事实上`func-di`中的所有函数都是与`this`上下文无关的函数。
  const { request } = ioc;
  return {
    bar: request(dependencyA).foo().toFixed(2),
  };
});
// 或者用直接的实例实现
const serviceBDirectImpl = implementation(dependencyB, { bar: "777" });

// 3. 创建包含了服务提供者的IOC容器

const iocContainer = container([
  // 当您希望缓存实例时，请使用`stateful`。
  // 当您希望在每次请求依赖时进行实例化时，请使用`stateless`。
  provide.stateful(serviceAImpl),
  provide.stateful(serviceBImpl),
]);

// 4. 从容器中获取依赖的实现：
const serviceB = iocContainer.request(dependencyB);
console.log(serviceB.bar); // 111.00

// 5. 您可以创建子容器来覆盖一些依赖的实现。

const childContainer = iocContainer.fork([provide.stateful(serviceBDirectImpl)]);

console.log(childContainer.request(dependencyB).bar); // 777
```

### JavaScript

如果您使用 `JavaScript` 和 `TypeScript` 语言服务（使用 `vscode`、`Web Storm` 或其他编辑器并通过 `Node.JS` 工具链安装 `func-di`），您可以将默认实例传递给 `token` 用于类型推断。

```javascript
// @ts-check
// ^^^^^^^^^ 使用此指令在 JavaScript 代码中启用 TypeScript 检查。
import { token, inject, factory, implementation, container, provide } from "func-di";
// 1. 使用默认实现定义依赖项。 类型将被自动推断。
const dependencyA = token("ServiceA", {
  /**
   * 在 `JSDoc` 注释中为具体类型使用类型注释。
   * 在此示例中，TypeScript 将在没有此类型注释的情况下将返回类型推断为 `0`。
   * @returns {number}
   */
  foo() {
    return 0;
  },
});
const dependencyB = token("ServiceB", { bar: "" });

// 接下来的步骤与 TypeScript 示例相同。
```

您也可以通过这种方式用泛型类型 `Token` 来注释你的依赖标记（不推荐，请直接使用 TypeScript）

```javascript
// @ts-check
// ^^^^^^^^^ 使用此指令在 JavaScript 代码中启用 TypeScript 检查。
import { token, inject, factory, implementation, container, provide } from "func-di";
// 0. 使用interface/type定义依赖类型：
/**
 * @typedef {{
 *  foo(): number;
 * }} ServiceA
 * @typedef {{
 *  bar: string;
 * }} ServiceB
 */
// 1. 使用 `JSDoc` 类型注释定义依赖项：
/** @type {import('func-di').Token<ServiceA>} */
const dependencyA = token("ServiceA");
/** @type {import('func-di').Token<ServiceB>} */
const dependencyB = token("ServiceB");

// 接下来的步骤与 TypeScript 示例相同。
```

### React 支持

您可以用这些`API`将`func-di`与`React`组件连接起来。使用`Inject`创建消费者组件，使用`Provide`创建提供者组件。

使用`Inject`并不会创建嵌套的高阶组件。您的渲染函数与依赖注入将在同一个组件的渲染逻辑内执行。

使用`Provide`将会创建一个嵌套组件。它的内部只有一个`IoCContext.Provider`元素，并提供了相应的容器作为`value`。

```tsx
// 相关的依赖声明与实现
import React from "react";
import ReactDOM from "react-dom/client";
import { Inject, Provide } from "func-di";
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

// 创建消费者组件
const CountMessage = Inject({ countService, messageService })
  .props<{ tag: string }>()
  .composed.fc(({ messageService, tag }) => messageService.renderMessage(tag));

// 创建提供者组件
const RootIoC = Provide([provide.stateful(rootCountImpl), provide.stateful(msgImpl)]).dependent();

// 使用
ReactDOM.createRoot(document.querySelector("#root")!).render(
  <RootIoC>
    <CountMessage tag="foo" />
  </RootIoC>
);
```

#### hooks

> 这些 API 仍然是实验性的，并可能在未来被修改。

您也可以在 react 组件内直接使用这些 hooks 来获取注入的依赖项。他们和普通的 hooks 一样，必须在 react 组件的执行上下文内执行。

- `useContainer()`：获取容器
- `useContainerRequest(token)`：获取容器并获取依赖项
- `useInjection(token)`：在特定上下文内，获取依赖项

推荐使用`useInjection`。请不要忘记使用`connectInjectionHooks`包裹您的组件，以获取正确的执行上下文。

```tsx
// 部分与上文相同的代码已被省略。
import { useInjection, connectInjectionHooks } from "func-di";
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

## 许可证

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
