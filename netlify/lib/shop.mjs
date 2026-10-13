import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

// İlk yönetici şifresinin scrypt özeti (şifre panelden değiştirilebilir).
const INITIAL_PASSWORD_HASH =
  "ca532068b5a0916af97e11059fdec5b6:ae109888e9ef3f51daced631fa1b4966ae1a0f617689d4564a028c6c88f4b633";

export const shop = () => getStore({ name: "shop", consistency: "strong" });
export const images = () => getStore({ name: "images", consistency: "strong" });

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export const CATEGORIES = [
  { id: "fener", name: "Fenerler" },
  { id: "nisangah", name: "Nişangahlar" },
  { id: "optik", name: "Dürbün & Optik" },
  { id: "aksesuar", name: "Aksesuar" },
];

export const DEFAULT_SETTINGS = {
  storeName: "Opticalav",
  tagline: "Av, optik ve taktik ekipman",
  announcement: "Tüm ürünler orijinal ve garantilidir · Aynı gün kargo",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "opticalav",
  address: "",
  companyTitle: "",
  taxOffice: "",
  taxNo: "",
  mersis: "",
  bankName: "",
  ibanName: "",
  iban: "",
  shippingFee: 150,
  freeShippingOver: 3000,
  returnDays: 14,
};

const P = (id, name, brand, category, description, extra = {}) => ({
  id, name, brand, category, description,
  price: 0, oldPrice: 0, images: [], inStock: true, active: true, featured: false,
  sample: true, createdAt: "2026-10-14T00:00:00.000Z", ...extra,
});

export const SEED_PRODUCTS = [
  P("trustfire-t45r", "TrustFire T45R Avcı Feneri", "TrustFire", "fener",
    "Uzun menzilli, şarj edilebilir avcı feneri. Gece avı ve arama-kurtarma için güçlü odaklı ışık.", { featured: true }),
  P("trustfire-1050-silah-feneri", "TrustFire 1050 Lümen Silah Feneri", "TrustFire", "fener",
    "Ray bağlantılı kompakt silah feneri. 1050 lümen, hızlı tak-çıkar montaj.", { featured: true }),
  P("trustfire-d2r-set", "TrustFire D2R+ Avcı Feneri Seti", "TrustFire", "fener",
    "Uzaktan basmalı anahtar, montaj aparatı ve şarj kablosuyla komple avcı seti."),
  P("olight-oclip", "Olight Oclip Yaka Feneri", "Olight", "fener",
    "Kıyafete takılan, şarj edilebilir çok amaçlı mini fener."),
  P("olight-taktik-kalem", "Olight Taktik Kalem", "Olight", "aksesuar",
    "Metal gövdeli, cam kırıcı uçlu dayanıklı taktik kalem."),
  P("trustfire-uc10", "TrustFire UC10 USB Pil Şarj Cihazı", "TrustFire", "aksesuar",
    "18650 / 21700 piller için USB şarj cihazı, şarj göstergeli."),
  P("truglo-red-dot", "Truglo Red Dot Nişangah", "Truglo", "nisangah",
    "Hızlı hedef alma için kırmızı nokta nişangah, ayarlanabilir parlaklık.", { featured: true }),
  P("gideon-red-dot", "Gideon Optics Red Dot", "Gideon", "nisangah",
    "Tabanca ve tüfekler için kompakt açık red dot."),
  P("eotech-holografik", "EOTech Holografik Nişangah", "EOTech", "nisangah",
    "Profesyonel kullanım için holografik nişangah.", { featured: true }),
  P("sig-romeo", "Sig Sauer Romeo Red Dot", "Sig Sauer", "nisangah",
    "Tabanca üstü mini red dot, uzun pil ömrü."),
  P("spotting-scope", "Gözlem Dürbünü (Spotting Scope)", "", "optik",
    "Tripod ile birlikte, atış poligonu ve gözlem için yüksek büyütmeli dürbün."),
  P("kestrel-ruzgar", "Kestrel Rüzgar Ölçer", "Kestrel", "optik",
    "Rüzgar hızı, sıcaklık ve nem ölçümü; uzun menzil atışlar için cep tipi meteoroloji istasyonu."),
];

export async function getSettings() {
  const s = await shop().get("settings", { type: "json" });
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}
export async function getProducts() {
  const p = await shop().get("products", { type: "json" });
  return p || SEED_PRODUCTS;
}
export async function getPayment() {
  return (await shop().get("payment", { type: "json" })) || { apiKey: "", secretKey: "", sandbox: false, enabled: false };
}
export const cardReady = (pay) => !!(pay.enabled && pay.apiKey && pay.secretKey);

export function publicSettings(s) {
  const out = { ...s };
  return out;
}

// ---------- yönetici oturumu ----------
async function tokenKey() {
  let k = await shop().get("token-key");
  if (!k) {
    k = crypto.randomBytes(32).toString("hex");
    await shop().set("token-key", k, { onlyIfNew: true });
    k = await shop().get("token-key");
  }
  return k;
}
export async function checkPassword(pw) {
  if (typeof pw !== "string" || !pw) return false;
  const stored = (await shop().get("admin-password")) || INITIAL_PASSWORD_HASH;
  const [salt, hash] = stored.split(":");
  const got = crypto.scryptSync(pw, salt, 32);
  return crypto.timingSafeEqual(got, Buffer.from(hash, "hex"));
}
export async function setPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(pw, salt, 32).toString("hex");
  await shop().set("admin-password", `${salt}:${h}`);
  // şifre değişince eski oturumlar geçersiz olsun
  await shop().set("token-key", crypto.randomBytes(32).toString("hex"));
}
export async function makeToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const sig = crypto.createHmac("sha256", await tokenKey()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}
export async function verifyToken(req) {
  const h = req.headers.get("authorization") || "";
  const t = h.replace(/^Bearer\s+/i, "");
  const [exp, sig] = t.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const want = crypto.createHmac("sha256", await tokenKey()).update(exp).digest("hex");
  return sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}

// ---------- yardımcılar ----------
export const money = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);
export function newOrderId() {
  const d = new Date(Date.now() + 3 * 3600e3); // Türkiye saati
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (const b of crypto.randomBytes(6)) r += chars[b % chars.length];
  return `OA${ymd}${r}`;
}
export const clean = (v, max = 300) => String(v ?? "").trim().slice(0, max);

// ---------- iyzico ----------
export async function iyzico(pay, path, body) {
  const base = pay.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  const rnd = `${Date.now()}${crypto.randomBytes(4).toString("hex")}`;
  const payload = JSON.stringify(body);
  const sig = crypto.createHmac("sha256", pay.secretKey).update(rnd + path + payload).digest("hex");
  const auth = Buffer.from(`apiKey:${pay.apiKey}&randomKey:${rnd}&signature:${sig}`).toString("base64");
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `IYZWSv2 ${auth}`, "x-iyzi-rnd": rnd },
    body: payload,
  });
  return r.json();
}
