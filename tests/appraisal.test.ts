import test from "node:test";
import assert from "node:assert/strict";
import { goldilocksPrice, pickAnalysisPhotos, platformProfits } from "../lib/appraisal.ts";

test("platform profits take off each platform's seller fee and the cost", () => {
  const rows = Object.fromEntries(platformProfits(40, 15).map((row) => [row.platform, row]));
  assert.deepEqual(rows.Website, { platform: "Website", note: "Stripe, UK cards", fee: 0.8, payout: 39.2, profit: 24.2 });
  assert.equal(rows.Vinted.profit, 25);
  assert.equal(rows.Depop.fee, 1.46);
  assert.equal(rows.Depop.profit, 23.54);
  assert.equal(rows.eBay.fee, 0);
  assert.ok(platformProfits(0).every((row) => row.fee === 0));
});

test("goldilocks price is the rounded middle of the range", () => {
  assert.equal(goldilocksPrice(25, 40), 33);
  assert.equal(goldilocksPrice(30, undefined), 30);
  assert.equal(goldilocksPrice(undefined, 45), 45);
  assert.equal(goldilocksPrice(), undefined);
});

test("photo picker keeps cover, label shots and the last photos in order", () => {
  const urls = ["front", "back", "side", "sleeve", "care-label", "hem", "cuff", "zip", "pocket", "tag-1", "tag-2"];
  assert.deepEqual(pickAnalysisPhotos(urls.slice(0, 6)), urls.slice(0, 6));
  assert.deepEqual(pickAnalysisPhotos(urls, 5), ["front", "care-label", "pocket", "tag-1", "tag-2"]);
  assert.equal(pickAnalysisPhotos(urls).length, 8);
});
