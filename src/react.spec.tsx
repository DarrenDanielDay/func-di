/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import PropTypes from "prop-types";
import { connectInjectionHooks, Inject, Provide, useContainer, useContainerRequest } from "./react.js";
import { provide } from "./container.js";
import { implementation, token } from "./token.js";
import { inject } from "./inject.js";
import { render, screen } from "@testing-library/react";
import { useInjection } from "./hooks.js";

interface CountService {
  count: number;
}
interface MessageService {
  renderMessage(tag: string): React.ReactElement;
}
const countService = token<CountService>("count");
const rootCountImpl = implementation(countService, { count: 6 });
const messageService = token<MessageService>("message");
const msgImpl = inject({ countService }).implements(messageService, ({ countService }) => {
  return {
    renderMessage(tag) {
      return (
        <div>
          <span>{tag}</span>
          <span>{countService.count}</span>
        </div>
      );
    },
  };
});

const CountMessage = Inject({ countService, messageService })
  .props<{ tag: string }>()
  .composed.fc(({ messageService, tag }) => messageService.renderMessage(tag));

describe("React higher ordered component", () => {
  it("should retrieve injected service instance", () => {
    const RootIoC = Provide([provide.stateful(rootCountImpl), provide.stateful(msgImpl)]).dependent();
    const App: React.FC = () => (
      <RootIoC>
        <Father>
          <Child />
        </Father>
      </RootIoC>
    );
    const OverrideIoC = Provide([provide.stateful(implementation(countService, { count: 666 }))]).override();
    const Father = Inject({ cnt: countService })
      .props<React.PropsWithChildren>()
      .separated.fc(({ props: { children } }) => {
        return (
          <>
            <CountMessage tag="father"></CountMessage>
            <OverrideIoC>{children}</OverrideIoC>
          </>
        );
      });
    const Child: React.FC = () => {
      return <CountMessage tag="child"></CountMessage>;
    };
    render(<App />);
    const father = screen.getByText("father");
    const child = screen.getByText("child");
    expect(father.nextSibling).toHaveTextContent(`6`);
    expect(child.nextSibling).toHaveTextContent(`666`);
  });

  it("should be used like this", () => {
    interface Props {
      foo: string;
    }
    const ComposedFC = Inject({ countService })
      .props({
        propTypes: {
          foo: PropTypes.string.isRequired,
        },
      })
      .composed.fc.memo(({ countService, foo }) => {
        return (
          <div>
            <p>
              <span>{foo}</span>
              <span>{countService.count}</span>
            </p>
          </div>
        );
      });

    const SeparatedFC = Inject({ countService })
      .props<Props>()
      .separated.fc.memo(({ ctx, props }) => {
        return (
          <div>
            <p>
              <span>{props.foo}</span>
              <span>{ctx.countService.count}</span>
            </p>
          </div>
        );
      });

    const ComposedForwardRef = Inject({ countService })
      .props<Props>()
      .composed.forwardRef.memo<HTMLDivElement>(({ countService, foo }, ref) => {
        return (
          <div ref={ref}>
            <p>
              <span>{foo}</span>
              <span>{countService.count}</span>
            </p>
          </div>
        );
      });
    const SeparatedForwardRef = Inject({ countService })
      .props<Props>()
      .separated.forwardRef.memo<HTMLDivElement>(({ ctx, props }, ref) => {
        return (
          <div ref={ref}>
            <p>
              <span>{props.foo}</span>
              <span>{ctx.countService.count}</span>
            </p>
          </div>
        );
      });
    const RootProvider = Provide([provide.stateful(implementation(countService, { count: 0 }))]).fork();
    render(
      <RootProvider>
        <ComposedFC foo="composed-fc" />
        <SeparatedFC foo="separated-fc" />
        <ComposedForwardRef foo="composed-forward-ref" />
        <SeparatedForwardRef foo="separated-forward-ref" />
      </RootProvider>
    );

    expect(screen.getByText("composed-fc").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("separated-fc").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("composed-forward-ref").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("separated-forward-ref").nextElementSibling).toHaveTextContent("0");
  });
});

describe("React hooks", () => {
  describe("connectInjectionHooks", () => {
    it("should connect `useInjection` hooks", () => {
      const Component: React.FC<{ foo: number }> = ({ foo }) => {
        const { count } = useInjection(countService);
        return (
          <div>
            <p>
              <span>prop</span>
              <span>{foo}</span>
            </p>
            <p>
              <span>injection</span>
              <span>{count}</span>
            </p>
          </div>
        );
      };
      const ConnectedComponent = connectInjectionHooks(Component);
      const RootProvider = Provide([provide.stateful(rootCountImpl)]).override();
      render(
        <RootProvider>
          <ConnectedComponent foo={666} />
        </RootProvider>
      );
      expect(screen.getByText("prop").nextElementSibling).toHaveTextContent("666");
      expect(screen.getByText("injection").nextElementSibling).toHaveTextContent("6");
    });

    it("should preserve `displayName` and other info", () => {
      const Component: React.FC = () => null;
      Component.displayName = "Component";
      Component.propTypes = {};
      const connected = connectInjectionHooks(Component);
      expect(connected.propTypes).toStrictEqual({});
      expect(connected.displayName).toBe("Component");
    });
  });
  describe("useContainer", () => {
    it("should return container", () => {
      const Component = () => {
        const c = useContainer();
        expect(typeof c.request).toBe("function");
        return null;
      };
      render(<Component />);
    });
  });
  describe("useContainerRequest", () => {
    it("should request dependency", () => {
      const Component = () => {
        const c = useContainerRequest(countService);
        expect(c).toStrictEqual({ count: 6 });
        return null;
      };
      const RootProvider = Provide([provide.stateful(rootCountImpl)]).override();
      render(
        <RootProvider>
          <Component />
        </RootProvider>
      );
    });
  });
});
