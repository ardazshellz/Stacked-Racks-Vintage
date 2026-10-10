import type { Product } from "./products";

export interface ScheduleConfig {
  batchSize: number;
  everyDays: number;
  startAt: string;
  releaseHour: number;
}
export interface ProductSettings {
  hiddenProductIds: string[];
  deletedProductIds: string[];
  scheduledReleases: Record<string, string>;
  scheduleConfig: ScheduleConfig;
  /** Release times (ISO) whose drop email has already gone out, so it is never sent twice. */
  emailedDrops: string[];
}

export function ukDate(value: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function defaultScheduleConfig(): ScheduleConfig {
  return { batchSize: 5, everyDays: 3, startAt: ukDate(), releaseHour: 18 };
}
export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validRelease(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}
export function validScheduleConfig(value: unknown): value is ScheduleConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as ScheduleConfig;
  return Number.isInteger(c.batchSize) && c.batchSize >= 1 && c.batchSize <= 100 && Number.isInteger(c.everyDays) && c.everyDays >= 1 && c.everyDays <= 365 && validDate(c.startAt) && Number.isInteger(c.releaseHour) && c.releaseHour >= 0 && c.releaseHour <= 23;
}
export function parseProductSettings(value: unknown): ProductSettings {
  const defaults: ProductSettings = { hiddenProductIds: [], deletedProductIds: [], scheduledReleases: {}, scheduleConfig: defaultScheduleConfig(), emailedDrops: [] };
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaults;
    const config = { ...defaults.scheduleConfig, ...parsed.scheduleConfig };
    // Recover individual valid config fields from partially malformed stored settings.
    for (const key of Object.keys(defaults.scheduleConfig) as (keyof ScheduleConfig)[]) {
      if (!validScheduleConfig({ ...defaults.scheduleConfig, [key]: config[key] })) config[key] = defaults.scheduleConfig[key];
    }
    return {
      hiddenProductIds: Array.isArray(parsed.hiddenProductIds) ? [...new Set<string>(parsed.hiddenProductIds.map(String))] : [],
      deletedProductIds: Array.isArray(parsed.deletedProductIds) ? [...new Set<string>(parsed.deletedProductIds.map(String))] : [],
      scheduledReleases: parsed.scheduledReleases && typeof parsed.scheduledReleases === "object" && !Array.isArray(parsed.scheduledReleases)
        ? Object.fromEntries(Object.entries(parsed.scheduledReleases).filter(([id, at]) => id && validRelease(at)).map(([id, at]) => [id, new Date(at as string).toISOString()])) : {},
      scheduleConfig: config,
      emailedDrops: Array.isArray(parsed.emailedDrops) ? [...new Set<string>(parsed.emailedDrops.filter(validRelease).map((at: string) => new Date(at).toISOString()))].sort().slice(-60) : [],
    };
  } catch { return defaults; }
}

// London is UTC or UTC+1. Prefer the later occurrence of an ambiguous autumn
// hour; the missing spring 01:00 becomes 02:00. Calendar days never drift at DST.
export function releaseAt(date: string, hour: number): string {
  const utc = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
  const localHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(utc));
  const candidate = utc - ((localHour - hour + 24) % 24) * 3600000;
  const candidateHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(candidate));
  return new Date(candidateHour === hour ? candidate : utc).toISOString();
}
/** Upcoming release slots from the schedule settings: every `everyDays` from `startAt`. */
export function upcomingSlots(config: ScheduleConfig, now: number, count: number): string[] {
  const anchor = Date.parse(config.startAt);
  const slots: string[] = [];
  for (let n = Math.max(0, Math.floor((now - anchor) / (config.everyDays * 86400000)) - 1); slots.length < count; n++) {
    const at = releaseAt(new Date(anchor + n * config.everyDays * 86400000).toISOString().slice(0, 10), config.releaseHour);
    if (Date.parse(at) > now) slots.push(at);
  }
  return slots;
}

export function assignReleaseSlots(settings: ProductSettings, ids: string[], now = Date.now()): Record<string, string> {
  const releases = { ...settings.scheduledReleases };
  const { batchSize, everyDays, startAt, releaseHour } = settings.scheduleConfig;
  if (!validScheduleConfig(settings.scheduleConfig)) throw new Error("Invalid schedule configuration");
  const anchor = Date.parse(startAt);
  const day = 86400000;
  let n = Math.max(0, Math.floor((Date.parse(ukDate(new Date(now))) - anchor) / (everyDays * day)));
  const counts = new Map<string, number>();
  for (const [id, at] of Object.entries(releases)) {
    if (!settings.deletedProductIds.includes(id)) counts.set(at, (counts.get(at) ?? 0) + 1);
  }
  for (const id of new Set(ids)) {
    if (releases[id] && Date.parse(releases[id]) > now) continue;
    for (;;) {
      const at = releaseAt(new Date(anchor + n * everyDays * day).toISOString().slice(0, 10), releaseHour);
      if (Date.parse(at) >= now && (counts.get(at) ?? 0) < batchSize) {
        releases[id] = at;
        counts.set(at, (counts.get(at) ?? 0) + 1);
        break;
      }
      n++;
    }
  }
  return releases;
}
// Drops that have released within the window and have not been emailed yet, oldest first.
// The window stops a first run (or a long outage) from emailing old drops.
export function dropsToEmail(settings: ProductSettings, now = Date.now(), windowHours = 26): { at: string; ids: string[] }[] {
  const drops = new Map<string, string[]>();
  for (const [id, at] of Object.entries(settings.scheduledReleases)) {
    const time = Date.parse(at);
    if (time > now || time <= now - windowHours * 3600000) continue;
    if (settings.emailedDrops.includes(at) || settings.hiddenProductIds.includes(id) || settings.deletedProductIds.includes(id)) continue;
    drops.set(at, [...(drops.get(at) ?? []), id]);
  }
  return [...drops.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([at, ids]) => ({ at, ids }));
}
// Weekend days release in two batches (11:00 and 17:30). One email per UK day covers every batch due that day.
export function dropEmailsByDay(due: { at: string; ids: string[] }[]): { day: string; ats: string[]; ids: string[] }[] {
  const days = new Map<string, { day: string; ats: string[]; ids: string[] }>();
  for (const drop of due) {
    const day = ukDate(drop.at);
    const entry = days.get(day) ?? days.set(day, { day, ats: [], ids: [] }).get(day)!;
    entry.ats.push(drop.at);
    entry.ids.push(...drop.ids);
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}
export function productUnavailable(settings: ProductSettings, id: string, now = Date.now()): boolean {
  return settings.hiddenProductIds.includes(id) || settings.deletedProductIds.includes(id) || Date.parse(settings.scheduledReleases[id] ?? "") > now;
}
export function publicProducts(products: Product[], settings: ProductSettings, now = Date.now()): Product[] {
  return products.filter(p => p.listingStatus !== "draft" && !productUnavailable(settings, String(p.id), now)).map(p => {
    const at = settings.scheduledReleases[String(p.id)];
    return at ? { ...p, listedDate: ukDate(at) } : p;
  });
}
