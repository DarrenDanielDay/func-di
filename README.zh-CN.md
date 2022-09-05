# func-di

[English](./README.md) | 简体中文

---

[![Auto Test CI](https://github.com/DarrenDanielDay/func-di/actions/workflows/test.yml/badge.svg)](https://github.com/DarrenDanielDay/func-di/actions/) [![Publish CI](https://github.com/DarrenDanielDay/func-di/actions/workflows/publish.yml/badge.svg)](https://github.com/DarrenDanielDay/func-di/actions/) [![npm version](https://badge.fury.io/js/func-di.svg)](https://badge.fury.io/js/func-di)

一个受 [`Angular`](https://angular.cn/guide/dependency-injection) 启发的函数式、不可变、类型安全且简单的依赖注入库。

- [为什么选择 func-di](#为什么选择func-di)
- [安装](#安装)
- [用法](#用法)
  - [TypeScript](#typescript)
  - [JavaScript](#javascript)
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
<script type="module">
  import { token, inject, container } from "https://unpkg.com/func-di"; // 或者其他CDN链接
  // 开箱即用的ES Module支持
</script>
```

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
const serviceBImpl = inject({
  serviceA: dependencyA,
}).implements(dependencyB, ({ serviceA }) => {
  return {
    bar: serviceA.foo().toFixed(2),
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