import crypto from "node:crypto";
import {
  json, shop, images, getProducts, getSettings, getPayment, DEFAULT_SETTINGS, CATEGORIES,
  checkPassword, setPassword, makeToken, verifyToken, clean,
} from "../lib/shop.mjs";

const STATUSES = ["havale-bekleniyor", "odeme-bekleniyor", "odeme-basarisiz", "yeni", "hazirlaniyor", "kargoda", "teslim-edildi", "iptal"];
const slug = (s) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "urun";

export default async (req, context) => {
  const action = context.params.action;

  if (action === "login" && req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch {}
    await new Promise((r) => setTimeout(r, 400));
    if (!(await checkPassword(b.password))) return json({ error: "Şifre hatalı." }, 401);
    return json({ token: await makeToken() });
  }
  if (!(await verifyToken(req))) return json({ error: "Oturum süresi doldu, tekrar giriş yapın." }, 401);

  if (action === "data" && req.method === "GET") {
    const { blobs } = await shop().list({ prefix: "orders/" });
    const orders = (await Promise.all(blobs.map((x) => shop().get(x.key, { type: "json" })))).filter(Boolean)
      .filter((o) => o.status !== "odeme-bekleniyor" || Date.now() - Date.parse(o.createdAt) < 3 * 864e5)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pay = await getPayment();
    return json({
      products: await getProducts(), settings: await getSettings(), categories: CATEGORIES, statuses: STATUSES, orders,
      payment: { apiKey: pay.apiKey, hasSecret: !!pay.secretKey, sandbox: !!pay.sandbox, enabled: !!pay.enabled },
    });
  }

  if (action === "product" && req.method === "POST") {
    let p; try { p = await req.json(); } catch { return json({ error: "Geçersiz istek" }, 400); }
    const name = clean(p.name, 150);
    if (!name) return json({ error: "Ürün adı gerekli." }, 400);
    const products = await getProducts();
    const idx = products.findIndex((x) => x.id === p.id);
    let id = p.id;
    if (idx < 0) {
      id = slug(name);
      while (products.some((x) => x.id === id)) id = `${slug(name)}-${crypto.randomBytes(2).toString("hex")}`;
    }
    const rec = {
      ...(idx >= 0 ? products[idx] : { createdAt: new Date().toISOString() }),
      id, name, brand: clean(p.brand, 60), category: CATEGORIES.some((c) => c.id === p.category) ? p.category : "aksesuar",
      description: clean(p.description, 4000), price: Math.max(0, Number(p.price) || 0), oldPrice: Math.max(0, Number(p.oldPrice) || 0),
      images: (Array.isArray(p.images) ? p.images : []).filter((k) => /^[a-z0-9-]{8,80}$/i.test(k)).slice(0, 10),
      inStock: !!p.inStock, active: !!p.active, featured: !!p.featured, sample: false,
    };
    if (idx >= 0) products[idx] = rec; else products.unshift(rec);
    await shop().setJSON("products", products);
    return json({ product: rec });
  }
  if (action === "product" && req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    const products = (await getProducts()).filter((x) => x.id !== id);
    await shop().setJSON("products", products);
    return json({ ok: true });
  }

  if (action === "upload" && req.method === "POST") {
    const type = req.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "Sadece JPG/PNG/WEBP yüklenebilir." }, 400);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 6 * 1024 * 1024) return json({ error: "Fotoğraf çok büyük (en fazla 6 MB)." }, 400);
    const key = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}`;
    await images().set(key, buf, { metadata: { type } });
    return json({ key });
  }

  if (action === "order" && req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch {}
    const o = await shop().get(`orders/${b.id}`, { type: "json" });
    if (!o) return json({ error: "Sipariş bulunamadı." }, 404);
    if (b.status && STATUSES.includes(b.status) && b.status !== o.status) {
      o.history.push({ at: new Date().toISOString(), note: `Durum: ${o.status} → ${b.status}` });
      o.status = b.status;
    }
    if (typeof b.cargo === "string") o.cargo = clean(b.cargo, 120);
    if (typeof b.adminNote === "string") o.adminNote = clean(b.adminNote, 1000);
    await shop().setJSON(`orders/${o.id}`, o);
    return json({ order: o });
  }

  if (action === "settings" && req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch {}
    const s = {};
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      s[k] = typeof DEFAULT_SETTINGS[k] === "number" ? Math.max(0, Number(b[k]) || 0) : clean(b[k], k === "address" ? 400 : 200);
    }
    await shop().setJSON("settings", s);
    return json({ settings: s });
  }

  if (action === "payment" && req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch {}
    const cur = await getPayment();
    const next = {
      apiKey: clean(b.apiKey, 200), secretKey: b.secretKey ? clean(b.secretKey, 200) : cur.secretKey,
      sandbox: !!b.sandbox, enabled: !!b.enabled,
    };
    await shop().setJSON("payment", next);
    return json({ payment: { apiKey: next.apiKey, hasSecret: !!next.secretKey, sandbox: next.sandbox, enabled: next.enabled } });
  }

  if (action === "password" && req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch {}
    if (!(await checkPassword(b.current))) return json({ error: "Mevcut şifre hatalı." }, 400);
    if (typeof b.next !== "string" || b.next.length < 8) return json({ error: "Yeni şifre en az 8 karakter olmalı." }, 400);
    await setPassword(b.next);
    return json({ token: await makeToken() });
  }

  return json({ error: "Bulunamadı" }, 404);
};
export const config = { path: "/api/admin/:action" };
