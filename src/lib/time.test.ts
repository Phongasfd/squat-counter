import { test } from "node:test";
import assert from "node:assert/strict";
import { lastNDateKeys, localDateKey, periodStart } from "./time.ts";

const TZ = "Asia/Ho_Chi_Minh"; // UTC+7

test("localDateKey uses the company time zone", () => {
  // 18:30 UTC on Oct 27 is 01:30 on Oct 28 in Vietnam.
  assert.equal(localDateKey("2026-10-27T18:30:00Z", TZ), "2026-10-28");
  assert.equal(localDateKey("2026-10-27T16:59:59Z", TZ), "2026-10-27");
});

test("periodStart returns local midnight boundaries", () => {
  const now = new Date("2026-10-28T03:00:00Z"); // Wednesday 10:00 in Vietnam
  assert.equal(periodStart("today", now, TZ)?.toISOString(), "2026-10-27T17:00:00.000Z");
  assert.equal(periodStart("week", now, TZ)?.toISOString(), "2026-10-25T17:00:00.000Z"); // Monday Oct 26
  assert.equal(periodStart("month", now, TZ)?.toISOString(), "2026-09-30T17:00:00.000Z");
  assert.equal(periodStart("all", now, TZ), null);
});

test("week starts on Monday even on Sunday", () => {
  const sunday = new Date("2026-11-01T05:00:00Z");
  assert.equal(periodStart("week", sunday, TZ)?.toISOString(), "2026-10-25T17:00:00.000Z");
});

test("periodStart handles DST time zones", () => {
  // Europe/Berlin switches from UTC+2 to UTC+1 on 2026-10-25.
  const now = new Date("2026-10-28T12:00:00Z");
  assert.equal(periodStart("today", now, "Europe/Berlin")?.toISOString(), "2026-10-27T23:00:00.000Z");
  assert.equal(periodStart("month", now, "Europe/Berlin")?.toISOString(), "2026-09-30T22:00:00.000Z");
});

test("lastNDateKeys ends today", () => {
  assert.deepEqual(lastNDateKeys(3, new Date("2026-03-01T03:00:00Z"), TZ), ["2026-02-27", "2026-02-28", "2026-03-01"]);
});
