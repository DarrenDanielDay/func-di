import type { IoCContainer } from "./container.js";
import { injectable, type Injectable } from "./injectable.js";
import { freeze } from "./shared.js";

export type DynamicInjectDependency = {
  c: Token<IoCContainer>;
};

export const dynamicInjectable = <R extends unknown>(
  token: Token<R>,
  func: (this: IoCContainer, container: IoCContainer) => R,
  disposer?: (this: void, instance: R) => void
): Injectable<DynamicInjectDependency, R> =>
  injectable(token, { c: __FUNC_DI_CONTAINER__ }, ({ c }) => func.call(c, c), disposer);

/**
 * `Token` is a declaration of a specific dependency.
 */
export interface Token<T extends unknown> {
  readonly type: "di-token";
  readonly key: symbol;
  /**
   * The default implementation.
   */
  readonly default?: T;
  /**
   * @experimental
   */
  readonly implementAs: (
    factory: (this: IoCContainer, container: IoCContainer) => T,
    disposer?: (this: void, instance: T) => void
  ) => Injectable<DynamicInjectDependency, T>;
}

export interface GeneralToken extends Token<any> {}

export type TokenType<T extends GeneralToken> = T extends Token<infer U> ? U : never;

export const token = <T extends unknown>(...args: [name: string, defaultImpl?: T]): Token<T> => {
  const [name, defaultImpl] = args;
  const defaultImplProp: Pick<Token<T>, "default"> = args.length === 1 ? {} : { default: defaultImpl };
  const result: Token<T> = {
    type: "di-token",
    key: Symbol(name),
    ...defaultImplProp,
    implementAs: (factory, disposer) => dynamicInjectable(result, factory, disposer),
  };
  return freeze(result);
};

export const tokenName = (token: GeneralToken) => token.key.description!;

/**
 * `Implementation` contains a direct instance of a dependency.
 */
export interface Implementation<T> {
  readonly type: "di-impl";
  readonly token: Token<T>;
  readonly impl: T;
}

export const implementation = <T extends unknown>(token: Token<T>, impl: T): Implementation<T> =>
  freeze({
    type: "di-impl",
    token,
    impl,
  });

/**
 * @internal
 */
export const __FUNC_DI_CONTAINER__ = token<IoCContainer>("container");
