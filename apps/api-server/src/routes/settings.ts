import { Router } from "express";

import { prisma } from "../prisma.js";
import type { SettingsPayload } from "../types.js";
import { sendOk } from "../utils/responses.js";
import { adminMenuPrefsSchema, settingsInputSchema, storefrontMenuSchema } from "./schemas.js";

const SETTINGS_KEYS: Array<keyof SettingsPayload> = [
  "siteTitle",
  "tagline",
  "webfrontTitle",
  "webfrontTagline",
  "titleFormat",
  "metaDescription",
  "siteIconUrl",
  "webfrontLogoUrl",
  "sidebarLogoUrl",
  "faviconUrl",
  "language",
  "timezone",
  "footerText",
  "frontPageId",
];

function parseFrontPageId(value: string | undefined) {
  if (!value || value === "null") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeSettingValue(key: keyof SettingsPayload, payload: SettingsPayload) {
  if (key === "frontPageId") {
    return payload.frontPageId === null ? "null" : String(payload.frontPageId);
  }
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

export const settingsRouter = Router();

function normalizeStorefrontMenuItems(input: Array<{ id?: string; label: string; href: string; parentId?: string | null; openInNewTab: boolean }>) {
  const withIds = input.map((item, index) => ({
    id: item.id?.trim() || `menu_${index + 1}`,
    label: item.label,
    href: item.href,
    parentId: item.parentId ?? null,
    openInNewTab: item.openInNewTab,
  }));
  const idSet = new Set(withIds.map((item) => item.id));
  return withIds.map((item) => ({
    ...item,
    parentId: item.parentId && idSet.has(item.parentId) && item.parentId !== item.id ? item.parentId : null,
  }));
}

settingsRouter.get("/", async (_req, res) => {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, string | undefined>;

  const payload: SettingsPayload = {
    siteTitle: map.siteTitle ?? "",
    tagline: map.tagline ?? "",
    webfrontTitle: map.webfrontTitle ?? "",
    webfrontTagline: map.webfrontTagline ?? "",
    titleFormat: map.titleFormat ?? "%page% | %site%",
    metaDescription: map.metaDescription ?? "",
    siteIconUrl: map.siteIconUrl ?? "",
    webfrontLogoUrl: map.webfrontLogoUrl ?? "",
    sidebarLogoUrl: map.sidebarLogoUrl ?? "",
    faviconUrl: map.faviconUrl ?? "",
    language: map.language ?? "en",
    timezone: map.timezone ?? "UTC",
    footerText: map.footerText ?? "",
    frontPageId: parseFrontPageId(map.frontPageId),
  };

  return sendOk(res, payload);
});

settingsRouter.put("/", async (req, res) => {
  const payload = settingsInputSchema.parse(req.body);

  await prisma.$transaction(
    SETTINGS_KEYS.map((key) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: serializeSettingValue(key, payload) },
        create: { key, value: serializeSettingValue(key, payload) },
      }),
    ),
  );

  return sendOk(res, payload);
});

settingsRouter.get("/admin-menu-prefs", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "adminMenuPrefs" } });
  return sendOk(res, row ? JSON.parse(row.value) : null);
});

settingsRouter.put("/admin-menu-prefs", async (req, res) => {
  const prefs = adminMenuPrefsSchema.parse(req.body);
  await prisma.setting.upsert({
    where: { key: "adminMenuPrefs" },
    update: { value: JSON.stringify(prefs) },
    create: { key: "adminMenuPrefs", value: JSON.stringify(prefs) },
  });
  return sendOk(res, prefs);
});

settingsRouter.get("/storefront-menu", async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: "storefrontMenu" } });
  if (!row) return sendOk(res, []);
  try {
    const parsed = normalizeStorefrontMenuItems(storefrontMenuSchema.parse(JSON.parse(row.value)));
    return sendOk(res, parsed);
  } catch {
    return sendOk(res, []);
  }
});

settingsRouter.put("/storefront-menu", async (req, res) => {
  const items = normalizeStorefrontMenuItems(storefrontMenuSchema.parse(req.body));
  await prisma.setting.upsert({
    where: { key: "storefrontMenu" },
    update: { value: JSON.stringify(items) },
    create: { key: "storefrontMenu", value: JSON.stringify(items) },
  });
  return sendOk(res, items);
});
