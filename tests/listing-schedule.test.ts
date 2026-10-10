import test from "node:test";
import assert from "node:assert/strict";
import { assignReleaseSlots, upcomingSlots, dropsToEmail, dropEmailsByDay, parseProductSettings, productUnavailable, publicProducts, releaseAt, validRelease, validScheduleConfig } from "../lib/listing-schedule.ts";
import type { Product } from "../lib/products.ts";

const settings = () => parseProductSettings({ scheduleConfig: { startAt: "2026-10-01" } });
const now = Date.parse("2026-10-01T10:00:00Z");

test("settings support old JSON, malformed fields and independent defaults", () => {
  const old = parseProductSettings('{"hiddenProductIds":["a","a"],"deletedProductIds":["b"]}');
  assert.deepEqual(old.hiddenProductIds, ["a"]);
  assert.deepEqual(old.scheduledReleases, {});
  assert.equal(old.scheduleConfig.batchSize, 5);
  assert.equal(old.scheduleConfig.everyDays, 3);
  assert.equal(old.scheduleConfig.releaseHour, 18);
  assert.deepEqual(parseProductSettings("oops").hiddenProductIds, []);
  const parsed = parseProductSettings({ scheduleConfig: { batchSize: 0, everyDays: 7, releaseHour: 24, startAt: "2026-02-30" }, scheduledReleases: { a: "bad", b: "2026-10-01T18:00:00+01:00", c: 1 } });
  assert.equal(parsed.scheduleConfig.batchSize, 5);
  assert.equal(parsed.scheduleConfig.everyDays, 7);
  assert.equal(parsed.scheduleConfig.releaseHour, 18);
  assert.deepEqual(parsed.scheduledReleases, { b: "2026-10-01T17:00:00.000Z" });
  old.scheduledReleases.a = "x";
  assert.deepEqual(parseProductSettings(null).scheduledReleases, {});
  assert.equal(validRelease("2026-02-30T12:00:00Z"), false);
  assert.equal(validRelease("2026-10-01T18:00:00"), false);
  assert.equal(validScheduleConfig({ ...settings().scheduleConfig, everyDays: 0 }), false);
});

test("auto slots fill five per drop, three calendar days apart", () => {
  const releases = assignReleaseSlots(settings(), Array.from({ length: 11 }, (_, i) => String(i)), now);
  assert.equal(releases[0], "2026-10-01T17:00:00.000Z");
  assert.equal(releases[4], releases[0]);
  assert.equal(releases[5], "2026-10-04T17:00:00.000Z");
  assert.equal(releases[9], releases[5]);
  assert.equal(releases[10], "2026-10-07T17:00:00.000Z");
});

test("auto slots fill holes, skip past drops and preserve already queued IDs", () => {
  const s = settings();
  s.scheduledReleases = assignReleaseSlots(s, ["a", "b", "c", "d", "e", "f"], now);
  delete s.scheduledReleases.b;
  const filled = assignReleaseSlots(s, ["g", "g", "f", "h"], now);
  assert.equal(filled.g, filled.a);
  assert.equal(filled.h, filled.f);
  assert.equal(filled.f, s.scheduledReleases.f);
  const future = assignReleaseSlots(s, ["new"], Date.parse("2026-10-04T17:00:01Z"));
  assert.equal(future.new, "2026-10-07T17:00:00.000Z");
});

test("UK wall-clock drop hours survive both DST transitions", () => {
  assert.equal(releaseAt("2026-03-28", 18), "2026-03-28T18:00:00.000Z");
  assert.equal(releaseAt("2026-03-29", 18), "2026-03-29T17:00:00.000Z");
  const s = settings();
  s.scheduleConfig = { batchSize: 1, everyDays: 3, startAt: "2026-10-23", releaseHour: 18 };
  const releases = assignReleaseSlots(s, ["a", "b"], Date.parse("2026-10-23T00:00:00Z"));
  assert.equal(releases.a, "2026-10-23T17:00:00.000Z");
  assert.equal(releases.b, "2026-10-26T18:00:00.000Z");
  assert.equal(releaseAt("2026-03-29", 1), "2026-03-29T01:00:00.000Z");
  assert.equal(releaseAt("2026-10-25", 1), "2026-10-25T01:00:00.000Z");
});

test("catalog and checkout availability change exactly at release; New In uses UK release date", () => {
  const s = settings();
  s.hiddenProductIds = ["hidden"];
  s.deletedProductIds = ["deleted"];
  s.scheduledReleases = { queued: "2026-10-01T23:30:00.000Z" };
  const products = ["queued", "hidden", "deleted", "normal", "draft"].map(id => ({ id, listedDate: "2020-01-01", listingStatus: id === "draft" ? "draft" : "live" }) as Product);
  const release = Date.parse(s.scheduledReleases.queued);
  assert.deepEqual(publicProducts(products, s, release - 1).map(p => p.id), ["normal"]);
  assert.equal(productUnavailable(s, "queued", release - 1), true);
  assert.equal(productUnavailable(s, "queued", release), false);
  const publicList = publicProducts(products, s, release);
  assert.deepEqual(publicList.map(p => p.id), ["queued", "normal"]);
  assert.equal(publicList[0].listedDate, "2026-10-02");
  assert.equal(products[0].listedDate, "2020-01-01");
});

test("upcomingSlots lists future drops every 3 days at 10:00 UK across the clock change", () => {
  const config = { batchSize: 5, everyDays: 3, startAt: "2026-10-04", releaseHour: 10 };
  const slots = upcomingSlots(config, Date.parse("2026-10-05T16:00:00Z"), 8);
  assert.deepEqual(slots.slice(0, 3), ["2026-10-07T09:00:00.000Z", "2026-10-10T09:00:00.000Z", "2026-10-13T09:00:00.000Z"]);
  assert.equal(slots[6], "2026-10-25T10:00:00.000Z");
});

test("dropsToEmail returns only recently released, not yet emailed drops", () => {
  const s = settings();
  const now = Date.parse("2026-10-10T18:10:00Z");
  s.scheduledReleases = { a: "2026-10-10T18:00:00.000Z", b: "2026-10-10T18:00:00.000Z", hidden: "2026-10-10T18:00:00.000Z", old: "2026-10-07T18:00:00.000Z", future: "2026-10-13T18:00:00.000Z" };
  s.hiddenProductIds = ["hidden"];
  assert.deepEqual(dropsToEmail(s, now), [{ at: "2026-10-10T18:00:00.000Z", ids: ["a", "b"] }]);
  s.emailedDrops = ["2026-10-10T18:00:00.000Z"];
  assert.deepEqual(dropsToEmail(s, now), []);
  // The sent list survives a save and reload, and bad values are dropped.
  assert.deepEqual(parseProductSettings(JSON.stringify({ ...s, emailedDrops: ["2026-10-10T19:00:00+01:00", "nonsense"] })).emailedDrops, ["2026-10-10T18:00:00.000Z"]);
});

test("dropEmailsByDay merges a weekend day's two batches into one email", () => {
  const due = [{ at: "2026-10-10T10:00:00.000Z", ids: ["a", "b"] }, { at: "2026-10-10T16:30:00.000Z", ids: ["c"] }, { at: "2026-10-13T18:00:00.000Z", ids: ["d"] }];
  assert.deepEqual(dropEmailsByDay(due), [
    { day: "2026-10-10", ats: ["2026-10-10T10:00:00.000Z", "2026-10-10T16:30:00.000Z"], ids: ["a", "b", "c"] },
    { day: "2026-10-13", ats: ["2026-10-13T18:00:00.000Z"], ids: ["d"] },
  ]);
});
