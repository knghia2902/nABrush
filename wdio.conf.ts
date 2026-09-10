import path from "node:path";
import process from "node:process";

const executable = process.platform === "win32" ? "nabrush.exe" : "nabrush";
const application = path.resolve("src-tauri", "target", "debug", executable);

export const config = {
  runner: "local",
  specs: ["./tests/e2e/**/*.e2e.ts"],
  suites: {
    "short-lifecycle": ["./tests/e2e/overlay.e2e.ts"],
    "phase1-matrix": ["./tests/e2e/overlay.e2e.ts"],
  },
  maxInstances: 1,
  logLevel: "info",
  bail: 1,
  baseUrl: "http://localhost:1420",
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  framework: "mocha",
  reporters: ["spec"],
  services: [["@wdio/tauri-service", {
    driverProvider: "embedded",
    appBinaryPath: application,
    windowLabel: "overlay",
    startTimeout: 90_000,
  }]],
  capabilities: [{
    browserName: "tauri",
    "tauri:options": {
      application,
      driverProvider: "embedded",
    },
  }],
  mochaOpts: {
    timeout: 120_000,
    fullTrace: true,
  },
  beforeTest: async () => {
    await browser.waitUntil(
      async () => (await browser.execute(() => document.readyState)) === "complete",
      { timeout: 30_000, timeoutMsg: "Tauri webview did not finish loading" },
    );
  },
};
