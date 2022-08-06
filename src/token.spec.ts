import { implementation, token, tokenName } from "./token";

describe("token.ts", () => {
  describe("token", () => {
    it("should be immutable", () => {
      const t = token("1");
      expect(Object.isFrozen(t)).toBe(true);
    });
    it("should have unique symbol key", () => {
      const t1 = token("1");
      const t2 = token("1");
      expect(t1.key).not.toBe(t2.key);
    });
  });
  describe("token name", () => {
    it("should return the input string", () => {
      const t = token("foo");
      expect(tokenName(t)).toBe("foo");
    });
  });
  describe("implementation", () => {
    it("should be immutable", () => {
      const t = token("", { foo: 1 });
      const i = implementation(t, { foo: 2 });
      expect(Object.isFrozen(i)).toBe(true);
    });
  });
});
