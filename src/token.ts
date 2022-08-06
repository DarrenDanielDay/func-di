/**
 * `Token` is a declaration of a specific dependency.
 */
export interface Token<T> {
  readonly type: "di-token";
  readonly key: symbol;
  /**
   * The default implementation.
   */
  readonly default?: T;
}

export interface GeneralToken extends Token<unknown> {}

export type TokenType<T extends GeneralToken> = T extends Token<infer U> ? U : never;

export const token = <T extends unknown>(...args: [name: string, defaultImpl?: T]): Token<T> => {
  const [name, defaultImpl] = args;
  const impl: Pick<Token<T>, "default"> = args.length === 1 ? {} : { default: defaultImpl };
  const result: Token<T> = {
    type: "di-token",
    key: Symbol(name),
    ...impl,
  };
  return Object.freeze(result);
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
  Object.freeze({
    type: "di-impl",
    token,
    impl,
  });
