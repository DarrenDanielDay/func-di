const { defaults: tsjestPresets } = require("ts-jest/presets");
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    ...tsjestPresets.transform,
  },
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  testMatch: ["./**/?(*.)+(spec|test).[t]s?(x)"],
  verbose: true,
};
