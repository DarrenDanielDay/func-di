import type { Injectable } from "./injectable.js";
import { consumer, type Consumer } from "./consumer.js";
import type { Dependencies } from "./inject.js";
import { type Implementation, type Token, type GeneralToken, tokenName, __FUNC_DI_CONTAINER__ } from "./token.js";
import { freeze } from "./shared.js";

export enum ResolveStrategy {
  /**
   * Create when requested, singleton in the container.
   */
  Stateful = "stateful",
  /**
   * Always create new instance when requested.
   */
  Stateless = "stateless",
}
freeze(ResolveStrategy);
/**
 * Typed depencencies as `any` for contravariance.
 */
interface GeneralConsumer<R = unknown> extends Consumer<any, R> {}
/**
 * Typed depencencies as `any` for contravariance.
 */
interface GeneralInjectable<T = unknown> extends Injectable<any, T> {}
export interface IoCContainer {
  /**
   * Create a **NEW** container based on and the given providers.
   * No dynamic providers can be registered.
   * You must switch to a new container if you want to add any dependency providers.
   */
  readonly register: (this: void, providers: GeneralProvider[]) => IoCContainer;
  /**
   * Create a **NEW** container with providers overrides.
   * No dynamic providers can be registered.
   * You must switch to a new container if you want to add any dependency providers.
   */
  readonly override: (this: void, providers: GeneralProvider[]) => IoCContainer;
  /**
   * Create a child container with this container as parent.
   */
  readonly fork: (this: void, providers?: GeneralProvider[]) => IoCContainer;
  /**
   * Request a dependency from the container.
   */
  readonly request: <T extends unknown>(this: void, token: Token<T>) => T;
  /**
   * Request dependencies of a `Consumer` and return its instance.
   */
  readonly consume: <R extends unknown>(this: void, consumer: GeneralConsumer<R>) => R;
  /**
   * Clear the instance caches and invoke `disposer` for injectable if present.
   */
  readonly clear: (this: void) => void;
  /**
   * Dispose the container and release its resources.
   * When a container is disposed, it cannot handle dependency request any longer,
   * that is, invoke `clear()` and mark itself as `disposed`.
   */
  readonly dispose: (this: void) => void;
}

export type Solution<T> = Implementation<T> | GeneralInjectable<T>;
export type GeneralSolution = Solution<unknown>;
export interface Provider<T> {
  readonly type: "di-provider";
  readonly solution: Solution<T>;
  readonly strategy: ResolveStrategy;
}
/**
 * Typed depencencies as `any` for contravariance.
 */
export interface GeneralProvider extends Provider<any> {}
export const provider = <T extends unknown>(
  solution: Solution<T>,
  strategy: ResolveStrategy = ResolveStrategy.Stateful
): Provider<T> =>
  freeze({
    type: "di-provider",
    solution,
    strategy,
  });

export const provide = freeze({
  stateful: <T extends unknown>(solution: Solution<T>): Provider<T> => provider(solution, ResolveStrategy.Stateful),
  stateless: <T extends unknown>(solution: GeneralInjectable<T>): Provider<T> =>
    provider(solution, ResolveStrategy.Stateless),
});

/**
 * @internal
 */
type KeyedProviders = Map<symbol, GeneralProvider>;
/**
 * @internal
 */
const cloneProviders = (providers: KeyedProviders): KeyedProviders => new Map(providers);
/**
 * @internal
 */
const emptyProviers = (): KeyedProviders => new Map();
/**
 * @internal
 */
const registerProviders = (providers: GeneralProvider[], keyedProviders: KeyedProviders, allowOverrides?: boolean) => {
  for (const provider of providers) {
    const { solution } = provider;
    const { token } = solution;
    if (keyedProviders.has(token.key) && !allowOverrides) {
      throw new Error(`Token ${tokenName(token)} already registered.`);
    }
    keyedProviders.set(token.key, provider);
  }
  return keyedProviders;
};
/**
 * @internal
 */
const newProviders = (providers: GeneralProvider[] | undefined): KeyedProviders =>
  registerProviders(providers ?? [], emptyProviers());

/**
 * @internal
 */
