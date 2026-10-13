(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tl = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  let DATA = null;

  // ---------- simgeler ----------
  const ICON = {
    fener: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M10 26h14l6-6h14v24H30l-6-6H10z"/><path d="M44 20h8v24h-8M18 26v12"/><path d="M56 26l5-3M56 32h6M56 38l5 3"/></svg>',
    nisangah: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="10" y="16" width="44" height="30" rx="6"/><circle cx="32" cy="31" r="9"/><circle cx="32" cy="31" r="2" fill="currentColor"/><path d="M14 52h36M20 46v6M44 46v6"/></svg>',
    optik: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><circle cx="18" cy="42" r="10"/><circle cx="46" cy="42" r="10"/><path d="M8 40l6-20h8l4 14M56 40l-6-20h-8l-4 14M26 34h12"/></svg>',
    aksesuar: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><rect x="14" y="20" width="36" height="30" rx="4"/><path d="M24 20v-6h16v6M14 32h36M30 32v6h4v-6"/></svg>',
  };
  const I = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="18" cy="17.5" r="1.8"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9h11a5 5 0 0 1 0 10H9"/><path d="M8 5L4 9l4 4"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.6-.5-1-1.1-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.6.6-.9 1.4-.9 2.2.1 1 .5 1.9 1.1 2.7 1.1 1.6 2.5 2.9 4.2 3.7.5.2.9.4 1.4.5.6.2 1.1.1 1.6.1.6-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.2-1.3l-.6-.3z"/></svg>',
  };
  const catName = (id) => (DATA.categories.find((c) => c.id === id) || {}).name || "";
  const imgUrl = (k) => `/img/${encodeURIComponent(k)}`;
  const thumb = (p, cls = "") => `<div class="thumb ${cls}">${p.images && p.images[0]
    ? `<img src="${imgUrl(p.images[0])}" alt="${esc(p.name)}" loading="lazy">`
    : `<div class="ph">${ICON[p.category] || ICON.aksesuar}</div>`}`;
  const priceHtml = (p) => p.price > 0
    ? `<div class="price">${tl(p.price)}${p.oldPrice > p.price ? `<s>${tl(p.oldPrice)}</s>` : ""}</div>`
    : `<div class="price ask">Fiyat için bize yazın</div>`;

  // ---------- iletişim ----------
  const waNumber = () => {
    let n = String(DATA.settings.whatsapp || "").replace(/\D/g, "");
    if (!n) return "";
    if (n.startsWith("0")) n = "9" + n;
    if (n.length === 10) n = "90" + n;
    return n;
  };
  const askLink = (text) => {
    const n = waNumber();
    if (n) return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
    if (DATA.settings.instagram) return `https://ig.me/m/${encodeURIComponent(DATA.settings.instagram)}`;
    return "";
  };

  // ---------- sepet ----------
  const CART_KEY = "opticalav-cart";
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { cart = []; }
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} updateCartBadge(); };
  const cartLines = () => cart.map((c) => ({ ...c, p: DATA.products.find((p) => p.id === c.id) }))
    .filter((c) => c.p && c.p.price > 0 && c.p.inStock);
  const updateCartBadge = () => { const n = cart.reduce((s, c) => s + c.qty, 0); $("#cart-n").textContent = n || ""; };
  const addToCart = (id, qty) => {
    const ex = cart.find((c) => c.id === id);
    if (ex) ex.qty = Math.min(20, ex.qty + qty); else cart.push({ id, qty: Math.min(20, qty) });
    saveCart();
    toast(`Sepete eklendi <a href="#/sepet">Sepete git →</a>`);
  };
  const totals = () => {
    const lines = cartLines();
    const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    const s = DATA.settings;
    const shipping = !lines.length ? 0 : (s.freeShippingOver > 0 && subtotal >= s.freeShippingOver ? 0 : Number(s.shippingFee) || 0);
    return { lines, subtotal, shipping, total: subtotal + shipping };
  };

  let toastTimer;
  function toast(html) {
    const t = $("#toast"); t.innerHTML = html; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // ---------- sayfalar ----------
  let query = "";
  function home(cat) {
    const s = DATA.settings;
    const chips = [{ id: "", name: "Tümü" }, ...DATA.categories]
      .map((c) => `<a class="chip ${c.id === (cat || "") ? "on" : ""}" href="#/${c.id ? "k/" + c.id : ""}">${esc(c.name)}</a>`).join("");
    app.innerHTML = `
      ${cat ? "" : `<section class="hero"><div class="wrap">
        <h1>Karanlıkta <em>net görün</em>, ilk atışta vurun.</h1>
        <p>Taktik fenerler, red dot nişangahlar, dürbünler ve av aksesuarları. Hepsi orijinal, hepsi denenmiş.</p>
        <div class="badges"><span>${I.shield} Orijinal ve garantili</span><span>${I.truck} ${s.freeShippingOver > 0 ? `${tl(s.freeShippingOver)} üzeri ücretsiz kargo` : "Hızlı kargo"}</span><span>${I.lock} ${DATA.card ? "Güvenli kartla ödeme" : "Havale / EFT ile ödeme"}</span></div>
      </div></section>`}
      <div class="wrap">
        <div class="toolbar"><nav class="chips">${chips}</nav><input class="search" id="q" type="search" placeholder="Ürün ara…" value="${esc(query)}"></div>
        <div class="grid" id="grid"></div>
      </div>`;
    const draw = () => {
      const q = query.toLocaleLowerCase("tr").trim();
      const list = DATA.products
        .filter((p) => !cat || p.category === cat)
        .filter((p) => !q || `${p.name} ${p.brand}`.toLocaleLowerCase("tr").includes(q))
        .sort((a, b) => (b.featured - a.featured) || (b.inStock - a.inStock));
      $("#grid").innerHTML = list.length ? list.map((p) => `
        <a class="card" href="#/urun/${encodeURIComponent(p.id)}">
          ${thumb(p)}${!p.inStock ? '<span class="tag out">Tükendi</span>' : p.oldPrice > p.price && p.price > 0 ? '<span class="tag">İndirim</span>' : ""}</div>
          <div class="info">${p.brand ? `<span class="brand">${esc(p.brand)}</span>` : ""}<h3>${esc(p.name)}</h3>${priceHtml(p)}</div>
        </a>`).join("") : `<div class="empty" style="grid-column:1/-1">Aradığınız ürün bulunamadı.</div>`;
    };
    $("#q").addEventListener("input", (e) => { query = e.target.value; draw(); });
    draw();
  }

  function product(id) {
    const p = DATA.products.find((x) => x.id === id);
    if (!p) return notFound();
    document.title = `${p.name} · ${DATA.settings.storeName}`;
    const ask = askLink(`Merhaba, "${p.name}" hakkında bilgi almak istiyorum. ${location.href}`);
    const canBuy = p.price > 0 && p.inStock;
    app.innerHTML = `<div class="wrap">
      <div class="crumbs"><a href="#/">Ana sayfa</a> / <a href="#/k/${p.category}">${esc(catName(p.category))}</a></div>
      <div class="product">
        <div class="gallery">
          <div class="main">${p.images.length ? `<img id="main-img" src="${imgUrl(p.images[0])}" alt="${esc(p.name)}">` : `<div class="thumb" style="height:100%"><div class="ph">${ICON[p.category] || ICON.aksesuar}</div></div>`}</div>
          ${p.images.length > 1 ? `<div class="thumbs">${p.images.map((k, i) => `<button class="${i ? "" : "on"}" data-k="${esc(k)}"><img src="${imgUrl(k)}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div>
          ${p.brand ? `<span class="brand">${esc(p.brand)}</span>` : ""}
          <h1>${esc(p.name)}</h1>
          ${priceHtml(p)}
          <div class="stock ${p.inStock ? "" : "no"}">${p.inStock ? "Stokta" : "Stokta yok"}</div>
          <div class="buy">
            ${canBuy ? `<div class="qty"><button data-d="-1" aria-label="Azalt">−</button><input id="qty" type="number" min="1" max="20" value="1" inputmode="numeric"><button data-d="1" aria-label="Arttır">+</button></div>
              <button class="btn grow" id="add">Sepete ekle</button>` : ""}
            ${ask ? `<a class="btn ${canBuy ? "ghost" : "wa"} ${canBuy ? "" : "grow"}" href="${ask}" target="_blank" rel="noopener">${I.wa} ${canBuy ? "Soru sor" : "Fiyat sor / sipariş ver"}</a>` : ""}
          </div>
          <div class="perks">
            <div>${I.shield} Orijinal ürün, distribütör garantili</div>
            <div>${I.truck} Hafta içi 14:00'e kadar verilen siparişler aynı gün kargoda</div>
            <div>${I.back} ${DATA.settings.returnDays} gün içinde koşulsuz iade hakkı</div>
          </div>
          ${p.description ? `<div class="desc">${esc(p.description)}</div>` : ""}
        </div>
      </div></div>`;
    app.querySelectorAll(".thumbs button").forEach((b) => b.addEventListener("click", () => {
      $("#main-img").src = imgUrl(b.dataset.k);
      app.querySelectorAll(".thumbs button").forEach((x) => x.classList.toggle("on", x === b));
    }));
    if (canBuy) {
      const q = $("#qty");
      app.querySelectorAll(".qty button").forEach((b) => b.addEventListener("click", () => {
        q.value = Math.max(1, Math.min(20, (parseInt(q.value) || 1) + Number(b.dataset.d)));
      }));
      $("#add").addEventListener("click", () => addToCart(p.id, Math.max(1, Math.min(20, parseInt(q.value) || 1))));
    }
    window.scrollTo(0, 0);
  }

  function sumHtml(t) {
    const s = DATA.settings;
    return `<div class="sum">
      <div><span>Ara toplam</span><span>${tl(t.subtotal)}</span></div>
      <div><span>Kargo</span><span>${t.shipping ? tl(t.shipping) : "Ücretsiz"}</span></div>
      ${s.freeShippingOver > 0 && t.shipping ? `<div class="note">${tl(s.freeShippingOver - t.subtotal)} daha ekleyin, kargo ücretsiz olsun.</div>` : ""}
      <div class="total"><span>Toplam</span><span>${tl(t.total)}</span></div>
      <div class="note">Fiyatlara KDV dahildir.</div></div>`;
  }

  function cartPage() {
    const t = totals();
    if (!t.lines.length) {
      app.innerHTML = `<div class="wrap result"><h1 class="page-title">Sepetiniz boş</h1><p class="note">Beğendiğiniz ürünleri sepete ekleyerek alışverişe başlayın.</p><a class="btn" href="#/">Ürünlere göz at</a></div>`;
      return;
    }
    app.innerHTML = `<div class="wrap"><h1 class="page-title">Sepetim</h1><div class="two">
      <div class="panel">${t.lines.map((l) => `
        <div class="line-item" data-id="${esc(l.id)}">
          ${thumb(l.p)}</div>
          <div><a class="name" href="#/urun/${encodeURIComponent(l.id)}">${esc(l.p.name)}</a><div class="note">${tl(l.p.price)}</div>
            <div class="qty" style="margin-top:6px"><button data-d="-1">−</button><input value="${l.qty}" readonly><button data-d="1">+</button></div></div>
          <div class="right"><b>${tl(l.p.price * l.qty)}</b><button class="link-btn" data-rm>Kaldır</button></div>
        </div>`).join("")}</div>
      <div class="panel"><h2>Sipariş özeti</h2>${sumHtml(t)}<a class="btn block" href="#/odeme" style="margin-top:16px">Siparişi tamamla</a></div>
    </div></div>`;
    app.querySelectorAll(".line-item").forEach((row) => {
      const c = cart.find((x) => x.id === row.dataset.id);
      row.querySelectorAll(".qty button").forEach((b) => b.addEventListener("click", () => {
        c.qty = Math.max(1, Math.min(20, c.qty + Number(b.dataset.d))); saveCart(); cartPage();
      }));
      row.querySelector("[data-rm]").addEventListener("click", () => { cart = cart.filter((x) => x !== c); saveCart(); cartPage(); });
    });
  }

  function checkout() {
    const t = totals();
    if (!t.lines.length) return (location.hash = "#/sepet");
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("opticalav-customer") || "{}"); } catch {}
    const f = (name, label, attrs = "", cls = "") => `<label class="f ${cls}">${label}<input name="${name}" value="${esc(saved[name] || "")}" ${attrs}></label>`;
    app.innerHTML = `<div class="wrap"><h1 class="page-title">Ödeme</h1>
      <form class="two" id="co" novalidate>
        <div style="display:grid;gap:16px">
          <div class="panel"><h2>Teslimat bilgileri</h2><div class="form">
            ${f("name", "Ad", 'required autocomplete="given-name"')}
            ${f("surname", "Soyad", 'required autocomplete="family-name"')}
            ${f("phone", "Cep telefonu", 'required type="tel" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx"')}
            ${f("email", "E-posta", 'required type="email" autocomplete="email"')}
            ${f("city", "İl", 'required autocomplete="address-level1"')}
            ${f("district", "İlçe", 'required autocomplete="address-level2"')}
            <label class="f full">Açık adres<textarea name="address" required autocomplete="street-address">${esc(saved.address || "")}</textarea></label>
            <label class="f full">Sipariş notu <span class="opt">(isteğe bağlı)</span><textarea name="note" style="min-height:60px"></textarea></label>
          </div></div>
          <div class="panel"><h2>Fatura</h2><div class="form">
            <label class="f full">Fatura tipi<select name="invoiceType" id="inv"><option value="bireysel">Bireysel</option><option value="kurumsal">Kurumsal (şirket)</option></select></label>
            <div class="full form" id="inv-b" style="padding:0">${f("tckn", 'T.C. Kimlik No <span class="opt">(isteğe bağlı)</span>', 'inputmode="numeric" maxlength="11"', "full")}</div>
            <div class="full form" id="inv-k" hidden>${f("companyName", "Firma ünvanı", "", "full")}${f("taxOffice", "Vergi dairesi")}${f("taxNo", "Vergi no", 'inputmode="numeric" maxlength="11"')}</div>
          </div></div>
          <div class="panel"><h2>Ödeme yöntemi</h2><div class="pay-opts">
            ${DATA.card ? `<label class="pay-opt"><input type="radio" name="method" value="card" checked><span><b>Kredi / banka kartı</b><small>iyzico güvencesiyle, taksit seçenekleriyle</small></span></label>` : ""}
            <label class="pay-opt"><input type="radio" name="method" value="havale" ${DATA.card ? "" : "checked"}><span><b>Havale / EFT</b><small>Sipariş sonrası IBAN bilgisi gösterilir, ödeme onayıyla kargolanır</small></span></label>
          </div></div>
        </div>
        <div class="panel" style="position:sticky;top:80px"><h2>Sipariş özeti</h2>
          ${t.lines.map((l) => `<div class="sum" style="margin-bottom:8px"><div><span>${esc(l.p.name)} × ${l.qty}</span><span>${tl(l.p.price * l.qty)}</span></div></div>`).join("")}
          <div style="border-top:1px solid var(--line);margin:10px 0 12px"></div>
          ${sumHtml(t)}
          <label class="check" style="margin-top:16px"><input type="checkbox" name="accepted"><span><a href="#/sayfa/on-bilgilendirme" target="_blank">Ön Bilgilendirme Formu</a>'nu ve <a href="#/sayfa/mesafeli-satis" target="_blank">Mesafeli Satış Sözleşmesi</a>'ni okudum, onaylıyorum.</span></label>
          <p class="note" style="margin:10px 0 0">Kişisel verileriniz <a href="#/sayfa/kvkk" target="_blank">KVKK Aydınlatma Metni</a> kapsamında işlenir.</p>
          <div id="co-err" class="err" hidden style="margin-top:12px"></div>
          <button class="btn block" style="margin-top:14px" id="co-btn">${I.lock} Siparişi onayla</button>
        </div>
      </form></div>`;
    $("#inv").value = saved.invoiceType || "bireysel";
    const inv = () => { const k = $("#inv").value === "kurumsal"; $("#inv-k").hidden = !k; $("#inv-b").hidden = k; };
    $("#inv").addEventListener("change", inv); inv();

    $("#co").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const customer = Object.fromEntries(["name", "surname", "phone", "email", "city", "district", "address", "note", "invoiceType", "tckn", "companyName", "taxOffice", "taxNo"].map((k) => [k, String(fd.get(k) || "").trim()]));
      const err = $("#co-err"); err.hidden = true;
      const show = (m) => { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: "center", behavior: "smooth" }); };
      const req = ["name", "surname", "phone", "email", "city", "district", "address"];
      const miss = req.find((k) => !customer[k]);
      if (miss) { show("Lütfen teslimat bilgilerindeki tüm alanları doldurun."); e.target.elements[miss].focus(); return; }
      if (!fd.get("accepted")) return show("Devam etmek için sözleşmeleri onaylamanız gerekiyor.");
      try { const { note, ...keep } = customer; localStorage.setItem("opticalav-customer", JSON.stringify(keep)); } catch {}
      const btn = $("#co-btn"); btn.disabled = true; btn.textContent = "İşleniyor…";
      try {
        const r = await fetch("/api/order", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ customer, method: fd.get("method") || "havale", accepted: true, items: t.lines.map((l) => ({ id: l.id, qty: l.qty })) }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Sipariş oluşturulamadı.");
        if (d.paymentPageUrl) { location.href = d.paymentPageUrl; return; }
        cart = []; saveCart();
        location.hash = `#/siparis/${d.id}`;
      } catch (ex) {
        show(ex.message || "Bağlantı hatası, lütfen tekrar deneyin.");
        btn.disabled = false; btn.innerHTML = `${I.lock} Siparişi onayla`;
      }
    });
  }

  async function orderPage(id, failed) {
    app.innerHTML = `<div class="loading">Sipariş bilgisi yükleniyor…</div>`;
    let o;
    try { const r = await fetch(`/api/order/${encodeURIComponent(id)}`); o = r.ok ? await r.json() : null; } catch {}
    if (!o) return notFound();
    const bad = failed || o.status === "odeme-basarisiz";
    if (!bad && o.method === "card") { cart = []; saveCart(); }
    const s = DATA.settings;
    const copyBtn = (v) => `<button class="copy" data-copy="${esc(v)}">Kopyala</button>`;
    app.innerHTML = `<div class="wrap result">
      <div class="icon ${bad ? "bad" : ""}">${bad ? I.x : I.check}</div>
      <h1 class="page-title" style="margin-top:0">${bad ? "Ödeme tamamlanamadı" : "Siparişiniz alındı"}</h1>
      <p>Sipariş numaranız: <b>${esc(o.id)}</b> ${copyBtn(o.id)}</p>
      ${bad ? `<p class="note">Kartınızdan çekim yapılmadı. Sepetiniz duruyor, tekrar deneyebilir veya Havale/EFT seçebilirsiniz.</p><a class="btn" href="#/sepet">Sepete dön</a>`
        : o.method === "havale" ? `<p class="note">Aşağıdaki hesaba <b>${tl(o.total)}</b> gönderin. Açıklama kısmına sipariş numaranızı yazmayı unutmayın. Ödeme onaylanınca siparişiniz kargoya verilir.</p>
          <div class="panel bank"><h2>Havale / EFT bilgileri</h2>${o.bank && o.bank.iban ? `<dl>
            <dt>Banka</dt><dd>${esc(o.bank.bankName)}</dd>
            <dt>Alıcı</dt><dd>${esc(o.bank.ibanName)}</dd>
            <dt>IBAN</dt><dd>${esc(o.bank.iban)} ${copyBtn(o.bank.iban.replace(/\s/g, ""))}</dd>
            <dt>Tutar</dt><dd>${tl(o.total)}</dd>
            <dt>Açıklama</dt><dd>${esc(o.id)}</dd></dl>` : `<p class="note">IBAN bilgisi size telefonla / WhatsApp'tan iletilecektir.</p>`}</div>`
        : `<p class="note">Ödemeniz başarıyla alındı. Siparişiniz hazırlanıp en kısa sürede kargoya verilecek.</p>`}
      ${!bad ? `<p class="note" style="margin-top:20px">Sorunuz olursa sipariş numaranızla bize ulaşın${s.phone ? `: ${esc(s.phone)}` : "."}</p><a class="btn ghost" href="#/" style="margin-top:8px">Alışverişe devam et</a>` : ""}
    </div>`;
    app.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Kopyalandı"; } catch {}
    }));
  }

  // ---------- yasal sayfalar ----------
  function legal(slug) {
    const s = DATA.settings;
    const v = (x, ph) => (x ? esc(x) : `<i>[${ph}]</i>`);
    const seller = `<p><b>Ünvan:</b> ${v(s.companyTitle, "Şirket ünvanı")}<br><b>Adres:</b> ${v(s.address, "Adres")}<br><b>Telefon:</b> ${v(s.phone, "Telefon")}<br><b>E-posta:</b> ${v(s.email, "E-posta")}<br><b>Vergi Dairesi / No:</b> ${v(s.taxOffice, "Vergi dairesi")} / ${v(s.taxNo, "Vergi no")}${s.mersis ? `<br><b>MERSİS No:</b> ${esc(s.mersis)}` : ""}</p>`;
    const days = s.returnDays || 14;
    const pages = {
      "hakkimizda": ["Hakkımızda & İletişim", `<p>${esc(s.storeName)}; taktik fenerler, red dot nişangahlar, dürbünler ve av aksesuarlarında orijinal ürün tedarik eden bir av ve outdoor mağazasıdır. Sattığımız her ürünü bizzat inceliyor, garanti belgesiyle gönderiyoruz.</p><h2>İletişim</h2>${seller}${s.instagram ? `<p><b>Instagram:</b> <a href="https://instagram.com/${encodeURIComponent(s.instagram)}" target="_blank" rel="noopener">@${esc(s.instagram)}</a></p>` : ""}`],
      "mesafeli-satis": ["Mesafeli Satış Sözleşmesi", `
        <h2>1. Taraflar</h2><p><b>SATICI</b></p>${seller}<p><b>ALICI:</b> Sipariş formunda adı, adresi ve iletişim bilgileri yer alan kişidir.</p>
        <h2>2. Konu</h2><p>İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait internet sitesinden elektronik ortamda siparişini verdiği, nitelikleri ve satış fiyatı sipariş özetinde belirtilen ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.</p>
        <h2>3. Ürün, fiyat ve ödeme</h2><p>Ürünün cinsi, miktarı, KDV dahil satış fiyatı, kargo ücreti ve ödeme şekli sipariş özetinde ve ALICI'ya gönderilen sipariş bilgisinde yer aldığı gibidir. Kartla yapılan ödemeler iyzico altyapısı üzerinden gerçekleştirilir; kart bilgileri SATICI tarafından saklanmaz.</p>
        <h2>4. Teslimat</h2><p>Ürün, ödemenin onaylanmasından itibaren yasal 30 günlük süreyi aşmamak kaydıyla ALICI'nın belirttiği adrese kargo ile teslim edilir. Teslimat sırasında hasarlı paketi teslim almamanız ve kargo görevlisine tutanak tutturmanız gerekir.</p>
        <h2>5. Cayma hakkı</h2><p>ALICI, ürünü teslim aldığı tarihten itibaren ${days} gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Cayma bildirimi, bu süre içinde SATICI'nın e-posta adresine veya telefonuna yazılı olarak yapılır. Ürün, faturası ve tüm aksesuarlarıyla birlikte, kullanılmamış ve yeniden satılabilir durumda iade edilmelidir. SATICI, cayma bildiriminin ulaşmasından itibaren 14 gün içinde ürün bedelini ödeme yöntemine uygun şekilde iade eder.</p>
        <h2>6. Cayma hakkının kullanılamayacağı durumlar</h2><p>Ambalajı açılmış olup iadesi sağlık ve hijyen açısından uygun olmayan ürünler ile ALICI'nın istekleri doğrultusunda kişiselleştirilen ürünlerde cayma hakkı kullanılamaz.</p>
        <h2>7. Uyuşmazlık</h2><p>Uyuşmazlıklarda, Ticaret Bakanlığı'nca ilan edilen parasal sınırlar dahilinde ALICI'nın yerleşim yerindeki Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir.</p>
        <h2>8. Yürürlük</h2><p>ALICI, siparişi onaylamadan önce bu sözleşmeyi okuduğunu ve kabul ettiğini beyan eder. Sözleşme, sipariş onayıyla birlikte yürürlüğe girer.</p>`],
      "on-bilgilendirme": ["Ön Bilgilendirme Formu", `<h2>Satıcı bilgileri</h2>${seller}
        <h2>Ürün ve fiyat</h2><p>Satın alınan ürünlerin temel nitelikleri ürün sayfasında, KDV dahil toplam fiyatı ve kargo ücreti sipariş özetinde gösterilmektedir. Kargo ücreti ${s.shippingFee > 0 ? tl(s.shippingFee) : "ücretsiz"}${s.freeShippingOver > 0 ? `, ${tl(s.freeShippingOver)} ve üzeri siparişlerde ücretsizdir` : ""}.</p>
        <h2>Ödeme ve teslimat</h2><p>Ödeme kredi/banka kartı (iyzico) veya havale/EFT ile yapılabilir. Ürün, ödeme onayından sonra en geç 30 gün içinde teslim edilir; stoktaki ürünler genellikle 1-3 iş günü içinde kargoya verilir.</p>
        <h2>Cayma hakkı</h2><p>Teslimattan itibaren ${days} gün içinde cayma hakkınızı kullanabilirsiniz. Ayrıntılar için <a href="#/sayfa/iade">İptal ve İade Koşulları</a> sayfasına bakınız.</p>
        <h2>Şikâyet ve itiraz</h2><p>Şikâyetlerinizi yukarıdaki iletişim kanallarından iletebilir; ayrıca yerleşim yerinizdeki Tüketici Hakem Heyeti veya Tüketici Mahkemesi'ne başvurabilirsiniz.</p>`],
      "iade": ["İptal ve İade Koşulları", `<p>Ürünü teslim aldığınız tarihten itibaren <b>${days} gün</b> içinde iade edebilirsiniz.</p>
        <h2>Nasıl iade ederim?</h2><p>1. Sipariş numaranızla birlikte ${s.phone ? `${esc(s.phone)} numarasından` : "telefonla"}${s.email ? ` veya ${esc(s.email)} adresinden` : ""} bize ulaşın.<br>2. Ürünü faturası, kutusu ve tüm aksesuarlarıyla eksiksiz paketleyin.<br>3. Size bildirdiğimiz anlaşmalı kargo kodu ile gönderin.</p>
        <h2>Para iadesi</h2><p>Ürün bize ulaşıp kontrol edildikten sonra en geç 14 gün içinde ücret iadesi yapılır. Kartla ödemelerde iade kartınıza, havale ile ödemelerde bildirdiğiniz IBAN'a yapılır. Kartınıza yansıma süresi bankanıza göre değişebilir.</p>
        <h2>Sipariş iptali</h2><p>Kargoya verilmemiş siparişlerinizi bize ulaşarak ücretsiz iptal edebilirsiniz.</p>
        <h2>Garanti</h2><p>Ürünler distribütör/üretici garantisi kapsamındadır. Arızalı ürünlerde garanti sürecini sizin adınıza biz takip ederiz.</p>`],
      "kvkk": ["KVKK Aydınlatma Metni", `<p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla ${v(s.companyTitle, "Şirket ünvanı")} olarak kişisel verilerinizi aşağıda açıklanan kapsamda işlemekteyiz.</p>
        <h2>İşlenen veriler</h2><p>Ad-soyad, telefon, e-posta, teslimat ve fatura adresi, T.C. kimlik no (fatura için, isteğe bağlı), sipariş ve ödeme işlem bilgileri, IP adresi.</p>
        <h2>Amaçlar ve hukuki sebep</h2><p>Siparişinizin alınması, ödemenin işlenmesi, teslimatı, faturalandırılması, iade ve garanti süreçlerinin yürütülmesi ile yasal yükümlülüklerin yerine getirilmesi amacıyla; KVKK m.5/2 (c) sözleşmenin ifası, (ç) hukuki yükümlülük ve (f) meşru menfaat hukuki sebeplerine dayanarak işlenir.</p>
        <h2>Aktarım</h2><p>Verileriniz yalnızca bu amaçlarla sınırlı olarak kargo firmalarına, ödeme kuruluşuna (iyzico), mali müşavirimize ve talep halinde yetkili kamu kurumlarına aktarılır. Kart bilgileriniz tarafımızca görülmez ve saklanmaz.</p>
        <h2>Haklarınız</h2><p>KVKK m.11 kapsamındaki haklarınız (verilerinize erişme, düzeltme, silme, itiraz vb.) için ${v(s.email, "E-posta")} adresine başvurabilirsiniz.</p>`],
    };
    const pg = pages[slug];
    if (!pg) return notFound();
    document.title = `${pg[0]} · ${s.storeName}`;
    app.innerHTML = `<div class="wrap"><h1 class="page-title">${pg[0]}</h1><div class="legal">${pg[1]}</div></div>`;
    window.scrollTo(0, 0);
  }

  function notFound() {
    app.innerHTML = `<div class="wrap result"><h1 class="page-title">Sayfa bulunamadı</h1><a class="btn" href="#/">Ana sayfaya dön</a></div>`;
  }

  function chrome() {
    const s = DATA.settings;
    $("#store-name").textContent = s.storeName; $("#f-name").textContent = s.storeName;
    $("#store-tag").textContent = s.tagline;
    if (s.announcement) { $("#announce").textContent = s.announcement; $("#announce").hidden = false; }
    $("#f-contact").innerHTML = [
      s.phone && `<a href="tel:${esc(s.phone.replace(/\s/g, ""))}">${esc(s.phone)}</a>`,
      s.email && `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`,
      s.instagram && `<a href="https://instagram.com/${encodeURIComponent(s.instagram)}" target="_blank" rel="noopener">Instagram @${esc(s.instagram)}</a>`,
      s.address && `<span>${esc(s.address)}</span>`,
    ].filter(Boolean).join("");
    $("#f-copy").textContent = `© ${new Date().getFullYear()} ${s.companyTitle || s.storeName}`;
    $("#f-pay").textContent = DATA.card ? "Ödemeler iyzico güvencesiyle · 256-bit SSL" : "256-bit SSL ile güvenli alışveriş";
    const wa = askLink("Merhaba, bilgi almak istiyorum.");
    if (wa && waNumber()) { const f = $("#wa-float"); f.href = wa; f.innerHTML = I.wa; f.hidden = false; }
  }

  function route() {
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    document.title = `${DATA.settings.storeName} · ${DATA.settings.tagline}`;
    if (!parts.length) home("");
    else if (parts[0] === "k") home(parts[1]);
    else if (parts[0] === "urun") product(parts[1]);
    else if (parts[0] === "sepet") cartPage();
    else if (parts[0] === "odeme") checkout();
    else if (parts[0] === "siparis") orderPage(parts[1], /odeme=hata/.test(qs || ""));
    else if (parts[0] === "sayfa") legal(parts[1]);
    else notFound();
    if (parts[0] !== "urun" && parts[0] !== "sayfa") window.scrollTo(0, 0);
  }

  (async () => {
    try {
      const r = await fetch("/api/catalog");
      DATA = await r.json();
    } catch {
      app.innerHTML = `<div class="wrap result"><h1 class="page-title">Bağlantı hatası</h1><p class="note">Sayfayı yenilemeyi deneyin.</p></div>`;
      return;
    }
    chrome(); updateCartBadge(); route();
    window.addEventListener("hashchange", route);
  })();
})();
