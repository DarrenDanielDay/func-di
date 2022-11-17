import { inject } from "./inject.js";
import { token } from "./token.js";

describe("inject.ts", () => {
  describe("inject", () => {
    it("should be immutable", () => {
      const t1 = token("1");
      const deps = { t1 };
      const injector = inject(deps);
      expect(Object.isFrozen(injector)).toBe(true);
      expect(Object.isFrozen(injector.dependencies)).toBe(true);
    });
    describe("injector methods", () => {
      const t1 = token("1");
      const t2 = token("2");
      const d1 = { t1 };
      const i1 = inject(d1);
      const d2 = { t2 };
      const i2 = i1.with(d2);
      const c1 = i1.for(() => 0);
      const impl1 = i1.implements(t2, () => 0);
      it("should return new injector with merged dependencies", () => {
        expect(i1).not.toBe(i2);
        expect(i2.dependencies).toStrictEqual({ ...d1, ...d2 });
      });
      it("should return comsumer with given dependencies", () => {
        expect(c1.dependencies).toStrictEqual(d1);
      });
      it("should return injectable with given dependencies", () => {
        expect(impl1.dependencies).toStrictEqual(d1);
      });
    });
  });
});
