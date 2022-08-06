import type { Dependencies, InjectionContext } from "./inject";
import type { Token } from "./token";

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
  readonly factory: (this: void, context: InjectionContext<D>) => R;
}

export const injectable = <D extends Dependencies, R>(
  token: Token<R>,
  dependencies: D,
  factory: Injectable<D, R>["factory"]
): Injectable<D, R> =>
  Object.freeze({
    type: "di-injectable",
    token,
    dependencies: Object.freeze({ ...dependencies }),
    factory,
  });

export const factory = <R extends unknown>(token: Token<R>, func: () => R): Injectable<{}, R> =>
  injectable(token, {}, func);
