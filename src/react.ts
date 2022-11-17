import type * as React from "react";
import { createContext, useContext, memo, forwardRef, createElement, useMemo } from "react";
import { consumer } from "./consumer.js";
import { container, type GeneralProvider, type IoCContainer } from "./container.js";
import { runInContainerScope } from "./hooks.js";
import type { Dependencies, InjectionContext } from "./inject.js";
import { Token } from "./token.js";

/**
 * The core DI context object of react.
 * If you want to dynamically inject and request dependencies, use `Provider/Consumer` of the context directly.
 */
export const IoCContext = createContext(container());
if (process.env.NODE_ENV !== "production") {
  IoCContext.displayName = "IoCContext";
}

interface InjectClause {
  <D extends Dependencies>(this: void, dependencies: D): {
    /**
     * Define component property type.
     */
    props: PropsClause<InjectionContext<D>>;
  };
}
type PropsGuard<P extends {}> = Pick<React.FC<P>, "propTypes" | "defaultProps">;

interface PropsClause<C extends {}> {
  <Exposed extends {}>(this: void, propsGuards?: PropsGuard<Exposed>): {
    /**
     * Merge properties and injected context for the render function.
     */
    composed: ComponentClause<Exposed, Exposed & C>;
    /**
     * Make an object wrapping both properties and injected context.
     */
    separated: ComponentClause<Exposed, { props: Exposed; ctx: C }>;
    /**
     * Use custom selector as input of render function.
     */
    select: <Internal extends {}>(
      selector: (this: void, props: Exposed, ctx: C) => Internal
    ) => ComponentClause<Exposed, Internal>;
  };
}

interface ComponentClause<Exposed extends {}, Internal extends {}> {
  /**
   * Create component as {@link React.FC}.
   */
  fc: FunctionalComponentClause<Exposed, Internal>;
  /**
   * Create component as {@link React.forwardRef}.
   */
  forwardRef: ForwardRefClause<Exposed, Internal>;
}

interface FunctionalComponentClause<Exposed extends {}, Internal extends {}> {
  (this: void, fc: React.FC<Internal>): React.FC<Exposed>;
  /**
   * Wrap component with {@link React.memo}.
   */
  memo: (this: void, fc: React.FC<Internal>) => React.MemoExoticComponent<React.FC<Exposed>>;
}

interface ForwardRefClause<Exposed extends {}, Internal extends {}> {
  <T>(this: void, fn: React.ForwardRefRenderFunction<T, Internal>): ReturnType<typeof React.forwardRef<T, Exposed>>;
  /**
   * Wrap component with {@link React.memo}.
   */
  memo: <T>(
    this: void,
    fn: React.ForwardRefRenderFunction<T, Internal>
  ) => React.MemoExoticComponent<ReturnType<typeof React.forwardRef<T, Exposed>>>;
}

export const Inject: InjectClause = (() => {
  const injectClause = <D extends Dependencies>(dependencies: D) => {
    type Context = InjectionContext<D>;
    const renderFn = <Component>(factory: (ctx: Context) => Component) =>
      useContext(IoCContext).consume(consumer(dependencies, factory));
    const propsClause = <Exposed extends {}>(propGuards?: PropsGuard<Exposed>) => {
      const typed = propGuards
        ? <T extends React.ComponentType<any>>(component: T): T => Object.assign(component, propGuards)
        : <T extends React.ComponentType<any>>(component: T): T => component;
      const select = <Internal extends {}>(
        selector: (props: Exposed, ctx: Context) => Internal
      ): ComponentClause<Exposed, Internal> => {
        const functionalComponentClause = ((): FunctionalComponentClause<Exposed, Internal> => {
          const clause = (fc: React.FC<Internal>) =>
            typed((props: Exposed) => renderFn((ctx) => fc(selector(props, ctx))));
          clause.memo = (...args: Parameters<typeof clause>) => memo(clause(...args));
          return clause;
        })();
        const forwardRefClause = ((): ForwardRefClause<Exposed, Internal> => {
          const clause = <T>(fn: React.ForwardRefRenderFunction<T, Internal>) =>
            typed(forwardRef<T, Exposed>((props, ref) => renderFn((ctx) => fn(selector(props, ctx), ref))));
          clause.memo = <T>(...args: Parameters<typeof clause<T>>) => memo(clause(...args));
          return clause;
        })();
        return {
          fc: functionalComponentClause,
          forwardRef: forwardRefClause,
        };
      };
      return {
        composed: select((props, ctx) => ({ ...props, ...ctx })),
        separated: select((props, ctx) => ({ props, ctx })),
        select,
      };
    };
    return {
      props: propsClause,
    };
  };
  return injectClause;
})();

type WrapperComponent = React.FC<React.PropsWithChildren>;

type ProviderComponent = React.MemoExoticComponent<WrapperComponent>;

interface ProvideClause {
  (this: void, providers: GeneralProvider[]): ContainerStrategyClause;
}

interface ContainerStrategyClause {
  /**
   * Create wrapper component with custom container selector.
   */
  as: (
    this: void,
    selectContainer: (this: void, parent: IoCContainer, providers: GeneralProvider[]) => IoCContainer
  ) => ProviderComponent;
  /**
   * Create wrapper component with dependent container.
   */
  dependent: (this: void) => ProviderComponent;
  /**
   * Create wrapper component with forked child container.
   */
  fork: (this: void) => ProviderComponent;
  /**
   * Create wrapper component with container that overrides some implementations.
   */
  override: (this: void) => ProviderComponent;
}

export const Provide: ProvideClause = (() => {
  const provideClause = (providers: GeneralProvider[]): ContainerStrategyClause => {
    const as: ContainerStrategyClause["as"] = (selectContainer) => {
      const fc: WrapperComponent = ({
        children,
      }): React.FunctionComponentElement<React.ProviderProps<IoCContainer>> => {
        const ioc = useContext(IoCContext);
        return createElement(
          IoCContext.Provider,
          { value: useMemo(() => selectContainer(ioc, providers), [ioc]) },
          children
        );
      };
      return memo<WrapperComponent>(fc);
    };
    return {
      as,
      dependent: () => as((_, providers) => container(providers)),
      fork: () => as((parent, providers) => parent.fork(providers)),
      override: () => as((parent, providers) => parent.override(providers)),
    };
  };
  return provideClause;
})();

/**
 * Create a new component connectted with `useInjection` hook.
 * React components cannot work directly with `useInjection` hook.
 * This helper function wraps the execution context for the given component.
 *
 * @param component react functional component
 * @returns a wrapped component
 */
export const connectInjectionHooks = <P extends {}>(component: React.FC<P>): React.FC<P> =>
  Object.assign<React.FC<P>, PropsGuard<P>>(
    (...args) => runInContainerScope(useContext(IoCContext), () => component(...args)),
    component
  );

/**
 * Short for `React.useContext(IoCContext)`.
 */
export const useContainer = (): IoCContainer => useContext(IoCContext);

/**
 * Short for `React.useContext(IoCContext).request(token)`. 
 * @param token DI token
 * @returns implementation provided by container
 */
export const useContainerRequest = <T extends unknown>(token: Token<T>): T => useContext(IoCContext).request(token);
