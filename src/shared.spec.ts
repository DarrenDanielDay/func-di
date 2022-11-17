describe("shared.ts", () => {
  describe("in production mode", () => {
    const original = process.env.NODE_ENV;
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });
    afterEach(() => {
      process.env.NODE_ENV = original;
    });
    it("should have no effect", async () => {
      const { clone, freeze } = await import("./shared.js");
      const obj = {};
      const freezeObj = freeze(obj);
      expect(freezeObj).toBe(obj);
      expect(Object.isFrozen(freezeObj)).toBe(false);
      const clonedObj = clone(obj);
      expect(clonedObj).toBe(obj);
    });
  });
});
export {};
