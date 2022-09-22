import pluginTerser from "rollup-plugin-terser";
import pluginReplace from "@rollup/plugin-replace";
/** @type {import('rollup').RollupOptions} */
const config = {
  input: "dist/index.js",
  external: ["react"],
  plugins: [
    pluginReplace({
      preventAssignment: true,
      "process.env.NODE_ENV": "'production'",
    }),
  ],
  output: [
    {
      format: "esm",
      file: "dist/func-di.browser.esm.min.js",
      plugins: [pluginTerser.terser()],
    },
  ],
};
export default config;
