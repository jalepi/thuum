import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, mock } from "bun:test";

// Register happy-dom globals (document, window, CustomEvent, etc.)
GlobalRegistrator.register();

// Restore all mocks after each test (equivalent to Vitest's restoreMocks: true)
afterEach(() => {
  mock.restore();
});
