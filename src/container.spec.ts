
import { factory } from "./injectable.js";
import { container, provide, provider } from "./container.js";
import { inject } from "./inject.js";
import { dynamicInjectable, implementation, token } from "./token.js";
import { consumer, dynamicConsumer } from "./consumer.js";

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
const aDisposer = import.meta.jest.fn<void, [a: ServiceA]>(() => {});
const bDisposer = import.meta.jest.fn<void, [b: ServiceB]>(() => {});
describe("container.ts", () => {
  describe("container", () => {
    it("should be immutable", () => {
      const c = container();
      expect(Object.isFrozen(c)).toBe(true);
    });
    it("should detect circular dependency", () => {
      const ia = inject({ dependencyA }).implements(dependencyB, () => serviceBDirectImpl.impl);
      const ib = inject({ dependencyB }).implements(dependencyA, () => ({
        foo() {
          return 1;
        },
      }));
      expect(() => {
        container([provide.stateless(ia), provide.stateless(ib)]);
      }).toThrow(/\[ServiceB\] -> \[ServiceA\] -> \[ServiceB\]/i);
    });
    it("should skip subtree in circular dependency check for performance", () => {
      const [t1, t2, t3, t4] = Array.from({ length: 4 }, (_, i) => token(`token-${i}`));
      const i1 = inject({ t2 }).implements(t1, () => 0);
      const i2 = inject({ t3 }).implements(t2, () => 0);
      const i3 = inject({}).implements(t3, () => 0);
      const i4 = inject({ t1 }).implements(t4, () => 0);
      // This case covers line 133 in `src/container.ts`.
      container([provide.stateful(i1), provide.stateful(i2), provide.stateful(i3), provide.stateful(i4)]);
    });
    it("should not emit error when circular dependency is from", () => {
      // It should emit dependency not found.
      const ta = token("a");
      const tb = token("b");
      const ia = inject({ ta }).implements(tb, () => 0);
      const ib = inject({ tb }).implements(ta, () => 1);
      expect(() => {
        const father = container([provide.stateful(ia)]);
        father.fork([provide.stateful(ib)]);
      }).not.toThrow();
      expect(() => {
        const father = container([provide.stateful(ia)]);
        const child = father.fork([provide.stateful(ib)]);
        child.request(dependencyA);
      }).toThrow(/Cannot find provider/i);
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
        const f = import.meta.jest.fn(({ serviceA }: { serviceA: ServiceA }) => {
          return serviceA.foo();
        });
        const c = container([provide.stateful(serviceAImpl)]);
        c.consume(inject({ serviceA: dependencyA }).for(f));
        expect(f).toBeCalledTimes(1);
      });
      it("should have this context", () => {
        const fn = import.meta.jest.fn();
        const consumer = inject({ serviceA: dependencyA }).for(function () {
          expect(this.serviceA.foo()).toBe(111);
          fn();
        });
        const c = container([provide.stateful(serviceAImpl)]);
        c.consume(consumer);
        expect(fn).toBeCalledTimes(1);
        const bImpl = dependencyB.implementAs(function () {
          expect(this.request(dependencyA).foo()).toBe(111);
          fn();
          return {
            bar: "616414",
          };
        });
        expect(c.fork([provide.stateful(bImpl)]).request(dependencyB).bar).toBe("616414");
        expect(fn).toBeCalledTimes(2);
      });
    });
    describe("clear", () => {
      const consoleError = import.meta.jest.spyOn(console, "error").mockImplementation(() => {});
      beforeEach(() => {
        consoleError.mockClear();
        aDisposer.mockClear();
        bDisposer.mockClear();
      });
      it("should clear stateful solution cached instance, not stateless solution", () => {
        const ta = token<ServiceA>("t1");
        const instance: ServiceA = {
          foo() {
            return 1;
          },
        };
        const ia = ta.implementAs(() => instance, aDisposer);

        const tb = token<ServiceB>("t2");
        const ib = tb.implementAs(() => ({ bar: "2" }), bDisposer);
        const ioc = container([provide.stateful(ia), provide.stateless(ib)]);
        ioc.request(ta);
        ioc.request(tb);
        ioc.dispose();
        expect(aDisposer).toBeCalledTimes(1);
        expect(aDisposer).toBeCalledWith(instance);
        expect(bDisposer).not.toBeCalled();
      });
      it("should be able to create new stateful instance", () => {
        const ioc = container([provide.stateful(serviceAImpl), provide.stateful(serviceBImpl)]);
        const b1 = ioc.request(dependencyB);
        const b2 = ioc.request(dependencyB);
        expect(b1).toBe(b2);
        ioc.clear();
        const b3 = ioc.request(dependencyB);
        expect(b3).toStrictEqual(b1);
        expect(b3).not.toBe(b1);
      });
      it("should handle errors in clearing", () => {
        const disposer = import.meta.jest.fn((a: ServiceA) => {
          if (a.foo()) {
            throw new Error("");
          }
        });
        const ioc = container([
          provide.stateful(
            factory(
              dependencyA,
              () => ({
                foo() {
                  return 1;
                },
              }),
              disposer
            )
          ),
        ]);
        ioc.request(dependencyA);
        expect(() => {
          ioc.dispose();
        }).not.toThrow();
        expect(consoleError).toBeCalledTimes(1);
        expect(disposer).toBeCalledTimes(1);
      });
    });
    describe("dispose", () => {
      beforeEach(() => {
        aDisposer.mockClear();
        bDisposer.mockClear();
      });
      it("should emit error when calling methods on a disposed container", () => {
        const ioc = container();
        ioc.dispose();
        expect(() => {
          ioc.clear();
        }).toThrow(/disposed/);
        expect(() => {
          ioc.consume(consumer({}, () => {}));
        }).toThrow(/disposed/);
        expect(() => {
          ioc.dispose();
        }).toThrow(/disposed/);
        expect(() => {
          ioc.fork([]);
        }).toThrow(/disposed/);
        expect(() => {
          ioc.override([]);
        }).toThrow(/disposed/);
        expect(() => {
          ioc.register([]);
        }).toThrow(/disposed/);
        expect(() => {
          ioc.request(dependencyA);
        }).toThrow(/disposed/);
      });
      it("should dispose child containers as well", () => {
        const father = container([
          provide.stateful(
            factory(
              dependencyA,
              () => ({
                foo() {
                  return 1;
                },
              }),
              aDisposer
            )
          ),
        ]);
        const child1 = father.fork([
          provide.stateful(inject({ serviceA: dependencyA }).implements(dependencyB, serviceBImpl.factory, bDisposer)),
        ]);
        const child2 = father.fork([
          provide.stateful(inject({ serviceA: dependencyA }).implements(dependencyB, serviceBImpl.factory, bDisposer)),
        ]);
        child1.request(dependencyB);
        child2.request(dependencyB);
        child1.dispose();
        expect(bDisposer).toBeCalledTimes(1);
        expect(() => {
          father.dispose();
        }).not.toThrow();
        expect(aDisposer).toBeCalledTimes(1);
        expect(bDisposer).toBeCalledTimes(2);
      });
    });
  });
});
