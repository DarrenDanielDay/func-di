import { injectable, type Injectable } from "./injectable.js";
import { consumer, type Consumer } from "./consumer.js";
import type { GeneralToken, Token, TokenType } from "./token.js";
import { clone, freeze } from "./shared.js";

export interface Dependencies {
  readonly [key: string]: GeneralToken;
}

export type InjectionContext<D extends Dependencies> = {
  readonly [K in keyof D]: TokenType<D[K]>;
};

export interface Injector<D extends Dependencies> {
  readonly type: "di-injection";
  readonly dependencies: D;
  /**
   * Add some dependencies and generate a new `Injector`.
   */
  readonly with: <E extends Dependencies>(this: void, dependencies: E) => Injector<MergedDependencies<D, E>>;
  /**
   * Create an injectable based on the dependencies.
   */
  readonly implements: <R extends unknown>(
    this: void,
    token: Token<R>,
    factory: Injectable<D, R>["factory"],
    disposer?: (this: void, instance: R) => void
  ) => Injectable<D, R>;
  /**
   * Create a consumer based on the dependencies.
   */
  readonly for: <R extends unknown>(this: void, factory: Consumer<D, R>["factory"]) => Consumer<D, R>;
}

type MergedDependencies<D extends Dependencies, AddOn extends Dependencies> = {
  [K in keyof D | keyof AddOn]: K extends keyof AddOn ? AddOn[K] : K extends keyof D ? D[K] : never;
};

export const inject = <D extends Dependencies>(dependencies: D): Injector<D> =>
  freeze({
    type: "di-injection",
    dependencies: freeze(clone(dependencies)),
    with: <AddOn extends Dependencies>(newMapping: AddOn): Injector<MergedDependencies<D, AddOn>> =>
      // @ts-expect-error Dynamic Implementation
      inject({
        ...dependencies,
        ...newMapping,
      }),
    for: <R extends unknown>(factory: Consumer<D, R>["factory"]) => consumer(dependencies, factory),
    implements: <R extends unknown>(
      token: Token<R>,
      factory: (this: InjectionContext<D>, context: InjectionContext<D>) => R,
      disposer?: (this: void, instance: R) => void
    ) => injectable(token, dependencies, factory, disposer),
  });
