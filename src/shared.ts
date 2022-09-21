/**
 * @internal
 */
declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      NODE_ENV: "production" | "development" | "test";
    }
  }
}

/**
 * @internal
 */
type Processer<Constraint = unknown> = <T extends Constraint>(input: T) => T;
/**
 * @internal
 */
const identity: Processer = (input) => input;
/**
 * @internal
 */
const shallowClone: Processer<{}> = (input) => ({ ...input });
/**
 * @internal
 */
export const freeze: Processer<{}> = process.env.NODE_ENV === "production" ? identity : Object.freeze;
/**
 * @internal
 */
export const clone: Processer<{}> = process.env.NODE_ENV === "production" ? identity : shallowClone;
