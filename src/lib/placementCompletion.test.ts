// @ts-nocheck
import { test, expect } from "bun:test";
import { completionBlocker } from "./placementCompletion";
test("pending hours prevent completion", () => expect(completionBlocker("active", 1, true, "2026-11-01", "2026-11-08", "2026-11-08")).not.toBeNull());
test("completion requires saved checklist", () => expect(completionBlocker("active", 0, false, "2026-11-01", "2026-11-08", "2026-11-08")).not.toBeNull());
test("future end dates cannot confirm ended placements", () => expect(completionBlocker("active", 0, true, "2026-11-01", "2026-11-09", "2026-11-08")).not.toBeNull());
test("accepted upcoming placements cannot complete", () => expect(completionBlocker("upcoming", 0, true, "2026-11-01", "2026-11-08", "2026-11-08")).not.toBeNull());
test("reviewed active placement can complete", () => expect(completionBlocker("active", 0, true, "2026-11-01", "2026-11-08", "2026-11-08")).toBeNull());