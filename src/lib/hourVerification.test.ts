// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { describe, expect, test } from "bun:test";
import { durationFromTimes, seekerCanEditHours } from "./hourVerification";

describe("hour durations", () => {
  test("duration is end minus start minus break", () => {
    expect(durationFromTimes("09:00", "17:00", 30)).toBe(450);
  });
  test("end before start is rejected", () => {
    expect(durationFromTimes("17:00", "09:00", 0)).toBeNull();
  });
  test("break as long as the shift is rejected", () => {
    expect(durationFromTimes("09:00", "10:00", 60)).toBeNull();
  });
});

describe("seeker editing", () => {
  test("approved and rejected entries are locked", () => {
    expect(seekerCanEditHours("approved")).toBe(false);
    expect(seekerCanEditHours("rejected")).toBe(false);
  });
  test("pending and correction-requested entries are editable", () => {
    expect(seekerCanEditHours("pending")).toBe(true);
    expect(seekerCanEditHours("correction_requested")).toBe(true);
  });
});
