# Bought-from, cost tax year and tax calculation (design and plan)

Date: 3 Oct 2026. Owner: Zakery (approved in advance, with consent to merge). Branch: `feature/tax-years`. Builds on the sold-confirmation feature (PR #6).

## Goal

Each sale records where the item was bought and in which UK tax year it was paid for. The admin shows a tax estimate per sale and per tax year. The HMRC CSV and Google Sheets copy carry the same columns.

## Rules (Zakery's, an estimate at 20%, not tax advice)

- The UK tax year runs 6 April to 5 April. `taxYear("2026-10-03") = "2026-27"` and `taxYear("2026-04-05") = "2025-26"`.
- **Cost bought in the same tax year as the sale** (or cost year unknown): tax estimate = 20% × (sale price − cost).
- **Cost bought in an earlier tax year:** tax estimate = 20% × sale price, because that cost belongs to the earlier year's return.
- The summary covers **confirmed sales only**. For each tax year it shows:
  - confirmed sales;
  - revenue;
  - same-year costs deducted;
  - the tax estimate;
  - "costs to claim in this year": costs bought in that year for items sold in a later year.

## Data (no schema change)

- **Product:** the existing `source` field is shown as "Bought from". A new `costTaxYear` (e.g. `"2024-25"`) is stored in the product metadata JSON alongside `costPrice`.
- **Order snapshot:** `items[].boughtFrom` and `items[].costTaxYear` are set when a sale is recorded. They are editable afterwards through PATCH (single-item orders only).

## Changes

1. **`lib/sales.ts`** gets:
   - `taxYear(date)`;
   - `isTaxYear(value)`;
   - `orderBoughtFrom(order, products)` and `orderCostTaxYear(order, products)` (snapshot first, then product);
   - `taxEstimate(price, cost, saleYear, costYear)`;
   - `taxSummary(orders, products)`.

   `ACCOUNT_HEADERS` gains "Bought From", "Cost Tax Year", "Sale Tax Year" and "Tax Estimate (20%)", appended at the end. `CostProduct` gains `source?` and `costTaxYear?`.
2. **`lib/products.ts` and `lib/product-db.ts`:** `costTaxYear?: string` is added to `Product`, to the metadata parse and serialise, and to `rowToProduct`.
3. **`/api/admin-vinted-sale`:**
   - Optional `boughtFrom` (≤100 characters) and `costTaxYear` (validated with `isTaxYear`, otherwise 400).
   - Defaults come from the product's `source` and `costTaxYear`.
   - The values are saved onto the product and into the snapshot.
4. **`PATCH /api/admin-orders`:**
   - Optional `bought_from` (string, ≤100) and `cost_tax_year` (`isTaxYear`, or `""` to clear).
   - Both go into `items[0]`, sharing the single-item guard with the price edits.
5. **Admin page:**
   - **Listing Studio:** "Source" is relabelled "Bought from (supplier)", and a "Cost tax year" select is added (2023-24 to 2026-27, or blank).
   - **Sales table:** a "Bought" column with inline "from" text and a tax-year select on paid single-item orders, saved on change or blur. A "Tax est." column.
   - **Tax calculation section** above the table: one row per sale tax year with Confirmed sales, Revenue, Costs deducted, Tax estimate (20%), and Costs to claim this year. It notes that this is an estimate at the 20% basic rate, so he should check with an accountant.
6. **Owner panel:** "Bought from" and "Cost tax year" (default: the current tax year), prefilled from the product and sent with the sale.

## Out of scope

Personal allowance, higher-rate bands, National Insurance, platform fees and charity-shop receipts import.

## Tasks (native execution, TDD)

1. `lib/sales.ts` with tests: taxYear boundaries; isTaxYear; taxEstimate under both rules, including an unknown cost year; accountRows with the new columns; taxSummary totals and earlier-year costs. Run `npm test`.
2. Product type and metadata, plus the APIs. Run `npm test`.
3. Admin page: Listing Studio fields, Sales columns and the tax section. Run `npm test`.
4. Owner panel fields.
5. Fresh review. Push, open a PR, wait for the Vercel build, merge.
6. After deploy, backfill through the admin API:
   - Ben Whitley, 2024-25: the England Rugby, Harley thermal, Nike raglan and GAS orders.
   - Fleek, 2024-25: the 6 sold Carhartt orders, plus the unsold SRV-128 product.
   - "Charity shop (Ireland)", 2026-27: the beige Carhartt order.
   - Napoli top: Ben Whitley 2024-25 on its product, if it is found.
7. Rebuild the "HMRC sales – Stacked Racks" Google Sheet with the new columns.
