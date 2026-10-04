# Sold → to be confirmed → sold (design)

Date: 3 Oct 2026. Owner: Zakery. Branch: `feature/sold-confirmation` (from `main`).

## Goal

Let Zakery mark an item sold straight from its listing page, show a SOLD sign to shoppers at once, then confirm the sale once it is posted and delivered. Only confirmed sales go into his HMRC accounts, which he keeps in a Google Sheet.

## What exists today (reused, not rebuilt)

- `stock === 0` already shows the SOLD overlay on shop cards and "This piece has sold" on the product page.
- `POST /api/admin-vinted-sale` `{productId, purchasePrice, soldPrice}` sets the product's `costPrice` and `stock: 0`, then inserts a `VINTED-…` order (`payment_status: paid`, `fulfilment_status: paid`, `items[].costPrice` snapshot) and an audit entry. It returns 409 if a Vinted sale already exists for the item.
- `PATCH /api/admin-orders` changes `fulfilment_status` (paid, packing, dispatched, delivered, returned, refunded), tracking and notes, with an audit entry. Setting dispatched emails the buyer only when the order has a `customer_email`; Vinted orders have none.
- The admin Sales tab (`app/admin/page.tsx`) lists orders and has an "Export to HMRC CSV" button that includes every order with `payment_status === "paid"`.
- Current data: 12 orders. 6 Carhartt Vinted sales are at `paid/paid`, 4 older sales are `delivered`, and 2 are refunded.

## Stages (no database change)

| Stage | Rule |
|---|---|
| Sold – to be confirmed | `payment_status = paid` and `fulfilment_status` is paid, packing or dispatched (missing counts as paid) |
| Sold (confirmed) | `payment_status = paid` and `fulfilment_status = delivered` |
| Not a sale | refunded or returned |

"Posted" sets `dispatched` and "Confirm sold" sets `delivered`. Stripe website orders follow the same rules, but nothing in the Stripe or checkout code changes.

## Changes

1. **`lib/sales.ts` (new, pure functions, tested)**
   - `saleStage(order)` returns `"to_confirm" | "sold" | "other"`.
   - `orderPurchaseCost(order, products)` moves here from `app/admin/page.tsx` unchanged.
   - `accountRows(orders, products, from?, to?)` returns the HMRC rows (confirmed sales only), using the existing columns: Date, Order ID, Item, Brand, Sales Channel, Sale Price, Item Purchase Cost, Gross Profit Before Fees, Postage, Total, Customer Name.
   - `toCsv(rows)` and `toTsv(rows)` format those rows. TSV is for pasting into Google Sheets.

2. **Owner panel on the product page**
   - `app/products/[id]/[slug]/page.tsx` calls `isAdminRequest()` on the server. Only when it is true does the page render a new client component, `components/OwnerSalePanel.tsx`. Visitors never receive the panel's markup or script.
   - **Item unsold:** the panel shows "Bought £" (prefilled from `costPrice`), "Sold £" (prefilled from `price`), a channel select (Vinted / Other) and a **Sold – to be confirmed** button. The button POSTs to `/api/admin-vinted-sale` with `channel`, then refreshes the page so the SOLD sign shows.
   - **Item sold:** the panel finds the item's order via `GET /api/admin-orders` (matched on `item_id`), shows its stage, and offers **Posted** and **Confirm sold** (PATCH `fulfilment_status`).

3. **`/api/admin-vinted-sale`: optional `channel`**
   - `"vinted"` (default, current behaviour) or `"other"`. "Other" gives the order `source: "manual"` and id prefix `SR-`.
   - The duplicate check covers both sources for the same item.
   - Nothing else in the route changes.

4. **`PATCH /api/admin-orders`: optional `price` and `cost_price`**
   - Validated as finite numbers ≥ 0.
   - `price` sets `price` and `total = price + postage`. `cost_price` sets `items[0].costPrice` in the snapshot.
   - The existing audit log records the change. Status handling is unchanged.

5. **Admin Sales tab**
   - Filter pills: **To be confirmed (n)**, **Sold (n)**, **All**. To be confirmed is the default.
   - To-be-confirmed rows have **Posted** and **Confirm sold** buttons, plus inline editable Bought £ and Sold £, saved on blur through the PATCH above.
   - The HMRC CSV button exports confirmed sales only.
   - A new **Copy for Google Sheets** button copies the same rows as tab-separated text, without a header row, to the clipboard. It respects the existing from/to date filter and shows "Copied n rows".
   - The dashboard revenue figures are unchanged.

6. **Master Google Sheet (outside the code)**
   - Claude creates an "HMRC sales – Stacked Racks" sheet in Zakery's Google Drive. It has the column headings above, plus the 4 sales already confirmed.
   - Zakery pastes new rows under the last row.

## Out of scope

- An undo that puts a mistaken sale back in stock. Refunded or Returned covers the accounts side.
- Live sync to Google Sheets.
- Any change to Stripe, checkout, the webhook or the schema.

## Errors

- The panel and the buttons show the API's error text inline: 401 means "sign in again", 409 means "already recorded".
- Buttons are disabled while a request is running, to stop double clicks.
- A copy that fails (clipboard blocked) falls back to selecting the text in a textarea.

## Testing

- `tests/sales.test.ts` (node:test) covers:
  - `saleStage` for each status combination;
  - that `accountRows` excludes unconfirmed, refunded and out-of-range orders;
  - the cost fallback order;
  - TSV escaping of tabs and newlines.
- Then `npm test` and `npm run build`.
- Manual check on the Vercel preview, signed in as admin. The preview uses the live database, so no test sales are created:
  - the panel shows on an unsold item, but the button is not pressed;
  - the panel is absent in a private window;
  - one of the real Carhartt orders shows as To be confirmed with Posted and Confirm sold, and Zakery presses them when it really is posted or delivered;
  - the Copy output is pasted into the master sheet.
- Open a pull request. Merge only when Zakery says "merge".
