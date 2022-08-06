import { injectable, type Injectable } from "./injectable";
import { consumer, type Consumer } from "./consumer";
import type { GeneralToken, Token, TokenType } from "./token";

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
  readonly implements: <R>(this: void, token: Token<R>, factory: Injectable<D, R>["factory"]) => Injectable<D, R>;
  /**
   * Create a consumer based on the dependencies.
   */
  readonly for: <R>(this: void, factory: Consumer<D, R>["factory"]) => Consumer<D, R>;
}

type MergedDependencies<D extends Dependencies, AddOn extends Dependencies> = {
  [K in keyof D | keyof AddOn]: K extends keyof AddOn ? AddOn[K] : K extends keyof D ? D[K] : never;
};

export const inject = <D extends Dependencies>(dependencies: D): Injector<D> =>
  Object.freeze({
    type: "di-injection",
    dependencies: Object.freeze({ ...dependencies }),
    with: <AddOn extends Dependencies>(newMapping: AddOn): Injector<MergedDependencies<D, AddOn>> =>
      // @ts-expect-error Dynamic Implementation
      inject({
        ...dependencies,
        ...newMapping,
      }),
    for: <R>(factory: Consumer<D, R>["factory"]) => consumer(dependencies, factory),
    implements: <R>(token: Token<R>, factory: (context: InjectionContext<D>) => R) =>
      injectable(token, dependencies, factory),
  });