const circularDepsCheck = (keyedProviders: KeyedProviders) => {
  const seen = new Set<symbol>();
  const passing = new Set<symbol>();
  const path: GeneralToken[] = [];
  const dfs = ({ solution }: GeneralProvider) => {
    const token = solution.token;
    const { key } = token;
    if (seen.has(key)) {
      return;
    }
    path.push(token);
    if (passing.has(key)) {
      throw new Error(`Circular dependency detected: ${path.map((node) => `[${tokenName(node)}]`).join(" -> ")}`);
    }
    if (solution.type === "di-injectable") {
      passing.add(key);
      const dependencies: Dependencies = solution.dependencies;
      for (const { key: dependencyKey } of Object.values(dependencies)) {
        const dependencyProvider = keyedProviders.get(dependencyKey);
        if (dependencyProvider) {
          dfs(dependencyProvider);
        }
      }
      passing.delete(key);
    }
    path.pop();
    seen.add(key);
  };
  for (const key of keyedProviders.values()) {
    passing.clear();
    dfs(key);
  }
};

/**
 * @internal
 */
const closure = (
  keyedProviders: KeyedProviders,
  parent?: IoCContainer,
  notifyDisposed?: (self: IoCContainer) => {}
): IoCContainer => {
  circularDepsCheck(keyedProviders);
  const register = (providers: GeneralProvider[]) => {
    const cloned = cloneProviders(keyedProviders);
    registerProviders(providers, cloned);
    return closure(cloned, parent, childCleaner);
  };
  const override = (providers: GeneralProvider[]) => {
    const cloned = cloneProviders(keyedProviders);
    registerProviders(providers, cloned, true);
    return closure(cloned, parent, childCleaner);
  };
  const children = new Set<IoCContainer>();
  const childCleaner = (child: IoCContainer) => children.delete(child);
  const asChild = (ioc: IoCContainer) => (children.add(ioc), ioc);
  const fork = (providers?: GeneralProvider[]) =>
    asChild(closure(newProviders(providers), containerInstance, childCleaner));
  const requestCache = new Map<symbol, unknown>();
  const request = <T extends unknown>(token: Token<T>): T => {
    if (token.key === __FUNC_DI_CONTAINER__.key) {
      // @ts-expect-error Dynamic Implementation
      return containerInstance;
    }
    // @ts-expect-error Not type safe, but ensured type safe in user code because of immutability.
    const provider: Provider<T> = keyedProviders.get(token.key);
    if (!provider) {
      if (parent) {
        try {
          return parent.request(token);
        } catch {
          // noop
        }
      }
      if (Reflect.has(token, "default")) {
        return token.default!;
      }
      throw new Error(`Cannot find provider for ${tokenName(token)}`);
    }
    const { solution, strategy } = provider;
    if (strategy === ResolveStrategy.Stateful) {
      if (requestCache.has(token.key)) {
        // @ts-expect-error Not type safe, but ensured type safe in user code because of immutability.
        return requestCache.get(token.key)!;
      }
    }
    if (solution.type === "di-impl") {
      return solution.impl;
    }
    const { dependencies, factory } = solution;
    const dependencyInstance = consume(consumer(dependencies, factory));
    if (strategy === ResolveStrategy.Stateful) {
      requestCache.set(solution.token.key, dependencyInstance);
    }
    return dependencyInstance;
  };
  const consume = <R extends unknown>(consumer: GeneralConsumer<R>) => {
    const { dependencies, factory } = consumer;
    const context: Dependencies = freeze(
      // @ts-expect-error Dynamic Implementation
      Object.fromEntries(Object.entries(dependencies).map(([name, dependency]) => [name, request(dependency)]))
    );
    return factory.call(context, context);
  };
  const clear = () => {
    for (const [, provider] of keyedProviders) {
      const { solution, strategy } = provider;
      if (solution.type === "di-injectable" && strategy === ResolveStrategy.Stateful) {
        const {
          token: { key },
          disposer,
        } = solution;
        if (requestCache.has(key)) {
          try {
            disposer?.call(void 0, requestCache.get(key));
            requestCache.delete(key);
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
  };
  let disposed = false;
  const disposedChecked =
    <F extends (...args: any[]) => any>(fn: F): F =>
    // @ts-expect-error Dynamic Implementation
    (...args: Parameters<F>): ReturnType<F> => {
      if (disposed) {
        throw new Error("The container has been disposed.");
      }
      return fn(...args);
    };
  const dispose = () => {
    clear();
    keyedProviders.clear();
    for (const child of children) {
      child.dispose();
    }
    disposed = true;
    notifyDisposed?.(containerInstance);
  };
  const containerInstance: IoCContainer = {
    register: disposedChecked(register),
    override: disposedChecked(override),
    fork: disposedChecked(fork),
    request: disposedChecked(request),
    consume: disposedChecked(consume),
    clear: disposedChecked(clear),
    dispose: disposedChecked(dispose),
  };
  return freeze(containerInstance);
};

export const container = (providers?: GeneralProvider[]): IoCContainer => closure(newProviders(providers));
