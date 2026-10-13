import {
  json, shop, getProducts, getSettings, getPayment, cardReady, newOrderId, money, clean, iyzico,
} from "../lib/shop.mjs";

const PUBLIC_FIELDS = ["id", "createdAt", "status", "method", "items", "subtotal", "shipping", "total"];

export default async (req, context) => {
  // Sipariş durumu (müşteri teşekkür sayfası için, kişisel bilgi döndürmez)
  if (req.method === "GET") {
    const id = context.params.id;
    if (!/^OA\d{6}[A-Z0-9]{6}$/.test(id || "")) return json({ error: "Sipariş bulunamadı" }, 404);
    const o = await shop().get(`orders/${id}`, { type: "json" });
    if (!o) return json({ error: "Sipariş bulunamadı" }, 404);
    const out = Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, o[k]]));
    if (o.method === "havale") {
      const s = await getSettings();
      out.bank = { bankName: s.bankName, ibanName: s.ibanName, iban: s.iban };
    }
    return json(out);
  }
  if (req.method !== "POST") return json({ error: "Desteklenmeyen istek" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "Geçersiz istek" }, 400); }

  const c = b.customer || {};
  const customer = {
    name: clean(c.name, 60), surname: clean(c.surname, 60), phone: clean(c.phone, 20),
    email: clean(c.email, 120), tckn: clean(c.tckn, 11), city: clean(c.city, 40),
    district: clean(c.district, 40), address: clean(c.address, 400), note: clean(c.note, 500),
    invoiceType: c.invoiceType === "kurumsal" ? "kurumsal" : "bireysel",
    companyName: clean(c.companyName, 150), taxOffice: clean(c.taxOffice, 60), taxNo: clean(c.taxNo, 11),
  };
  const missing = ["name", "surname", "phone", "email", "city", "district", "address"].filter((k) => !customer[k]);
  if (missing.length) return json({ error: "Lütfen tüm zorunlu alanları doldurun." }, 400);
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) return json({ error: "E-posta adresi geçersiz." }, 400);
  if (customer.phone.replace(/\D/g, "").length < 10) return json({ error: "Telefon numarası geçersiz." }, 400);
  if (b.accepted !== true) return json({ error: "Sözleşmeleri onaylamanız gerekiyor." }, 400);

  const method = b.method === "card" ? "card" : "havale";
  const pay = await getPayment();
  if (method === "card" && !cardReady(pay)) return json({ error: "Kartla ödeme şu an kullanılamıyor." }, 400);

  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return json({ error: "Sepetiniz boş." }, 400);
  const products = await getProducts();
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = [];
  for (const it of b.items) {
    const p = byId.get(it.id);
    const qty = Math.floor(Number(it.qty));
    if (!p || !p.active || !(p.price > 0)) return json({ error: "Sepetinizdeki bir ürün artık satışta değil. Lütfen sepeti kontrol edin." }, 400);
    if (!p.inStock) return json({ error: `${p.name} şu an stokta yok.` }, 400);
    if (!(qty >= 1 && qty <= 20)) return json({ error: "Geçersiz adet." }, 400);
    items.push({ id: p.id, name: p.name, category: p.category, price: Number(p.price), qty });
  }
  const settings = await getSettings();
  const subtotal = Number(money(items.reduce((s, i) => s + i.price * i.qty, 0)));
  const shipping = settings.freeShippingOver > 0 && subtotal >= settings.freeShippingOver ? 0 : Number(settings.shippingFee) || 0;
  const total = Number(money(subtotal + shipping));

  const id = newOrderId();
  const ip = (req.headers.get("x-nf-client-connection-ip") || context.ip || "85.34.78.112").split(",")[0].trim();
  const order = {
    id, createdAt: new Date().toISOString(), method,
    status: method === "card" ? "odeme-bekleniyor" : "havale-bekleniyor",
    customer, items, subtotal, shipping, total, ip, history: [],
  };
  await shop().setJSON(`orders/${id}`, order);

  if (method === "havale") return json({ id });

  // iyzico ödeme formu
  const origin = new URL(req.url).origin;
  const addr = { contactName: `${customer.name} ${customer.surname}`, city: customer.city, country: "Turkey", address: `${customer.address} ${customer.district}/${customer.city}` };
  const gsm = "+90" + customer.phone.replace(/\D/g, "").slice(-10);
  const body = {
    locale: "tr", conversationId: id, price: money(subtotal), paidPrice: money(total), currency: "TRY",
    basketId: id, paymentGroup: "PRODUCT", callbackUrl: `${origin}/api/iyzico-callback`,
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer: {
      id: customer.email, name: customer.name, surname: customer.surname, gsmNumber: gsm, email: customer.email,
      identityNumber: /^\d{11}$/.test(customer.tckn) ? customer.tckn : "11111111111",
      registrationAddress: addr.address, ip, city: customer.city, country: "Turkey",
    },
    shippingAddress: addr, billingAddress: addr,
    basketItems: items.map((i, n) => ({
      id: `${i.id}-${n}`, name: i.qty > 1 ? `${i.name} x${i.qty}` : i.name,
      category1: i.category || "Genel", itemType: "PHYSICAL", price: money(i.price * i.qty),
    })),
  };
  let r;
  try { r = await iyzico(pay, "/payment/iyzipos/checkoutform/initialize/auth/ecom", body); }
  catch { r = { status: "failure", errorMessage: "Ödeme sistemine ulaşılamadı." }; }
  if (r.status !== "success" || !r.paymentPageUrl) {
    order.status = "odeme-basarisiz";
    order.history.push({ at: new Date().toISOString(), note: `iyzico başlatılamadı: ${r.errorMessage || r.errorCode || "bilinmeyen hata"}` });
    await shop().setJSON(`orders/${id}`, order);
    return json({ error: `Ödeme başlatılamadı: ${r.errorMessage || "lütfen tekrar deneyin"}` }, 502);
  }
  order.iyzicoToken = r.token;
  await shop().setJSON(`orders/${id}`, order);
  return json({ id, paymentPageUrl: r.paymentPageUrl });
};
export const config = { path: ["/api/order", "/api/order/:id"] };
