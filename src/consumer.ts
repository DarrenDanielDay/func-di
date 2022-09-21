import type { Dependencies, InjectionContext } from "./inject";
import { clone, freeze } from "./shared";

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
  readonly factory: (this: void, context: InjectionContext<D>) => R;
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
