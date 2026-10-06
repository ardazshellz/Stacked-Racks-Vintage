"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultScheduleConfig, type ScheduleConfig } from "@/lib/listing-schedule";
import Image from "next/image";
import EmailMarketing from "@/components/admin/EmailMarketing";
import Scheduler from "@/components/admin/Scheduler";
import PhotoEditor from "@/components/admin/PhotoEditor";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { accountRows, isRecordedSale, orderBoughtFrom, orderCostTaxYear, orderPurchaseCost, orderTax, parseMoney, saleStage, taxSummary, taxYear, toCsv, toTsv } from "@/lib/sales";
import {
  ALL_BRANDS,
  CATEGORIES,
  ERAS,
  FITS,
  SIZES,
  displayGender,
  type Condition,
  type Era,
  type Fit,
  type Product,
  productSizeLabel,
} from "@/lib/products";

type Tab = "orders" | "listings" | "scheduler" | "email" | "analytics";

interface OrderRow {
  id: string;
  item_id?: string;
  source: string;
  item_name: string;
  brand: string;
  price: number | string;
  postage: number | string;
  total: number | string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  payment_status: string;
  notes: string;
  date_of_sale: string;
  fulfilment_status?: string;
  tracking_number?: string;
  dispatched_at?: string;
  refunded_amount?: number | string;
  stripe_fee?: number | string;
  items?: Array<{
    id?: string;
    name?: string;
    brand?: string;
    price?: number | string;
    costPrice?: number | string;
    boughtFrom?: string;
    costTaxYear?: string;
  }>;
}

const EMPTY_PRODUCT: Omit<Product, "id"> = {
  name: "",
  brand: "",
  size: "M",
  gender: "Mens",
  price: 0,
  category: "Jackets",
  badge: "NEW",
  stock: 1,
  condition: "Good",
  era: "90s",
  fit: "Regular",
  listedDate: new Date().toISOString().slice(0, 10),
  description: "",
  imageUrls: [],
  vintedTitle: "",
  vintedDescription: "",
  vintedUrl: "",
  garmentDetails: {},
  sku: "",
  costPrice: 0,
  storageLocation: "",
  source: "",
  listingStatus: "live",
  pricingStatus: "standard",
  suggestedPriceLow: undefined,
  suggestedPriceHigh: undefined,
  pricingReason: "",
  pricingSearchQuery: "",
  pricingReviewedAt: undefined,
};

const INPUT = "w-full bg-[#171717] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-[#E8500A]/70 placeholder:text-[#444]";
const LABEL = "block text-[#666] text-[9px] font-black tracking-[0.18em] uppercase mb-1.5";
const SAFE_UPLOAD_BYTES = 3.5 * 1024 * 1024;

function assertCanvasHasVisiblePhoto(canvas: HTMLCanvasElement) {
  const sample = document.createElement("canvas");
  sample.width = 32;
  sample.height = 32;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not verify the photo");
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  let brightest = 0;
  let darkest = 255;
  for (let index = 0; index < pixels.length; index += 4) {
    const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
    brightest = Math.max(brightest, brightness);
    darkest = Math.min(darkest, brightness);
  }
  if (brightest < 8 || darkest > 247 || brightest - darkest < 3) {
    throw new Error("The prepared photo was blank. Please use the original JPG; it has not been uploaded.");
  }
}

async function optimisePhotoForUpload(file: File) {
  if (file.size <= SAFE_UPLOAD_BYTES && file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, 1800 / bitmap.width, 2400 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    assertCanvasHasVisiblePhoto(canvas);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("This photo could not be prepared")), "image/jpeg", 0.84);
    });
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

const LISTING_WORDS = [
  ...ALL_BRANDS,
  "jacket",
  "hoodie",
  "sweatshirt",
  "shirt",
  "jersey",
  "tracksuit",
  "trousers",
  "joggers",
  "shorts",
  "jeans",
  "denim",
  "leather",
  "bomber",
  "puffer",
  "knit",
  "sweater",
  "top",
  "vintage",
  "retro",
  "rare",
  "archive",
  "oversized",
  "baggy",
  "fitted",
  "excellent",
  "condition",
  "black",
  "white",
  "blue",
  "navy",
  "red",
  "green",
  "brown",
  "beige",
  "grey",
  "orange",
  "yellow",
  "purple",
  "pink",
] as const;

const QUICK_CATEGORIES = [
  { words: ["t-shirt", "tshirt", "tee"], category: "T-Shirts & Tops", item: "T-Shirt" },
  { words: ["hoodie"], category: "Hoodies", item: "Hoodie" },
  { words: ["bomber"], category: "Jackets", item: "Bomber Jacket" },
  { words: ["puffer"], category: "Jackets", item: "Puffer Jacket" },
  { words: ["jacket", "coat"], category: "Jackets", item: "Jacket" },
  { words: ["sweatshirt", "sweater", "jumper", "knit"], category: "Sweatshirts", item: "Sweatshirt" },
  { words: ["tracksuit"], category: "Tracksuits", item: "Tracksuit" },
  { words: ["joggers", "jogger"], category: "Joggers & Tracksuit Bottoms", item: "Joggers" },
  { words: ["trousers", "trouser", "pants"], category: "Trousers", item: "Trousers" },
  { words: ["shorts", "short"], category: "Shorts", item: "Shorts" },
  { words: ["football shirt", "jersey"], category: "Football Shirts", item: "Football Shirt" },
  { words: ["cap", "hat", "beanie"], category: "Headwear", item: "Headwear" },
  { words: ["backpack", "bag"], category: "Bags & Backpacks", item: "Bag" },
  { words: ["swimwear", "swimsuit"], category: "Swimwear", item: "Swimwear" },
  { words: ["trainers", "trainer", "shoes", "shoe"], category: "Shoes", item: "Shoes" },
] as const;

