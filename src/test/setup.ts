import { vi } from "vitest";
vi.mock("sql.js/dist/sql-wasm.wasm?url", async () => {
  const { createRequire } = await import("node:module");
  return { default: createRequire(import.meta.url).resolve("sql.js/dist/sql-wasm.wasm") };
});
