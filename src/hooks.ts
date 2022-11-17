import type { IoCContainer } from "./container.js";
import type { Token } from "./token.js";

const containerScopes: IoCContainer[] = [];

export const resolveContainer = (): IoCContainer | undefined => containerScopes[containerScopes.length - 1];

export const registerContainer = (container: IoCContainer): number => containerScopes.push(container);

export const revokeContainer = () => containerScopes.pop();

export const useInjection = <T extends unknown>(token: Token<T>): T => {
  const currentContainer = resolveContainer();
  if (!currentContainer) {
    throw new Error("Cannot resolve current container.");
  }
  return currentContainer.request(token);
};

export const runInContainerScope = <R extends unknown>(container: IoCContainer, syncFactory: () => R): R => {
  registerContainer(container);
  const result = syncFactory();
  revokeContainer();
  return result;
};
