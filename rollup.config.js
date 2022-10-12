import pluginTerser from "rollup-plugin-terser";
import pluginReplace from "@rollup/plugin-replace";
/** @type {import('rollup').RollupOptions} */
const config = {
  input: {
    "index.browser.esm.min": "./dist/index.js",
    "react.browser.esm.min": "./dist/react.js",
    "hooks.browser.esm.min": "./dist/hooks.js",
  },
  external: ["react"],
  plugins: [
    pluginReplace({
      preventAssignment: true,
      "process.env.NODE_ENV": "'production'",
    }),
  ],
  output: {
    format: "esm",
    dir: "dist",
    plugins: [pluginTerser.terser()],
  },
};
export default config;
