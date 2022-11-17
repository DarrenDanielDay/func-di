import { IoCContainer } from "./container.js";
import type { Dependencies, InjectionContext } from "./inject.js";
import { clone, freeze } from "./shared.js";
import { type DynamicInjectDependency, __FUNC_DI_CONTAINER__ } from "./token.js";

/**
 * `Consumer` is someone who just consume the dependencies.
 * `Consumer` instances are not managed by DI.
 * `Consumer` is also the end user of DI.
 */
export interface Consumer<D extends Dependencies, R> {
  readonly type: "di-consumer";
  readonly dependencies: D;
  /**
   * Instance factory.
   */
  readonly factory: (this: InjectionContext<D>, context: InjectionContext<D>) => R;
}

/**
 * Create a consumer with dependencies.
 * @param dependencies the dependencies
 * @param factory the instance factory function
 * @returns Consumer
 */
export const consumer = <D extends Dependencies, R>(
  dependencies: D,
  factory: Consumer<D, R>["factory"]
): Consumer<D, R> =>
  freeze({
    type: "di-consumer",
    dependencies: freeze(clone(dependencies)),
    factory,
  });

export const dynamicConsumer = <R extends unknown>(factory: (container: IoCContainer) => R) =>
  consumer<DynamicInjectDependency, R>({ c: __FUNC_DI_CONTAINER__ }, ({ c }) => factory(c));
