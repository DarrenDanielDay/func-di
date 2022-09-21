import type { InitialOptionsTsJest } from "ts-jest/dist/types";
import tsJestPresets from "ts-jest/presets";
const config: InitialOptionsTsJest = {
  transform: {
    ".*\\.tsx?": ["ts-jest", tsJestPresets.jsWithTsESM],
  },
  testMatch: ["./**/?(*.)+(spec|test).[t]s?(x)"],
};
export default config;
