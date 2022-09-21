import type { Injectable } from "./injectable";
import { consumer, type Consumer } from "./consumer";
import type { Dependencies } from "./inject";
import { type Implementation, type Token, tokenName, __FUNC_DI_CONTAINER__ } from "./token";
import { freeze } from "./shared";

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
export const provider = <T extends unknown>(solution: Solution<T>, strategy: ResolveStrategy = ResolveStrategy.Stateful): Provider<T> =>
  freeze({
    type: "di-provider",
    solution,
    strategy,
  });

export const provide = freeze({
  stateful: <T extends unknown>(solution: Solution<T>): Provider<T> => provider(solution, ResolveStrategy.Stateful),
  stateless: <T extends unknown>(solution: GeneralInjectable<T>): Provider<T> => provider(solution, ResolveStrategy.Stateless),
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
const closure = (keyedProviders: KeyedProviders, parent?: IoCContainer): IoCContainer => {
  const register = (providers: GeneralProvider[]) => {
    const cloned = cloneProviders(keyedProviders);
    registerProviders(providers, cloned);
    return closure(cloned, parent);
  };
  const override = (providers: GeneralProvider[]) => {
    const cloned = cloneProviders(keyedProviders);
    registerProviders(providers, cloned, true);
    return closure(cloned, parent)
  }
  const fork = (providers?: GeneralProvider[]) => closure(newProviders(providers), containerInstance);
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
    return factory(context);
  };
  const containerInstance: IoCContainer = {
    register,
    override,
    fork,
    request,
    consume,
  };
  return freeze(containerInstance);
};

export const container = (providers?: GeneralProvider[]): IoCContainer => closure(newProviders(providers));