function parseQuickListing(details: string, current: Omit<Product, "id">): Partial<Omit<Product, "id">> {
  const text = details.toLowerCase().replaceAll("’", "'");
  const parsed: Partial<Omit<Product, "id">> = {};
  const brand = ALL_BRANDS.find((item) => text.includes(item.toLowerCase()));
  const categoryMatch = QUICK_CATEGORIES.find((item) => item.words.some((word) => text.includes(word)));
  const sizeMatches: Array<[RegExp, string]> = [
    [/\b(?:xxl|2xl|extra extra large)\b/, "XXL"],
    [/\b(?:xl|extra large)\b/, "XL"],
    [/\b(?:xs|extra small)\b/, "XS"],
    [/\b(?:large|size l)\b/, "L"],
    [/\b(?:medium|size m)\b/, "M"],
    [/\b(?:small|size s)\b/, "S"],
  ];
  const size = sizeMatches.find(([pattern]) => pattern.test(text))?.[1];
  const eraMatch = text.match(/\b(?:19|20)?(60|70|80|90|00|10|20)s\b/);
  const priceMatch = details.match(/(?:£|gbp\s*)(\d+(?:\.\d{1,2})?)/i);

  if (brand) parsed.brand = brand;
  if (categoryMatch) parsed.category = categoryMatch.category;
  if (size) parsed.size = size;
  if (/\b(?:women|womens|women's|female)\b/.test(text)) parsed.gender = "Womens";
  else if (/\b(?:men|mens|men's|male)\b/.test(text)) parsed.gender = "Mens";
  if (eraMatch) parsed.era = `${eraMatch[1]}s` as Era;
  if (/\bexcellent\b/.test(text)) parsed.condition = "Excellent";
  else if (/\bfair\b/.test(text)) parsed.condition = "Fair";
  else if (/\bgood\b/.test(text)) parsed.condition = "Good";
  if (/\boversized\b/.test(text)) parsed.fit = "Oversized";
  else if (/\bbaggy\b/.test(text)) parsed.fit = "Baggy";
  else if (/\bfitted\b/.test(text)) parsed.fit = "Fitted";
  else if (/\bregular\b/.test(text)) parsed.fit = "Regular";
  if (priceMatch) parsed.price = Number(priceMatch[1]);
  if (/\b(?:marquee|rare|archive|grail|one of one|1 of 1)\b/.test(text)) {
    parsed.badge = "RARE";
    parsed.rareBadge = "ARCHIVE";
  }

  const titleParts = [brand ?? current.brand, parsed.era ?? current.era, categoryMatch?.item].filter(Boolean);
  if (titleParts.length >= 2) {
    parsed.name = titleParts.join(" ");
    parsed.vintedTitle = titleParts.join(" ");
  }
  return parsed;
}

function money(value: number | string) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function aiPrice(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

// Tax years offered in pickers: 2023-24 up to the current one.
function taxYearOptions() {
  const current = Number(taxYear(new Date().toISOString()).slice(0, 4));
  return Array.from({ length: current - 2023 + 1 }, (_, index) => taxYear(`${2023 + index}-06-01`));
}

function downloadCsv(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `stacked-racks-hmrc-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<string[]>([]);
  const [scheduledReleases, setScheduledReleases] = useState<Record<string, string>>({});
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(defaultScheduleConfig);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());
  const [productSearch, setProductSearch] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [stageFilter, setStageFilter] = useState<"to_confirm" | "sold" | "all">("to_confirm");
  const [copyNote, setCopyNote] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [showManualSale, setShowManualSale] = useState(false);
  const [thirtyDaysAgo] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [manualSale, setManualSale] = useState({ item_id: "", customer_name: "", item_name: "", brand: "", price: 0, cost_price: 0, postage: 0, total: 0, notes: "Vinted sale" });
  const [vintedSaleProduct, setVintedSaleProduct] = useState<Product | null>(null);
  const [vintedSale, setVintedSale] = useState({ purchasePrice: "", soldPrice: "", channel: "vinted" });
  const [sellSearch, setSellSearch] = useState("");
  const [recordingVintedSale, setRecordingVintedSale] = useState(false);

  const [form, setForm] = useState<Omit<Product, "id">>(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickDetails, setQuickDetails] = useState("");
  const [photoAnalysis, setPhotoAnalysis] = useState("");
  const [sellerNotes, setSellerNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listingMessage, setListingMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    setDataError("");
    try {
      const [ordersResponse, productsResponse] = await Promise.all([
        fetch("/api/admin-orders", { cache: "no-store" }),
        fetch("/api/products?admin=true", { cache: "no-store" }),
      ]);
      if (ordersResponse.status === 401) {
        setAuthenticated(false);
        return;
      }
      const ordersData = await ordersResponse.json();
      const productsData = await productsResponse.json();
      if (!ordersResponse.ok) throw new Error(ordersData.error ?? "Could not load orders");
      setOrders(ordersData.orders ?? []);
      const deletedIds = new Set<string>(productsData.deletedProductIds ?? []);
      setProducts((productsData.products ?? []).filter((product: Product) => !deletedIds.has(String(product.id))));
      setHiddenProductIds(productsData.hiddenProductIds ?? []);
      setScheduledReleases(productsData.scheduledReleases ?? {});
      setScheduleConfig(productsData.scheduleConfig ?? defaultScheduleConfig());
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not load dashboard data");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
        setConfigured(Boolean(data.configured));
        if (data.authenticated) void loadDashboard();
      })
      .finally(() => setCheckingAuth(false));
  }, [loadDashboard]);

  const handleLogin = async () => {
    setLoginError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoginError(data.error ?? "Could not sign in");
      return;
    }
    setPassword("");
    setAuthenticated(true);
    await loadDashboard();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
  };

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const staged = stageFilter === "all" ? orders : orders.filter((order) => saleStage(order) === stageFilter);
    if (!query) return staged;
    return staged.filter((order) => `${order.id} ${order.customer_name} ${order.item_name} ${order.brand}`.toLowerCase().includes(query));
  }, [orders, search, stageFilter]);
  const toConfirmCount = orders.filter((order) => saleStage(order) === "to_confirm").length;
  const soldCount = orders.filter((order) => saleStage(order) === "sold").length;

  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const recentRevenue = paidOrders
    .filter((order) => new Date(order.date_of_sale).getTime() >= thirtyDaysAgo)
    .reduce((sum, order) => sum + Number(order.total), 0);
  const pendingFulfilment = orders.filter((order) => order.payment_status === "paid" && !["dispatched", "delivered"].includes(order.fulfilment_status ?? "paid")).length;
  const averageOrder = paidOrders.length ? revenue / paidOrders.length : 0;
  const inventoryCost = products.filter((product) => product.stock > 0).reduce((sum, product) => sum + (Number(product.costPrice) || 0) * product.stock, 0);
  const soldStockCost = paidOrders.reduce((sum, order) => sum + orderPurchaseCost(order, products), 0);
  const grossProfitBeforeFees = paidOrders.reduce((sum, order) => sum + Number(order.price) - orderPurchaseCost(order, products), 0);
  // 20% estimate over every paid sale (delivered or not), so it shows what to set aside as sales come in.
  const taxToSetAside = paidOrders.reduce((sum, order) => sum + orderTax(order, products), 0);
  const currentTaxYear = taxYear(new Date().toISOString());
  const taxThisYear = paidOrders.filter((order) => taxYear(order.date_of_sale) === currentTaxYear).reduce((sum, order) => sum + orderTax(order, products), 0);
  const accountRowList = accountRows(orders, products, exportFrom, exportTo);
  const taxRows = taxSummary(orders, products, true);
  const managedProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const sorted = products.filter((product) => product.listingStatus !== "draft").sort((a, b) =>
      new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime(),
    );
    if (!query) return sorted.slice(0, 5);
    return sorted.filter((product) => `${product.name} ${product.brand}`.toLowerCase().includes(query));
  }, [productSearch, products]);
  const sellableProducts = useMemo(() => {
    const query = sellSearch.trim().toLowerCase();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    return products
      .filter((product) => product.stock > 0 && product.listingStatus !== "draft" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(product.id)))
      .filter((product) => query ? `${product.name} ${product.brand} ${product.sku ?? ""}`.toLowerCase().includes(query) : product.listedDate >= weekAgo)
      .sort((a, b) => b.listedDate.localeCompare(a.listedDate));
  }, [sellSearch, products]);
  const draftProducts = useMemo(() => products.filter((product) => product.listingStatus === "draft"), [products]);
  const pricingApprovalRequired = form.pricingStatus === "needs_review";
  const vintedSaleByProductId = useMemo(() => {
    const sales = new Map<string, OrderRow>();
    orders.forEach((order) => {
      if (isRecordedSale(order)) sales.set(String(order.item_id), order);
    });
    return sales;
  }, [orders]);

  const recordManualSale = async () => {
    if (manualSale.item_id) {
      const response = await fetch("/api/admin-vinted-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: manualSale.item_id,
          purchasePrice: manualSale.cost_price,
          soldPrice: manualSale.price,
        }),
      });
      const data = await response.json();
      if (!response.ok) return setDataError(data.error ?? "Could not save Vinted sale");
      setShowManualSale(false);
      setManualSale({ item_id: "", customer_name: "", item_name: "", brand: "", price: 0, cost_price: 0, postage: 0, total: 0, notes: "Vinted sale" });
      await loadDashboard();
      window.dispatchEvent(new CustomEvent("sr:products-updated"));
      return;
    }

    const total = manualSale.total || manualSale.price + manualSale.postage;
    const response = await fetch("/api/admin-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...manualSale, total, payment_status: "paid" }),
    });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not save sale");
    setShowManualSale(false);
    setManualSale({ item_id: "", customer_name: "", item_name: "", brand: "", price: 0, cost_price: 0, postage: 0, total: 0, notes: "Vinted sale" });
    await loadDashboard();
  };

  const updateOrder = async (order: OrderRow, fulfilmentStatus: string) => {
    let trackingNumber = order.tracking_number ?? "";
    if (fulfilmentStatus === "dispatched") {
      trackingNumber = window.prompt("Royal Mail tracking number (leave blank if none)", trackingNumber) ?? trackingNumber;
    }
    const response = await fetch("/api/admin-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: order.id,
        fulfilment_status: fulfilmentStatus,
        payment_status: fulfilmentStatus === "refunded" ? "refunded" : undefined,
        tracking_number: trackingNumber,
      }),
    });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not update order");
    await loadDashboard();
  };

  const saveOrderPrices = async (order: OrderRow, changes: { price?: number; cost_price?: number; bought_from?: string; cost_tax_year?: string }) => {
    const response = await fetch("/api/admin-orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, ...changes }) });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not update prices");
    await loadDashboard();
  };

  const copyForSheets = async () => {
    const text = toTsv(accountRowList);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFallback("");
      setCopyNote(`Copied ${accountRowList.length} rows. Paste under the last row of your Google Sheet.`);
    } catch {
      setCopyFallback(text);
      setCopyNote("Copy blocked by the browser: select the text below and copy it.");
    }
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const urls = [...(form.imageUrls ?? [])];
    const next = index + direction;
    if (next < 0 || next >= urls.length) return;
    [urls[index], urls[next]] = [urls[next], urls[index]];
    setForm({ ...form, imageUrls: urls });
  };

  const removePhoto = async (url: string) => {
    setForm((current) => ({ ...current, imageUrls: current.imageUrls?.filter((item) => item !== url) }));
    await fetch("/api/admin/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setListingMessage("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 6 - (form.imageUrls?.length ?? 0))) {
        setListingMessage(`Optimising ${file.name}…`);
        let preparedFile: File;
        try {
          preparedFile = await optimisePhotoForUpload(file);
        } catch {
          throw new Error(`Could not read ${file.name}. Please export it as JPG and try again.`);
        }

        if (preparedFile.size > SAFE_UPLOAD_BYTES) {
          throw new Error(`${file.name} is still too large after preparing. Please crop it slightly and try again.`);
        }

        setListingMessage(`Uploading ${file.name}…`);
        const uploadBody = new FormData();
        uploadBody.append("file", preparedFile);
        const response = await fetch("/api/admin/upload", { method: "POST", body: uploadBody });
        const uploaded = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(uploaded.error ?? `Could not upload ${file.name}`);
        urls.push(uploaded.url);
      }
      setForm((current) => ({ ...current, imageUrls: [...(current.imageUrls ?? []), ...urls] }));
      setListingMessage(`${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const replaceEditedPhoto = (oldUrl: string, newUrl: string) => {
    setForm((current) => ({ ...current, imageUrls: current.imageUrls?.map((url) => url === oldUrl ? newUrl : url) }));
    setEditingPhoto(null);
    setListingMessage("Photo crop and rotation saved");
  };

  const generateListing = async (overrides: Partial<Omit<Product, "id">> = {}, notesOverride?: string, mode: "listing" | "photos" = "listing") => {
    setGenerating(true);
    setListingMessage("");
    const listingForm = { ...form, ...overrides };
    const combinedNotes = [
      mode === "listing" && photoAnalysis ? `Previous photo analysis: ${photoAnalysis}` : "",
      notesOverride ?? sellerNotes,
    ].filter(Boolean).join("\n\n");
    try {
      const response = await fetch("/api/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: mode === "photos" ? "" : listingForm.brand,
          category: mode === "photos" ? "" : listingForm.category,
          era: mode === "photos" ? "" : listingForm.era,
          condition: mode === "photos" ? "" : listingForm.condition,
          size: mode === "photos" ? "" : listingForm.size,
          fit: mode === "photos" ? "" : listingForm.fit,
          gender: mode === "photos" ? "" : listingForm.gender,
          badge: mode === "photos" ? "NEW" : listingForm.badge,
          notes: combinedNotes,
          imageUrls: listingForm.imageUrls,
          mode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "AI generation failed");
      const suggestedPriceLow = aiPrice(data.suggestedPriceLow);
      const suggestedPriceHigh = aiPrice(data.suggestedPriceHigh);
      const needsPricingReview = String(data.pricingReview).toLowerCase().includes("needs");
      setForm((current) => ({
        ...current,
        ...overrides,
        name: data.websiteTitle || overrides.name || current.name,
        description: data.websiteDescription || overrides.description || current.description,
        vintedTitle: data.vintedTitle || overrides.vintedTitle || current.vintedTitle,
        vintedDescription: data.vintedDescription || overrides.vintedDescription || current.vintedDescription,
        brand: data.suggestedBrand || overrides.brand || current.brand,
        category: CATEGORIES.includes(data.suggestedCategory) ? data.suggestedCategory : overrides.category || current.category,
        era: ERAS.includes(data.suggestedEra) ? data.suggestedEra : overrides.era || current.era,
        condition: (["Excellent", "Good", "Fair"] as const).includes(data.suggestedCondition) ? data.suggestedCondition : overrides.condition || current.condition,
        size: SIZES.includes(data.suggestedSize) ? data.suggestedSize : overrides.size || current.size,
        gender: (["Mens", "Womens"] as const).includes(data.suggestedGender) ? data.suggestedGender : overrides.gender || current.gender,
        fit: FITS.includes(data.suggestedFit) ? data.suggestedFit : overrides.fit || current.fit,
        badge: mode === "photos" ? (String(data.suggestedMarquee).toLowerCase() === "yes" ? "RARE" : "NEW") : overrides.badge || current.badge,
        rareBadge: mode === "photos" ? (String(data.suggestedMarquee).toLowerCase() === "yes" ? "ARCHIVE" : undefined) : overrides.rareBadge ?? current.rareBadge,
        garmentDetails: {
          ...current.garmentDetails,
          colour: data.suggestedColour || current.garmentDetails?.colour,
          material: data.suggestedMaterial || current.garmentDetails?.material,
          flaws: data.visibleFlaws || current.garmentDetails?.flaws,
        },
        price: current.price > 0 ? current.price : suggestedPriceLow ?? suggestedPriceHigh ?? current.price,
        pricingStatus: needsPricingReview ? "needs_review" : "standard",
        suggestedPriceLow,
        suggestedPriceHigh,
        pricingReason: data.pricingReason || "",
        pricingSearchQuery: data.pricingSearchQuery || data.vintedTitle || data.websiteTitle || "",
        pricingReviewedAt: undefined,
      }));
      if (mode === "photos") setPhotoAnalysis(data.photoFindings || "Photos analysed successfully.");
      setListingMessage(mode === "photos" ? "Pictures analysed and fields populated — add any extra details above, then merge with AI" : "Draft generated — check the details before publishing");
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const generateQuickListing = async () => {
    const parsed = parseQuickListing(quickDetails, form);
    setForm((current) => ({ ...current, ...parsed }));
    setSellerNotes(quickDetails);
    await generateListing(parsed, quickDetails);
  };

  const analysePhotos = async () => {
    await generateListing({}, quickDetails || sellerNotes, "photos");
  };

  useEffect(() => {
    const timer = window.setInterval(() => setScheduleNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const scheduleDate = (at: string) => new Date(at).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });
  const upcomingDrops: Record<string, Product[]> = {};
  for (const product of products) {
    const at = scheduledReleases[String(product.id)];
    if (at && Date.parse(at) > scheduleNow) (upcomingDrops[at] ??= []).push(product);
  }
  const patchSchedule = async (body: unknown) => {
    const response = await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not update release schedule");
  };
  const updateSchedule = async (body: unknown, message: string) => {
    setScheduleBusy(true);
    setScheduleMessage("");
    try {
      await patchSchedule(body);
      await loadDashboard();
      setScheduleNow(Date.now());
      setScheduleMessage(message);
      window.dispatchEvent(new CustomEvent("sr:products-updated"));
    } catch (error) {
      setScheduleMessage(error instanceof Error ? error.message : "Could not update release schedule");
    } finally { setScheduleBusy(false); }
  };

  const saveProduct = async (listingStatus: "live" | "draft" = "live", schedule = false) => {
    if (listingStatus === "live" && pricingApprovalRequired) {
      setListingMessage("Review and approve the suggested pricing before publishing this collectible or uncertain item.");
      return;
    }
    setSaving(true);
    setListingMessage("");
    try {
      const productForSave = {
        ...form,
        listingStatus,
        listedDate: editingId ? form.listedDate : new Date().toISOString().slice(0, 10),
      };
      const response = await fetch("/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, product: productForSave, hidden: schedule || undefined } : { ...productForSave, hidden: schedule || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save product");
      if (schedule) {
        setEditingId(String(data.product.id));
        try { await patchSchedule({ schedule: { auto: [String(data.product.id)] } }); }
        catch (error) {
          await loadDashboard();
          throw new Error(`Listing saved privately, but scheduling failed: ${error instanceof Error ? error.message : "try again"}`);
        }
      }
      setListingMessage(schedule ? "Listing added to the release schedule" : listingStatus === "draft" ? "Saved safely in To be uploaded — it is not public" : editingId ? "Product updated" : "Product published to the website");
      setEditingId(null);
      setForm({ ...EMPTY_PRODUCT, listedDate: new Date().toISOString().slice(0, 10) });
      setQuickDetails("");
      setPhotoAnalysis("");
      setSellerNotes("");
      await loadDashboard();
      window.dispatchEvent(new CustomEvent("sr:products-updated"));
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (product: Product) => {
    const { id, ...details } = product;
    setEditingId(String(id));
    setForm({ ...EMPTY_PRODUCT, ...details, imageUrls: details.imageUrls ?? [] });
    setQuickDetails("");
    setPhotoAnalysis("");
    setSellerNotes("");
    setTab("listings");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateStock = async (product: Product) => {
    const { id, ...details } = product;
    const nextStock = product.stock > 0 ? 0 : 1;
    const response = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, product: { ...details, stock: nextStock } }),
    });
    const data = await response.json();
    if (!response.ok) {
      setDataError(data.error ?? "Could not update the listing status");
      return;
    }
    if (String(id) === editingId) {
      setForm((current) => ({ ...current, stock: nextStock }));
      setListingMessage(nextStock > 0 ? "Product relisted on the website" : "Product marked as sold and removed from the shop");
    }
    setDataError("");
    await loadDashboard();
    window.dispatchEvent(new CustomEvent("sr:products-updated"));
  };

  const setPurchasePrice = async (product: Product) => {
    const value = window.prompt(`What did you pay for ${product.name}?`, product.costPrice === undefined ? "" : String(product.costPrice));
    if (value === null) return;
    const purchasePrice = Number(value);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      setDataError("Enter a valid purchase price of £0 or more");
      return;
    }
    const { id, ...details } = product;
    const response = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, product: { ...details, costPrice: purchasePrice } }),
    });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not save purchase price");
    setDataError("");
    await loadDashboard();
  };

  const openVintedSale = (product: Product) => {
    setDataError("");
    setVintedSaleProduct(product);
    setVintedSale({
      purchasePrice: product.costPrice === undefined ? "" : String(product.costPrice),
      soldPrice: String(product.price),
      channel: "vinted",
    });
  };

  const recordVintedProductSale = async () => {
    if (!vintedSaleProduct) return;
    const purchasePrice = Number(vintedSale.purchasePrice);
    const soldPrice = Number(vintedSale.soldPrice);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0 || !Number.isFinite(soldPrice) || soldPrice <= 0) {
      setDataError("Enter both the purchase price and the sold price");
      return;
    }
    setRecordingVintedSale(true);
    setDataError("");
    try {
      const response = await fetch("/api/admin-vinted-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: String(vintedSaleProduct.id), purchasePrice, soldPrice, channel: vintedSale.channel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not record Vinted sale");
      setVintedSaleProduct(null);
      setVintedSale({ purchasePrice: "", soldPrice: "", channel: "vinted" });
      await loadDashboard();
      window.dispatchEvent(new CustomEvent("sr:products-updated"));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not record Vinted sale");
    } finally {
      setRecordingVintedSale(false);
    }
  };

  const toggleProductVisibility = async (product: Product) => {
    setDataError("");
    const id = String(product.id);
    const hidden = !hiddenProductIds.includes(id);
    const response = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: { id, hidden } }),
    });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not change product visibility");
    await loadDashboard();
    window.dispatchEvent(new CustomEvent("sr:products-updated"));
  };

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Permanently delete ${product.name}? This cannot be undone from the dashboard.`)) return;
    const response = await fetch(`/api/products?id=${encodeURIComponent(String(product.id))}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not delete product");
    await loadDashboard();
    window.dispatchEvent(new CustomEvent("sr:products-updated"));
  };

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#666]">Checking admin access…</div>;
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111] border border-white/10 p-7">
          <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3">Private area</p>
          <h1 className="text-white text-2xl font-black mb-1">Stacked Racks Admin</h1>
          <p className="text-[#666] text-sm mb-6">Orders, listings, email marketing and HMRC exports.</p>
          {!configured && <p className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/20 p-3 mb-4">Admin password still needs to be configured on Vercel.</p>}
          <label className={LABEL}>Admin password</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void handleLogin()} className={`${INPUT} mb-3`} />
          {loginError && <p className="text-red-400 text-xs mb-3">{loginError}</p>}
          <button onClick={handleLogin} disabled={!password || !configured} className="w-full bg-[#E8500A] disabled:opacity-40 text-white font-black text-xs tracking-[0.2em] uppercase py-3">Sign in</button>
        </div>
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 bg-[#0d0d0d]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="font-black tracking-widest text-sm">STACKED RACKS — ADMIN</h1><p className="text-[#555] text-[10px] mt-1">Live shop management</p></div>
          <nav className="flex gap-1">
            {(["orders", "listings", "scheduler", "analytics", "email"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 text-[10px] font-black tracking-[0.16em] uppercase border ${tab === item ? "bg-[#E8500A] border-[#E8500A]" : "border-white/10 text-[#777]"}`}>{item === "orders" ? "Sales" : item === "listings" ? "Listing studio" : item === "scheduler" ? "Scheduler" : item === "analytics" ? "Analytics" : "Email & promos"}</button>)}
          </nav>
          <button onClick={handleLogout} className="text-[#666] hover:text-white text-xs">Sign out</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        {dataError && <div className="border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-4 mb-5">{dataError}</div>}
        {loadingData && <p className="text-[#666] text-xs mb-4">Refreshing live data…</p>}

        {tab === "orders" && (
          <section>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
              {[{ label: "Paid orders", value: paidOrders.length }, { label: "All-time revenue", value: money(revenue) }, { label: "Last 30 days", value: money(recentRevenue) }, { label: "Average order", value: money(averageOrder) }, { label: "Needs packing", value: pendingFulfilment }, { label: "Unsold stock cost", value: money(inventoryCost) }, { label: "Sold stock cost", value: money(soldStockCost) }, { label: "Gross profit before fees", value: money(grossProfitBeforeFees) }, { label: `Tax likely to pay · year ending April ${Number(currentTaxYear.slice(0, 4)) + 1} (20% est.)`, value: money(taxThisYear) }, { label: "Profit after cost and tax", value: money(grossProfitBeforeFees - taxToSetAside) }].map((stat) => <div key={stat.label} className="bg-[#111] border border-white/8 p-5"><p className="text-[#888] text-[9px] uppercase tracking-[0.2em] mb-2">{stat.label}</p><p className="text-2xl font-black">{stat.value}</p></div>)}
            </div>
            <div className="bg-[#111] border border-white/8 p-5 mb-7 max-w-4xl">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h2 className="text-xl font-black">Mark an item sold</h2><p className="text-[#777] text-xs mt-1">{sellSearch.trim() ? `${sellableProducts.length} in-stock items match` : `${sellableProducts.length} items listed in the last 7 days`} · Tap one to record where it sold. Scroll down for more.</p></div><input type="search" aria-label="Search items to mark sold" value={sellSearch} onChange={(event) => setSellSearch(event.target.value)} placeholder="Search any in-stock item…" className={`${INPUT} sm:max-w-xs`} /></div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-[22rem] overflow-y-auto">{sellableProducts.map((product) => <button key={String(product.id)} type="button" onClick={() => openVintedSale(product)} aria-label={`Mark ${product.name} sold`} className="min-w-0 text-left border border-white/10 hover:border-[#F5C300] p-1">
                <span className="relative block aspect-[3/4] bg-[#222] overflow-hidden">{product.imageUrls?.[0] ? <Image src={product.imageUrls[0]} alt="" fill sizes="(max-width: 640px) 33vw, 180px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-[#666] text-[9px]">No photo</span>}</span>
                <span className="text-[10px] leading-tight font-bold mt-1 line-clamp-2 break-words">{product.name}</span><span className="block truncate text-[9px] leading-tight text-[#999] mt-0.5">{productSizeLabel(product)} · {money(product.price)}</span>
              </button>)}{!sellableProducts.length && <p className="col-span-full text-[#777] text-xs py-5 text-center">{sellSearch.trim() ? "No in-stock items match." : "Nothing listed in the last 7 days. Search to find an older item."}</p>}</div>
            </div>
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <div className="flex gap-2">{([["to_confirm", `To be confirmed (${toConfirmCount})`], ["sold", `Sold (${soldCount})`], ["all", "All"]] as const).map(([value, label]) => <button key={value} onClick={() => setStageFilter(value)} className={`px-3 py-2.5 text-[10px] font-black tracking-wider uppercase border ${stageFilter === value ? "bg-[#F5C300] text-[#0a0a0a] border-[#F5C300]" : "border-white/10 text-[#aaa]"}`}>{label}</button>)}</div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, item or order…" className={`${INPUT} sm:max-w-xs`} />
              <button onClick={() => setShowManualSale(true)} className="bg-[#E8500A] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Record Vinted sale</button>
              <label className="text-[#aaa] text-[9px] uppercase tracking-wider">From <input type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} className="ml-1 bg-[#171717] border border-white/10 px-2 py-2 text-white" /></label>
              <label className="text-[#aaa] text-[9px] uppercase tracking-wider">To <input type="date" value={exportTo} onChange={(event) => setExportTo(event.target.value)} className="ml-1 bg-[#171717] border border-white/10 px-2 py-2 text-white" /></label>
              <button onClick={() => downloadCsv(toCsv(accountRowList))} className="border border-[#F5C300]/40 text-[#F5C300] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Export {accountRowList.length} confirmed to HMRC CSV</button>
              <button onClick={() => void copyForSheets()} className="border border-[#F5C300]/40 text-[#F5C300] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Copy {accountRowList.length} for Google Sheets</button>
              <button onClick={loadDashboard} className="border border-white/10 text-[#888] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Refresh</button>
            </div>
            {copyNote && <p className="text-[#F5C300] text-[10px] mb-2">{copyNote}</p>}
            {copyFallback && <textarea readOnly value={copyFallback} onFocus={(event) => event.target.select()} autoFocus className="w-full h-32 mb-4 bg-[#171717] border border-white/10 p-2 text-xs text-white" />}
            <p className="text-[#666] text-[10px] mb-4">HMRC CSV and Google Sheets copy include confirmed sales only (marked delivered), with what you paid and gross profit before fees.</p>
            {taxRows.length > 0 && <div className="bg-[#111] border border-white/8 mb-6 overflow-x-auto">
              <p className="px-4 pt-4 text-[#F5C300] text-[10px] font-black uppercase tracking-[0.2em]">Tax calculation (estimate at 20%)</p>
              <p className="px-4 pt-1 text-[#777] text-[10px]">Every paid sale, delivered or still on its way (refunded sales drop out). Items bought in 2024-25 or earlier were already deducted, so they are taxed on the full sale price and their cost is listed under the year it was bought. Items bought from 2025-26 on are taxed on profit only. An estimate only: no personal allowance or other rates; check with an accountant.</p>
              <table className="w-full min-w-[720px] text-left mt-2">
                <thead><tr className="border-b border-white/10">{["Tax year", "Paid sales", "Revenue", "Costs deducted", "Tax estimate (20%)", "Costs to claim this year"].map((heading) => <th key={heading} className="px-4 py-2 text-[#888] text-[9px] tracking-[0.18em] uppercase">{heading}</th>)}</tr></thead>
                <tbody>{taxRows.map((row) => <tr key={row.year} className="border-b border-white/5"><td className="px-4 py-2 font-bold">{row.year}</td><td className="px-4 py-2">{row.sales}</td><td className="px-4 py-2">{money(row.revenue)}</td><td className="px-4 py-2">{money(row.costsDeducted)}</td><td className="px-4 py-2 text-[#F5C300] font-black">{money(row.tax)}</td><td className="px-4 py-2">{money(row.costsToClaim)}</td></tr>)}</tbody>
              </table>
            </div>}
            <div className="bg-[#111] border border-white/8 overflow-x-auto">
              <table className="w-full min-w-[1560px] text-left">
                <thead><tr className="border-b border-white/10">{["Date", "Order", "Customer", "Item", "Source", "Payment", "Fulfilment", "Item cost", "Bought", "Gross profit", "Tax est.", "After tax", "Total"].map((heading) => <th key={heading} className="px-4 py-3 text-[#888] text-[9px] tracking-[0.18em] uppercase">{heading}</th>)}</tr></thead>
                <tbody>{filteredOrders.map((order) => {
                  const purchaseCost = orderPurchaseCost(order, products);
                  const toConfirm = saleStage(order) === "to_confirm";
                  const boughtFrom = orderBoughtFrom(order, products);
                  const costYear = orderCostTaxYear(order, products);
                  const editableBought = order.payment_status === "paid" && (order.items?.length ?? 0) <= 1;
                  return <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]"><td className="px-4 py-3 text-[#999] text-xs">{new Date(order.date_of_sale).toLocaleDateString("en-GB")}</td><td className="px-4 py-3 text-[#E8500A] text-xs font-bold">{order.id}</td><td className="px-4 py-3"><p className="text-sm font-semibold">{order.customer_name}</p><p className="text-[#888] text-[10px]">{order.customer_email}</p></td><td className="px-4 py-3"><p className="text-sm">{order.item_name}</p><p className="text-[#888] text-[10px]">{order.brand}</p></td><td className="px-4 py-3 text-[#999] text-xs uppercase">{order.source}</td><td className="px-4 py-3"><span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[9px] uppercase">{order.payment_status}</span></td><td className="px-4 py-3"><select aria-label={`Fulfilment status for ${order.id}`} value={order.fulfilment_status ?? (order.payment_status === "paid" ? "paid" : order.payment_status)} onChange={(event) => void updateOrder(order, event.target.value)} className="bg-[#171717] border border-white/10 text-white text-[10px] uppercase px-2 py-2"><option value="paid">Paid</option><option value="packing">Packing</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option><option value="returned">Returned</option><option value="refunded">Refunded</option></select>{order.tracking_number && <p className="text-[#F5C300] text-[9px] mt-1 max-w-32 truncate" title={order.tracking_number}>{order.tracking_number}</p>}{toConfirm && <div className="flex gap-1 mt-1">{order.fulfilment_status !== "dispatched" && <button onClick={() => void updateOrder(order, "dispatched")} className="border border-white/15 px-2 py-1 text-[9px] uppercase">Posted</button>}<button onClick={() => void updateOrder(order, "delivered")} className="bg-[#F5C300] text-[#0a0a0a] px-2 py-1 text-[9px] font-black uppercase">Confirm sold</button></div>}</td><td className="px-4 py-3 text-[#aaa] font-bold">{toConfirm ? <input aria-label={`Bought price for ${order.id}`} key={`${order.id}-cost-${purchaseCost}`} type="number" min="0" step="0.01" defaultValue={purchaseCost} onBlur={(event) => { const value = parseMoney(event.target.value); if (value !== null && value !== purchaseCost) void saveOrderPrices(order, { cost_price: value }); }} className="w-20 bg-[#171717] border border-white/10 px-2 py-1 text-white text-xs" /> : money(purchaseCost)}</td><td className="px-4 py-3">{editableBought ? <div className="grid gap-1"><input aria-label={`Bought from for ${order.id}`} key={`${order.id}-from-${boughtFrom}`} defaultValue={boughtFrom} placeholder="Bought from" onBlur={(event) => { const value = event.target.value.trim(); if (value !== boughtFrom) void saveOrderPrices(order, { bought_from: value }); }} className="w-32 bg-[#171717] border border-white/10 px-2 py-1 text-white text-xs" /><select aria-label={`Cost tax year for ${order.id}`} value={costYear} onChange={(event) => void saveOrderPrices(order, { cost_tax_year: event.target.value })} className="w-32 bg-[#171717] border border-white/10 px-2 py-1 text-white text-xs"><option value="">Cost year?</option>{taxYearOptions().map((year) => <option key={year} value={year}>{year}</option>)}</select></div> : <p className="text-xs text-[#aaa]">{boughtFrom || "—"}<br />{costYear}</p>}</td><td className="px-4 py-3 text-[#F5C300] font-black">{money(Number(order.price) - purchaseCost)}</td><td className="px-4 py-3 text-[#F5C300] text-xs font-bold">{saleStage(order) === "other" ? "—" : money(orderTax(order, products))}</td><td className="px-4 py-3 text-xs font-bold">{saleStage(order) === "other" ? "—" : money(Number(order.price) - purchaseCost - orderTax(order, products))}</td><td className="px-4 py-3 font-black">{toConfirm ? <input aria-label={`Sold price for ${order.id}`} key={`${order.id}-price-${order.price}`} type="number" min="0" step="0.01" defaultValue={Number(order.price)} onBlur={(event) => { const value = parseMoney(event.target.value); if (value !== null && value !== Number(order.price)) void saveOrderPrices(order, { price: value }); }} className="w-20 bg-[#171717] border border-white/10 px-2 py-1 text-white text-xs" /> : money(order.total)}</td></tr>;
                })}</tbody>
              </table>
              {!filteredOrders.length && <p className="text-[#555] text-center py-14">No sales recorded yet.</p>}
            </div>
          </section>
        )}

        {tab === "listings" && (
          <section className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
            <div className="space-y-5">
              <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">Photo-first listing</p><h2 className="text-xl font-black">{editingId ? "Edit product" : "Create a product"}</h2><p className="text-[#666] text-xs mt-1">Upload the photos, let AI read them, then add anything it could not see.</p></div>{editingId && <button onClick={() => { setEditingId(null); setForm(EMPTY_PRODUCT); setQuickDetails(""); setPhotoAnalysis(""); setSellerNotes(""); }} className="text-[#777] text-xs">Cancel edit</button>}</div>
                {editingId && <button type="button" onClick={() => void updateStock({ id: editingId, ...form })} className={`mb-5 w-full border px-5 py-4 text-sm font-black uppercase tracking-[0.16em] ${form.stock > 0 ? "border-red-500/60 bg-red-500/10 text-red-300 hover:bg-red-500/20" : "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"}`}>{form.stock > 0 ? "Mark as sold — remove from site" : "Relist on site"}</button>}
                <label className="block border-2 border-dashed border-white/10 hover:border-[#E8500A]/50 p-7 text-center cursor-pointer mb-4"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden" onChange={(event) => { void uploadPhotos(event.target.files); event.target.value = ""; }} disabled={uploading} /><span className="text-sm font-bold">{uploading ? "Uploading and preparing photos…" : "Choose product photos"}</span><span className="block text-[#777] text-[10px] mt-1">JPG, PNG, WEBP or HEIC · up to 50MB each · orientation fixed automatically</span></label>
                {!!form.imageUrls?.length && <><p className="text-[#888] text-[10px] mb-2">Photos appear here when ready. The preview shows the whole image without cropping. Tap <strong className="text-white">Crop / rotate</strong> only when an adjustment is needed.</p><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">{form.imageUrls.map((url, index) => <div key={url} className="relative bg-[#1a1a1a] group border border-white/10"><div className="relative aspect-[3/4]"><Image src={url} alt={`Product photo ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 150px" className="object-contain p-1" /><span className="absolute top-1 left-1 bg-black/80 px-1.5 py-1 text-[8px] font-black">{index === 0 ? "COVER" : index + 1}</span><button aria-label={`Remove photo ${index + 1}`} onClick={() => void removePhoto(url)} className="absolute top-1 right-1 bg-black/80 w-7 h-7 text-xs">×</button></div><button onClick={() => setEditingPhoto(url)} className="w-full bg-[#E8500A] py-2 text-[9px] font-black uppercase tracking-wider">Crop / rotate</button><div className="p-1 flex justify-between"><button aria-label="Move photo left" disabled={index === 0} onClick={() => movePhoto(index, -1)} className="bg-black/80 disabled:opacity-30 w-8 h-7">←</button>{index > 0 && <button onClick={() => { const urls = [...(form.imageUrls ?? [])]; urls.splice(index, 1); urls.unshift(url); setForm({ ...form, imageUrls: urls }); }} className="bg-black/80 px-2 text-[8px]">Make cover</button>}<button aria-label="Move photo right" disabled={index === (form.imageUrls?.length ?? 0) - 1} onClick={() => movePhoto(index, 1)} className="bg-black/80 disabled:opacity-30 w-8 h-7">→</button></div></div>)}</div></>}
                <div className="mb-5 flex flex-wrap items-center gap-3"><button onClick={() => void analysePhotos()} disabled={generating || !form.imageUrls?.length} className="bg-[#E8500A] disabled:opacity-40 text-white font-black text-xs tracking-[0.16em] uppercase px-5 py-3">{generating ? "Reading pictures…" : "Analyse pictures"}</button><span className="text-[#666] text-[10px]">Reads labels, logos, colours, item details and visible condition. Paid web search stays off.</span></div>
                {photoAnalysis && <div className="mb-5 border border-[#E8500A]/25 bg-[#E8500A]/[0.05] p-4"><p className="text-[#E8500A] text-[9px] font-black tracking-[0.18em] uppercase mb-2">What the pictures show</p><p className="text-[#bbb] text-xs leading-relaxed">{photoAnalysis}</p><a href={`https://www.google.com/search?q=${encodeURIComponent([form.brand, form.name, form.era, form.garmentDetails?.colour].filter(Boolean).join(" "))}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-[#F5C300] text-[10px] font-black uppercase tracking-wider">Search the web for a matching item ↗</a></div>}
                <div className="mb-5 border border-[#F5C300]/25 bg-[#F5C300]/[0.04] p-4">
                  <label className="block text-[#F5C300] text-[10px] font-black tracking-[0.2em] uppercase mb-2">Quick listing — add what the photos cannot show</label>
                  <AutocompleteControl label="Quick listing details" value={quickDetails} onChange={setQuickDetails} rows={3} multiline placeholder="Example: Nike, jacket, medium, men's, 90s, black, good condition, £65" suggestions={LISTING_WORDS} />
                  <div className="mt-3 flex flex-wrap items-center gap-3"><button onClick={() => void generateQuickListing()} disabled={generating || quickDetails.trim().length < 3} className="bg-[#F5C300] disabled:opacity-40 text-black font-black text-xs tracking-[0.14em] uppercase px-5 py-3">{generating ? "Building listing…" : photoAnalysis ? "Merge details with photo analysis" : "Fill every box with AI"}</button><span className="text-[#777] text-[10px]">Include the price with £ if you want that filled too.</span></div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                  <Field label="Brand" value={form.brand} onChange={(value) => setForm({ ...form, brand: value })} placeholder="Nike, Adidas, Vintage…" suggestions={ALL_BRANDS} />
                  <Select label="Category" value={form.category} options={CATEGORIES} onChange={(value) => setForm({ ...form, category: value })} />
                  <Select label="Size" value={form.size} options={SIZES} onChange={(value) => setForm({ ...form, size: value })} />
                  <Select label="Department" value={form.gender} options={["Mens", "Womens"]} optionLabel={displayGender} onChange={(value) => {
                    const gender = value as Product["gender"];
                    setForm({
                      ...form,
                      gender,
                      secondaryGender: form.secondaryGender === gender ? undefined : form.secondaryGender,
                      secondarySize: form.secondaryGender === gender ? undefined : form.secondarySize,
                    });
                  }} />
                  <Field label="Customer sale price (£)" value={form.price || ""} type="number" onChange={(value) => setForm({ ...form, price: Number(value), pricingStatus: form.pricingStatus === "approved" ? "needs_review" : form.pricingStatus, pricingReviewedAt: undefined })} />
                  <Field label="Item cost (£) — private" value={form.costPrice || ""} type="number" onChange={(value) => setForm({ ...form, costPrice: Math.max(0, Number(value)) })} placeholder="Optional" />
                  <Select label="Era" value={form.era} options={ERAS} onChange={(value) => setForm({ ...form, era: value as Era })} />
                  <Select label="Condition" value={form.condition} options={["Excellent", "Good", "Fair"]} onChange={(value) => setForm({ ...form, condition: value as Condition })} />
                  <Select label="Fit" value={form.fit} options={FITS} onChange={(value) => setForm({ ...form, fit: value as Fit })} />
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 border border-white/10 bg-[#171717] p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.secondaryGender)}
                      onChange={(event) => setForm({
                        ...form,
                        secondaryGender: event.target.checked ? (form.gender === "Mens" ? "Womens" : "Mens") : undefined,
                        secondarySize: event.target.checked ? (form.secondarySize || form.size) : undefined,
                        displaySize: event.target.checked ? form.displaySize : undefined,
                      })}
                      className="mt-0.5 accent-[#E8500A]"
                    />
                    <span>
                      <span className="block text-sm font-bold">Also show in {displayGender(form.gender === "Mens" ? "Womens" : "Mens")}</span>
                      <span className="block text-[#666] text-[10px] mt-1">One listing and one shared stock count — never a duplicate item.</span>
                    </span>
                  </label>
                  {form.secondaryGender && <Select label={`${displayGender(form.secondaryGender)} fit size`} value={form.secondarySize || form.size} options={SIZES} onChange={(value) => setForm({ ...form, secondarySize: value })} />}
                </div>
                <div className="mt-4">
                  <Field label="Customer-facing size label" value={form.displaySize ?? ""} onChange={(value) => setForm({ ...form, displaySize: value })} placeholder={form.secondaryGender ? "Men's XS / Women's M" : "Women's M / UK 10"} />
                  <p className="text-[#666] text-[10px] mt-2">Optional. Use this for dual-fit or UK-numbered sizing; the department filters still use the size fields above.</p>
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 border border-white/10 bg-[#171717] p-4 cursor-pointer"><input type="checkbox" checked={form.badge === "RARE"} onChange={(event) => setForm({ ...form, badge: event.target.checked ? "RARE" : "NEW", rareBadge: event.target.checked ? "ARCHIVE" : undefined })} className="mt-0.5 accent-[#E8500A]" /><span><span className="block text-sm font-bold">Show in Marquee</span><span className="block text-[#666] text-[10px] mt-1">Use this for a featured standout piece.</span></span></label>
                  <div className="border border-[#F5C300]/20 bg-[#F5C300]/[0.04] p-4"><p className="text-[#F5C300] text-[9px] font-black tracking-[0.16em] uppercase mb-1">New In — automatic</p><p className="text-[#777] text-[10px] leading-relaxed">Every newly published item stays in New In for 14 days. It then leaves New In automatically but remains in the full shop.</p></div>
                </div>
                <div className="mt-4"><label className={LABEL}>Notes for the AI</label><AutocompleteControl label="Notes for the AI" value={sellerNotes} onChange={setSellerNotes} rows={3} multiline placeholder="Colour, measurements, flaws, label details, fabric if known…" suggestions={LISTING_WORDS} /></div>
                <p className="text-[#555] text-[10px] mt-2">Typing help: enter two letters, then press Tab or → to complete the suggested word.</p>
                <button onClick={() => void generateListing()} disabled={generating || (!form.imageUrls?.length && !form.brand)} className="mt-4 border border-[#F5C300]/40 text-[#F5C300] disabled:opacity-40 font-black text-xs tracking-[0.16em] uppercase px-5 py-3">{generating ? "Writing copy…" : "Regenerate copy from current details"}</button>
              </div>

              <div className="bg-[#111] border border-white/8 p-5 sm:p-6 space-y-4">
                <h3 className="font-black">Review and publish</h3>
                <div className={`border p-4 ${pricingApprovalRequired ? "border-amber-400/40 bg-amber-400/[0.06]" : form.pricingStatus === "approved" ? "border-emerald-400/30 bg-emerald-400/[0.05]" : "border-white/10 bg-[#161616]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[#F5C300] text-[10px] font-black tracking-[0.18em] uppercase">Suggested pricing</p>
                      {form.suggestedPriceLow && form.suggestedPriceHigh
                        ? <p className="mt-2 text-2xl font-black">£{form.suggestedPriceLow}–£{form.suggestedPriceHigh}</p>
                        : <p className="mt-2 text-sm font-bold text-[#888]">Run Analyse pictures to receive a pricing assessment.</p>}
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${pricingApprovalRequired ? "bg-amber-400 text-black" : form.pricingStatus === "approved" ? "bg-emerald-500 text-black" : "bg-white/10 text-[#aaa]"}`}>{pricingApprovalRequired ? "Review required" : form.pricingStatus === "approved" ? "Price approved" : "Standard item"}</span>
                  </div>
                  {form.pricingReason && <p className="mt-3 text-[#bbb] text-xs leading-relaxed">{form.pricingReason}</p>}
                  {form.pricingSearchQuery && <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider"><a href={`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(form.pricingSearchQuery)}&LH_Sold=1&LH_Complete=1`} target="_blank" rel="noopener noreferrer" className="text-[#F5C300]">Check eBay sold ↗</a><a href={`https://www.vinted.co.uk/catalog?search_text=${encodeURIComponent(form.pricingSearchQuery)}`} target="_blank" rel="noopener noreferrer" className="text-[#F5C300]">Check Vinted ↗</a><a href={`https://www.google.com/search?q=${encodeURIComponent(`${form.pricingSearchQuery} vintage sold price`)}`} target="_blank" rel="noopener noreferrer" className="text-[#F5C300]">Check the web ↗</a></div>}
                  {pricingApprovalRequired && <div className="mt-4 border-t border-amber-300/20 pt-4"><p className="text-amber-100 text-[11px] mb-3">This item may be collectible, rare or hard to price. Check the comparisons, choose the customer price above, then approve it. Until then it can only be saved privately in To be uploaded.</p><button type="button" onClick={() => setForm({ ...form, pricingStatus: "approved", pricingReviewedAt: new Date().toISOString() })} disabled={form.price <= 0} className="bg-[#F5C300] disabled:opacity-40 text-black px-4 py-2.5 text-[10px] font-black uppercase tracking-wider">Approve {form.price > 0 ? money(form.price) : "price"}</button></div>}
                </div>
                <div className="border border-white/8 bg-[#161616] p-4">
                  <p className="text-[#E8500A] text-[10px] font-black tracking-[0.18em] uppercase mb-3">Garment details & measurements</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Colour / pattern" value={form.garmentDetails?.colour ?? ""} onChange={(value) => setForm({ ...form, garmentDetails: { ...form.garmentDetails, colour: value } })} placeholder="Desert camouflage" />
                    <Field label="Material" value={form.garmentDetails?.material ?? ""} onChange={(value) => setForm({ ...form, garmentDetails: { ...form.garmentDetails, material: value } })} placeholder="Only if known from label" />
                    <Field label="Pit to pit" value={form.garmentDetails?.pitToPit ?? ""} onChange={(value) => setForm({ ...form, garmentDetails: { ...form.garmentDetails, pitToPit: value } })} placeholder="56 cm" />
                    <Field label="Length" value={form.garmentDetails?.length ?? ""} onChange={(value) => setForm({ ...form, garmentDetails: { ...form.garmentDetails, length: value } })} placeholder="66 cm" />
                    <Field label="Sleeve" value={form.garmentDetails?.sleeve ?? ""} onChange={(value) => setForm({ ...form, garmentDetails: { ...form.garmentDetails, sleeve: value } })} placeholder="62 cm" />
                    <Field label="Flaws" value={form.garmentDetails?.flaws ?? ""} onChange={(value) => setForm({ ...form, garmentDetails: { ...form.garmentDetails, flaws: value } })} placeholder="None visible / describe clearly" />
                  </div>
                  <p className="text-[#777] text-[11px] mt-3">Measure garments flat. These details appear beside the item and help reduce sizing questions and returns.</p>
                </div>
                <div className="border border-white/8 bg-[#161616] p-4">
                  <p className="text-[#F5C300] text-[10px] font-black tracking-[0.18em] uppercase mb-3">Private inventory details</p>
                  <div className="grid sm:grid-cols-3 gap-3"><Field label="SKU" value={form.sku ?? ""} onChange={(value) => setForm({ ...form, sku: value })} placeholder="SR-0001" /><Field label="Storage location" value={form.storageLocation ?? ""} onChange={(value) => setForm({ ...form, storageLocation: value })} placeholder="Rail A / Box 3" /><Field label="Bought from (supplier)" value={form.source ?? ""} onChange={(value) => setForm({ ...form, source: value })} placeholder="Fleek / Ben Whitley / charity shop" /><Select label="Cost tax year" value={form.costTaxYear ?? ""} options={["", ...taxYearOptions()]} optionLabel={(option) => option || "Not set"} onChange={(value) => setForm({ ...form, costTaxYear: value || undefined })} /></div>
                  <p className="text-[#888] text-[10px] mt-3">Only visible in admin. The amount you paid is saved privately with the listing, added to completed orders and included in the HMRC CSV.</p>
                </div>
                <Field label="Website title" value={form.name} onChange={(value) => setForm({ ...form, name: value })} suggestions={LISTING_WORDS} />
                <TextArea label="Website description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} suggestions={LISTING_WORDS} />
                <CopyField label="Vinted title" value={form.vintedTitle ?? ""} onChange={(value) => setForm({ ...form, vintedTitle: value })} suggestions={LISTING_WORDS} />
                <CopyField label="Vinted description" value={form.vintedDescription ?? ""} onChange={(value) => setForm({ ...form, vintedDescription: value })} area suggestions={LISTING_WORDS} />
                <Field label="Live Vinted item URL" value={form.vintedUrl ?? ""} onChange={(value) => setForm({ ...form, vintedUrl: value })} placeholder="https://www.vinted.co.uk/items/…" />
                <p className="text-[#777] text-[10px] -mt-2">Paste the public item link after publishing on Vinted. Product links will then open this exact listing for every visitor.</p>
                {listingMessage && <p className="text-[#F5C300] text-xs border border-[#F5C300]/20 bg-[#F5C300]/5 p-3">{listingMessage}</p>}
                <div className="flex flex-wrap gap-3"><button onClick={() => void saveProduct("live")} disabled={saving || pricingApprovalRequired || !form.name || !form.brand || form.price <= 0} className="bg-[#E8500A] disabled:opacity-40 font-black text-xs tracking-[0.16em] uppercase px-6 py-3">{saving ? "Saving…" : editingId && form.listingStatus === "draft" ? "Approve and publish" : editingId ? "Save changes" : "Publish to website"}</button><button onClick={() => void saveProduct("live", true)} disabled={saving || scheduleBusy || pricingApprovalRequired || !form.name || !form.brand || form.price <= 0} className="border border-[#E8500A] text-[#E8500A] disabled:opacity-40 px-5 py-3 text-xs font-black uppercase tracking-wider">Add to schedule</button><button onClick={() => void saveProduct("draft")} disabled={saving || !form.name || !form.brand || form.price <= 0} className="border border-amber-400/50 text-amber-200 disabled:opacity-40 px-5 py-3 text-xs font-bold">Save to be uploaded</button><button onClick={() => navigator.clipboard.writeText(`${form.vintedTitle}\n\n${form.vintedDescription}`)} className="border border-white/15 text-[#aaa] px-5 py-3 text-xs font-bold">Copy full Vinted listing</button><a href="https://www.vinted.co.uk/items/new" target="_blank" rel="noopener noreferrer" className="border border-[#F5C300]/40 text-[#F5C300] px-5 py-3 text-xs font-bold">Open Vinted ↗</a></div>
              </div>
            </div>

            <aside className="bg-[#111] border border-white/8 p-5 xl:sticky xl:top-24">
              {draftProducts.length > 0 && <div className="mb-6 border border-amber-400/35 bg-amber-400/[0.05] p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-amber-200">To be uploaded</h3><p className="text-[#777] text-[10px] mt-1">Private provisional listings waiting for your review.</p></div><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 text-black text-xs font-black">{draftProducts.length}</span></div><div className="mt-3 space-y-2">{draftProducts.map((product) => <button key={product.id} type="button" onClick={() => editProduct(product)} className="w-full border border-white/8 bg-black/20 p-3 text-left hover:border-amber-300/40"><span className="block text-xs font-bold text-white">{product.name}</span><span className="mt-1 block text-[9px] text-[#888]">Suggested {product.suggestedPriceLow && product.suggestedPriceHigh ? `£${product.suggestedPriceLow}–£${product.suggestedPriceHigh}` : money(product.price)} · Review listing</span></button>)}</div></div>}
              <section className="mb-6 border border-[#E8500A]/30 bg-[#161616] p-4">
                <h3 className="font-black">Release schedule</h3>
                <p className="text-[#888] text-xs mt-1 mb-4">UK time (GMT/BST). Items go live automatically. Config changes apply to new slots only.</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={LABEL}>Batch size<input type="number" min="1" max="100" value={scheduleConfig.batchSize} onChange={e => setScheduleConfig({ ...scheduleConfig, batchSize: Number(e.target.value) })} className={INPUT} /></label>
                  <label className={LABEL}>Every N days<input type="number" min="1" max="365" value={scheduleConfig.everyDays} onChange={e => setScheduleConfig({ ...scheduleConfig, everyDays: Number(e.target.value) })} className={INPUT} /></label>
                  <label className={LABEL}>Start date<input type="date" value={scheduleConfig.startAt} onChange={e => setScheduleConfig({ ...scheduleConfig, startAt: e.target.value })} className={INPUT} /></label>
                  <label className={LABEL}>Hour (UK, 0–23)<input type="number" min="0" max="23" value={scheduleConfig.releaseHour} onChange={e => setScheduleConfig({ ...scheduleConfig, releaseHour: Number(e.target.value) })} className={INPUT} /></label>
                </div>
                <button disabled={scheduleBusy || saving} onClick={() => void updateSchedule({ scheduleConfig }, "Schedule configuration saved")} className="mt-3 bg-[#E8500A] disabled:opacity-40 px-4 py-2 text-[10px] font-black uppercase tracking-wider">Save schedule settings</button>
                {scheduleMessage && <p role="status" className="text-amber-200 text-xs mt-3">{scheduleMessage}</p>}
                <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto">{Object.entries(upcomingDrops).sort(([a], [b]) => a.localeCompare(b)).map(([at, items]) => <div key={at} className="border border-white/10 p-3">
                  <p className="text-[#E8500A] text-[10px] font-black uppercase tracking-wider">{scheduleDate(at)} UK · {items.length}/{scheduleConfig.batchSize}</p>
                  {items.map(product => <div key={product.id} className="mt-3 border-t border-white/5 pt-2"><p className="text-xs font-bold">{product.name}</p><div className="flex flex-wrap gap-3 mt-2">
                    <button disabled={scheduleBusy || saving} onClick={() => void updateSchedule({ schedule: { id: String(product.id) } }, "Removed from schedule; item remains hidden")} className="text-amber-200 disabled:opacity-40 text-[10px]">Remove from schedule</button>
                    <button disabled={scheduleBusy || saving} onClick={() => void updateSchedule({ schedule: { id: String(product.id), at: new Date().toISOString() } }, "Item released now")} className="text-[#E8500A] disabled:opacity-40 text-[10px]">Release now</button>
                  </div></div>)}
                </div>)}{Object.keys(upcomingDrops).length === 0 && <p className="text-[#777] text-xs">No upcoming drops. Add a listing to schedule its release.</p>}</div>
              </section>
              <h3 className="font-black mb-1">Manage website products</h3><p className="text-[#555] text-xs mb-4">Your 5 newest listings appear here. Search to find any other item.</p>
              <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search product name or brand…" className={`${INPUT} mb-4`} />
              <div className="space-y-3 max-h-[72vh] overflow-y-auto">{managedProducts.map((product) => {
                const id = String(product.id);
                const hidden = hiddenProductIds.includes(id);
                const scheduled = scheduledReleases[id] && Date.parse(scheduledReleases[id]) > scheduleNow;
                const databaseProduct = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id);
                const recordedVintedSale = vintedSaleByProductId.get(id);
                return <div key={product.id} className={`border p-3 flex gap-3 ${hidden ? "border-amber-500/25 bg-amber-500/[0.03]" : "border-white/8"}`}>
                  <div className="w-16 h-20 bg-[#1a1a1a] shrink-0 overflow-hidden">{product.imageUrls?.[0] && <Image src={product.imageUrls[0]} alt="" width={64} height={80} className="w-full h-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{product.name}</p>
                    <p className="text-[#666] text-[10px]">{product.brand} · {money(product.price)}</p>
                    <p className={`text-[9px] mt-1 ${hidden ? "text-amber-300" : product.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>{scheduled ? `Scheduled ${scheduleDate(scheduledReleases[id])} UK` : hidden ? "HIDDEN FROM PUBLIC" : product.stock > 0 ? "LIVE" : recordedVintedSale ? (recordedVintedSale.source === "vinted" ? "SOLD ON VINTED" : "SOLD DIRECT") : "SOLD"}</p>
                    {recordedVintedSale
                      ? <p className="text-[#F5C300] text-[9px] mt-1">Purchased {money(orderPurchaseCost(recordedVintedSale, products))} · Sold {money(recordedVintedSale.price)}</p>
                      : <p className="text-[#777] text-[9px] mt-1">Purchase cost: {product.costPrice === undefined ? "Not added" : money(product.costPrice)}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-2 mt-2">
                      {databaseProduct && <button onClick={() => editProduct(product)} className="text-[#E8500A] text-[10px]">Edit</button>}
                      {databaseProduct && !recordedVintedSale && <button onClick={() => openVintedSale(product)} className="text-[#F5C300] text-[10px] font-bold">Sold on Vinted</button>}
                      {databaseProduct && !recordedVintedSale && <button onClick={() => void setPurchasePrice(product)} className="text-sky-300 text-[10px]">{product.costPrice === undefined ? "Add purchase price" : "Update purchase price"}</button>}
                      {databaseProduct && !recordedVintedSale && <button onClick={() => void updateStock(product)} className="text-[#aaa] text-[10px]">{product.stock > 0 ? "Mark sold elsewhere" : "Relist"}</button>}
                      {hidden && product.stock > 0 && <button disabled={scheduleBusy || saving} onClick={() => void updateSchedule({ schedule: { auto: [id] } }, "Item added to schedule")} className="text-[#E8500A] disabled:opacity-40 text-[10px]">Add to schedule</button>}
                      <button onClick={() => void toggleProductVisibility(product)} className="text-amber-300 text-[10px]">{hidden ? "Show publicly" : "Hide from public"}</button>
                      <button onClick={() => void removeProduct(product)} className="text-red-400 text-[10px]">Delete</button>
                    </div>
                  </div>
                </div>;
              })}</div>
              {!managedProducts.length && <p className="text-[#555] text-xs py-8 text-center">No matching products.</p>}
            </aside>
          </section>
        )}
        {tab === "scheduler" && <Scheduler products={products} hiddenProductIds={hiddenProductIds} scheduledReleases={scheduledReleases} scheduleConfig={scheduleConfig} now={scheduleNow} busy={scheduleBusy || saving} message={scheduleMessage} updateSchedule={updateSchedule} onEdit={(product) => { editProduct(product); setTab("listings"); }} />}
        {tab === "email" && <EmailMarketing />}
        {tab === "analytics" && <AnalyticsDashboard />}
      </div>

      {vintedSaleProduct && <Modal title="Record sale" onClose={() => !recordingVintedSale && setVintedSaleProduct(null)}><div className="border border-white/10 bg-[#161616] p-4 mb-5"><p className="text-white font-black">{vintedSaleProduct.name}</p><p className="text-[#777] text-xs mt-1">This will mark the item sold on your website and add the sale to Orders and your HMRC CSV.</p></div><label className="block mb-4"><span className="block text-[#888] text-[9px] tracking-[0.18em] uppercase mb-1.5">Sold on</span><select value={vintedSale.channel} onChange={(event) => setVintedSale({ ...vintedSale, channel: event.target.value })} className={INPUT}><option value="vinted">Vinted</option><option value="other">Somewhere else (direct, Instagram, in person)</option></select></label><div className="grid sm:grid-cols-2 gap-4"><Field label="What you paid (£) — private" value={vintedSale.purchasePrice} type="number" onChange={(value) => setVintedSale({ ...vintedSale, purchasePrice: value })} placeholder="Required" /><Field label="Sold price (£)" value={vintedSale.soldPrice} type="number" onChange={(value) => setVintedSale({ ...vintedSale, soldPrice: value })} placeholder="Required" /></div><p className="text-[#777] text-[10px] mt-4">Use the item price you received, excluding postage paid separately by the buyer.</p><button onClick={recordVintedProductSale} disabled={recordingVintedSale || vintedSale.purchasePrice === "" || Number(vintedSale.purchasePrice) < 0 || Number(vintedSale.soldPrice) <= 0} className="w-full mt-5 bg-[#F5C300] text-black disabled:opacity-40 py-3 font-black text-xs tracking-wider uppercase">{recordingVintedSale ? "Saving sale…" : vintedSale.channel === "vinted" ? "Confirm sold on Vinted" : "Confirm sold"}</button></Modal>}
      {showManualSale && <Modal title="Record a Vinted or manual sale" onClose={() => setShowManualSale(false)}><div className="grid sm:grid-cols-2 gap-4"><Field label="Customer name" value={manualSale.customer_name} onChange={(value) => setManualSale({ ...manualSale, customer_name: value })} /><ProductTitlePicker products={products} value={manualSale.item_name} onChange={(value) => setManualSale({ ...manualSale, item_id: "", item_name: value })} onSelect={(product) => setManualSale({ ...manualSale, item_id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(product.id)) ? String(product.id) : "", customer_name: manualSale.customer_name || "Vinted buyer", item_name: product.name, brand: product.brand, price: product.price, cost_price: Number(product.costPrice || 0), total: 0 })} /><Field label="Brand" value={manualSale.brand} onChange={(value) => setManualSale({ ...manualSale, brand: value })} /><Field label="Customer sale price (£)" value={manualSale.price || ""} type="number" onChange={(value) => setManualSale({ ...manualSale, price: Number(value) })} /><Field label="What you paid for item (£) — private" value={manualSale.cost_price || ""} type="number" onChange={(value) => setManualSale({ ...manualSale, cost_price: Math.max(0, Number(value)) })} placeholder="Optional" /><Field label="Postage" value={manualSale.postage || ""} type="number" onChange={(value) => setManualSale({ ...manualSale, postage: Number(value) })} /><Field label="Notes" value={manualSale.notes} onChange={(value) => setManualSale({ ...manualSale, notes: value })} /></div><p className="text-[#777] text-[10px] mt-4">Select a website listing to fill its exact title, brand, selling price and purchase cost. A linked Vinted sale also marks the website item sold.</p><button onClick={recordManualSale} disabled={!manualSale.customer_name || !manualSale.item_name || manualSale.price <= 0} className="w-full mt-5 bg-[#E8500A] disabled:opacity-40 py-3 font-black text-xs tracking-wider uppercase">Save sale</button></Modal>}
      </main>
      {editingPhoto && <PhotoEditor url={editingPhoto} onClose={() => setEditingPhoto(null)} onSaved={(url) => replaceEditedPhoto(editingPhoto, url)} />}
    </>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", suggestions }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; suggestions?: readonly string[] }) {
  return <label><span className={LABEL}>{label}</span>{type === "text" && suggestions ? <AutocompleteControl label={label} value={String(value)} onChange={onChange} placeholder={placeholder} suggestions={suggestions} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} step={type === "number" ? "0.01" : undefined} className={INPUT} />}</label>;
}

function ProductTitlePicker({ products, value, onChange, onSelect }: { products: Product[]; value: string; onChange: (value: string) => void; onSelect: (product: Product) => void }) {
  const [focused, setFocused] = useState(false);
  const query = value.trim().toLowerCase();
  const matches = query.length
    ? products
      .filter((product) => `${product.name} ${product.brand}`.toLowerCase().includes(query))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(query)) - Number(a.name.toLowerCase().startsWith(query)))
      .slice(0, 6)
    : [];

  return <label className="relative"><span className={LABEL}>Item</span><input value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} placeholder="Start typing a website listing title…" autoComplete="off" role="combobox" aria-expanded={focused && matches.length > 0} aria-controls="manual-sale-product-results" className={INPUT} />{focused && matches.length > 0 && <div id="manual-sale-product-results" role="listbox" className="absolute z-30 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto border border-[#E8500A]/40 bg-[#181818] shadow-2xl">{matches.map((product) => <button key={product.id} type="button" role="option" aria-selected={value === product.name} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(product); setFocused(false); }} className="block w-full border-b border-white/5 px-3 py-3 text-left hover:bg-[#242424] focus:bg-[#242424] focus:outline-none"><span className="block text-xs font-bold text-white">{product.name}</span><span className="mt-1 block text-[9px] text-[#777]">{product.brand} · {product.size} · {money(product.price)}{product.stock <= 0 ? " · Currently sold" : ""}</span></button>)}</div>}</label>;
}

function Select({ label, value, options, onChange, optionLabel = (option) => option }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; optionLabel?: (option: string) => string }) {
  return <label><span className={LABEL}>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={INPUT}>{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, suggestions }: { label: string; value: string; onChange: (value: string) => void; suggestions?: readonly string[] }) {
  return <label><span className={LABEL}>{label}</span><AutocompleteControl label={label} value={value} onChange={onChange} rows={4} multiline suggestions={suggestions} /></label>;
}

function CopyField({ label, value, onChange, area = false, suggestions }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; suggestions?: readonly string[] }) {
  return <div><div className="flex justify-between items-center"><span className={LABEL}>{label}</span><button onClick={() => navigator.clipboard.writeText(value)} className="text-[#E8500A] text-[10px] mb-1.5">Copy</button></div><AutocompleteControl label={label} value={value} onChange={onChange} rows={area ? 7 : undefined} multiline={area} suggestions={suggestions} /></div>;
}

function AutocompleteControl({ label, value, onChange, suggestions = [], multiline = false, rows, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; suggestions?: readonly string[]; multiline?: boolean; rows?: number; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  const wordMatch = value.match(/([A-Za-z][A-Za-z'-]*)$/);
  const partial = wordMatch?.[1] ?? "";
  const suggestion = partial.length >= 2
    ? suggestions.find((word) => word.toLowerCase().startsWith(partial.toLowerCase()) && word.toLowerCase() !== partial.toLowerCase())
    : undefined;

  const acceptSuggestion = () => {
    if (!suggestion || wordMatch?.index === undefined) return;
    onChange(`${value.slice(0, wordMatch.index)}${suggestion} `);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (suggestion && (event.key === "Tab" || event.key === "ArrowRight")) {
      event.preventDefault();
      acceptSuggestion();
    }
  };

  const controlProps = {
    "aria-label": label,
    value,
    placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    onKeyDown: handleKeyDown,
    onFocus: () => setFocused(true),
    onBlur: () => window.setTimeout(() => setFocused(false), 120),
    className: INPUT,
  };

  return <div className="relative">
    {multiline ? <textarea {...controlProps} rows={rows ?? 4} /> : <input {...controlProps} />}
    {focused && suggestion && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={acceptSuggestion} className="absolute z-20 left-0 top-full mt-1 flex w-full items-center justify-between gap-3 border border-[#E8500A]/30 bg-[#202020] px-3 py-2 text-left text-xs shadow-xl">
      <span className="text-white">{suggestion}</span><span className="shrink-0 text-[#777] text-[9px] uppercase tracking-wider">Tab or →</span>
    </button>}
  </div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center" onClick={(event) => event.target === event.currentTarget && onClose()}><div className="w-full max-w-xl bg-[#111] border border-white/10 p-6"><div className="flex justify-between mb-5"><h2 className="font-black">{title}</h2><button onClick={onClose} className="text-[#777]">×</button></div>{children}</div></div>;
}
