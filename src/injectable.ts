import type { IoCContainer } from "./container";
import type { Dependencies, InjectionContext } from "./inject";
import { clone, freeze } from "./shared";
import { Token, __FUNC_DI_CONTAINER__ } from "./token";

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
  freeze({
    type: "di-injectable",
    token,
    dependencies: freeze(clone(dependencies)),
    factory,
  });

export type DynamicInjectDependency = {
  c: Token<IoCContainer>;
};

export const dynamicInjectable = <R extends unknown>(
  token: Token<R>,
  func: (container: IoCContainer) => R
): Injectable<DynamicInjectDependency, R> => injectable(token, { c: __FUNC_DI_CONTAINER__ }, ({ c }) => func(c));

export const factory = <R extends unknown>(token: Token<R>, func: () => R): Injectable<{}, R> =>
  injectable(token, {}, func);
