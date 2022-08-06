import { consumer } from "./consumer";
import { token } from "./token";

describe("comsumer.ts", () => {
  describe("consumer", () => {
    it("should be immutable", () => {
      const t1 = token("1");
      const dep = { t1 };
      const c = consumer(dep, () => 0);
      expect(c.dependencies).not.toBe(dep);
      expect(c.dependencies).toStrictEqual(dep);
      expect(Object.isFrozen(c)).toBe(true);
      expect(Object.isFrozen(c.dependencies)).toBe(true);
    });
  });
});
