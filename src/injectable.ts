import type { Dependencies, InjectionContext } from "./inject.js";
import { clone, freeze } from "./shared.js";
import type { Token } from "./token.js";

/**
 * `Injectable` is someone who asks for dependencies and implements something.
 */
export interface Injectable<D extends Dependencies, R> {
  readonly type: "di-injectable";
  readonly token: Token<R>;
  readonly dependencies: D;
  /**
   * Instance factory.
   */
  readonly factory: (this: InjectionContext<D>, context: InjectionContext<D>) => R;
  /**
   * Define the way of disposing instance.
   */
  readonly disposer?: (this: void, instance: R) => void; 
}

export const injectable = <D extends Dependencies, R>(
  token: Token<R>,
  dependencies: D,
  factory: Injectable<D, R>["factory"],
  disposer?: (this: void, instance: R) => void
): Injectable<D, R> =>
  freeze({
    type: "di-injectable",
    token,
    dependencies: freeze(clone(dependencies)),
    factory,
    disposer,
  });

export const factory = <R extends unknown>(token: Token<R>, func: () => R, disposer?: (instance: R) => void): Injectable<{}, R> =>
  injectable(token, {}, func, disposer);
