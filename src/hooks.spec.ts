import { container, provide } from "./container.js";
import { runInContainerScope, useInjection } from "./hooks.js";
import { implementation, token } from "./token.js";
describe("hooks.ts", () => {
  describe("stack scopes", () => {
    const dep = token<{}>("");
    const outer = {};
    const inner = {};
    it("should have stack behavior", () => {
      const ioc = container([provide.stateful(implementation(dep, outer))]);
      runInContainerScope(ioc, () => {
        const obj1 = useInjection(dep);
        expect(obj1).toBe(outer);
        runInContainerScope(ioc.fork([provide.stateful(implementation(dep, inner))]), () => {
          const obj2 = useInjection(dep);
          expect(obj2).toBe(inner);
        });
        const afterScopeObj1 = useInjection(dep);
        expect(afterScopeObj1).toBe(outer);
      });
    });
    it("should throw error without container context", () => {
      expect(() => {
        useInjection(dep);
      }).toThrow(/cannot resolve/i);
    });
  });
});
