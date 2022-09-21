import { dynamicInjectable, factory } from "./injectable";
import { container, provide, provider } from "./container";
import { inject } from "./inject";
import { implementation, token } from "./token";
import { dynamicConsumer } from "./consumer";

interface ServiceA {
  foo(): number;
}

interface ServiceB {
  bar: string;
}
// Define a dependency with interface/type
const dependencyA = token<ServiceA>("ServiceA");
// With default implementation
const dependencyB = token<ServiceB>("ServiceB", { bar: "666" });
const serviceAImpl = factory(dependencyA, () => ({
  foo() {
    return 111;
  },
}));
const serviceBImpl = inject({
  serviceA: dependencyA,
}).implements(dependencyB, ({ serviceA }: { serviceA: ServiceA }) => {
  return {
    bar: serviceA.foo().toFixed(2),
  };
});
const serviceBDirectImpl = implementation(dependencyB, { bar: "777" });

describe("container.ts", () => {
  describe("container", () => {
    it("should be immutable", () => {
      const c = container();
      expect(Object.isFrozen(c)).toBe(true);
    });
  });
  describe("provider", () => {
    it("should be immutable", () => {
      const p = provider(serviceAImpl);
      expect(Object.isFrozen(p)).toBe(true);
    });
  });
  describe("ioc container methods", () => {
    describe("register", () => {
      it("should be immutable", () => {
        const c1 = container();
        const c2 = c1.register([]);
        expect(c1).not.toBe(c2);
      });
      it("should throw with duplicated token", () => {
        expect(() => {
          const c = container([provide.stateful(serviceAImpl)]);
          c.register([provide.stateful(serviceAImpl)]);
        }).toThrow(/already registered/i);
      });
    });
    describe("overrides", () => {
      it("should override provider", () => {
        const c = container([provide.stateful(serviceAImpl), provide.stateful(serviceBImpl)]);
        const nc = c.override([provide.stateful(serviceBDirectImpl)]);
        expect(nc.request(dependencyB).bar).toBe("777");
      });
    });
    describe("request", () => {
      it("should be lazy", () => {
        const c = container([provide.stateful(serviceBImpl), provide.stateful(serviceAImpl)]);
        const db1 = c.request(dependencyB);
        const db2 = c.request(dependencyB);
        expect(db1).toBe(db2);
        const da1 = c.request(dependencyA);
        const da2 = c.request(dependencyA);
        expect(da1).toBe(da2);
        expect(db1.bar).toBe("111.00");
      });
      it("should be idempotent", () => {
        const c = container([provide.stateless(serviceAImpl), provide.stateless(serviceBImpl)]);
        const da1 = c.request(dependencyA);
        const da2 = c.request(dependencyA);
        const db1 = c.request(dependencyB);
        const db2 = c.request(dependencyB);
        expect(da1).not.toBe(da2);
        expect(db1).not.toBe(db2);
        expect(db1).toStrictEqual(db2);
      });
      it("should use default implementation", () => {
        const c = container();
        expect(c.request(dependencyB)).toBe(dependencyB.default);
      });
      it("should throw when no implementation", () => {
        expect(() => {
          const c = container();
          c.request(dependencyA);
        }).toThrow(/Cannot find provider/i);
      });
      it("should use direct implementation", () => {
        const c = container([provide.stateful(serviceBDirectImpl)]);
        expect(c.request(dependencyB)).toBe(serviceBDirectImpl.impl);
      });
      it("should pass itself to dynamic consumer", () => {
        const c = container();
        const dynamicConsumer1 = dynamicConsumer((ioc) => {
          expect(ioc).toBe(c);
        });
        c.consume(dynamicConsumer1);
      });
      it("should pass itself to dynamic injectable", () => {
        const t = token("");
        const dynamicInjectable1 = dynamicInjectable(t, (ioc) => {
          expect(ioc).toBe(c);
        });
        const c = container([provide.stateful(dynamicInjectable1)]);
        c.request(t);
      });
    });
    describe("fork", () => {
      it("should request parent", () => {
        const parent = container([provide.stateful(serviceAImpl)]);
        const child = parent.fork([provide.stateful(serviceBImpl)]);
        const db = child.request(dependencyB);
        expect(db).toBeTruthy();
      });
    });
    describe("consume", () => {
      it("should consume directly", () => {
        const f = jest.fn(({ serviceA }: { serviceA: ServiceA }) => {
          return serviceA.foo();
        });
        const c = container([provide.stateful(serviceAImpl)]);
        c.consume(inject({ serviceA: dependencyA }).for(f));
        expect(f).toBeCalledTimes(1);
      });
    });
  });
});
