import { injectable } from "./injectable.js";
import { dynamicInjectable, token, __FUNC_DI_CONTAINER__ } from "./token.js";

describe("injectable.ts", () => {
  describe("injectable", () => {
    it("should be immutable", () => {
      const t1 = token<{ foo: string }>("1");
      const t2 = token<string>("2");
      const deps = { t2 };
      const factory = ({ t2 }: { t2: string }) => {
        return {
          foo: t2,
        };
      };
      const aInjectable = injectable(t1, deps, factory);
      expect(Object.isFrozen(aInjectable)).toBe(true);
      expect(aInjectable.dependencies).not.toBe(deps);
      expect(aInjectable.dependencies).toStrictEqual(deps);
      expect(Object.isFrozen(aInjectable.dependencies)).toBe(true);
    });
  });
  describe("dynamicInjectable", () => {
    it("should inject exactly one container", () => {
      const deps = dynamicInjectable(token(""), () => {}).dependencies;
      expect(deps).toStrictEqual({ c: __FUNC_DI_CONTAINER__ });
    });
  });
});
