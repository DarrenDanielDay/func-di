import type { InitialOptionsTsJest } from "ts-jest/dist/types";
const config: InitialOptionsTsJest = {
  testMatch: ["./**/?(*.)+(spec|test).[j]s?(x)"],
};
export default config;
