(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tl = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
  const date = (s) => new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const STATUS = {
    "havale-bekleniyor": ["Havale bekleniyor", "warn"], "odeme-bekleniyor": ["Kart ödemesi yarım kaldı", ""],
    "odeme-basarisiz": ["Ödeme başarısız", "bad"], "yeni": ["Yeni · ödendi", "warn"], "hazirlaniyor": ["Hazırlanıyor", ""],
    "kargoda": ["Kargoda", ""], "teslim-edildi": ["Teslim edildi", "ok"], "iptal": ["İptal", "bad"],
  };
  const ICON = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="10" y="16" width="44" height="30" rx="6"/><circle cx="32" cy="31" r="9"/></svg>';

  let token = "";
  try { token = localStorage.getItem("opticalav-admin") || ""; } catch {}
  let D = null, tab = "orders";

  let tt;
  const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2600); };

  async function api(action, { method = "GET", body, raw, type } = {}) {
    const r = await fetch(`/api/admin/${action}`, {
      method, headers: { authorization: `Bearer ${token}`, ...(raw ? { "content-type": type } : body ? { "content-type": "application/json" } : {}) },
      body: raw || (body ? JSON.stringify(body) : undefined),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && action !== "login") { logout(); throw new Error(d.error || "Oturum kapandı"); }
    if (!r.ok) throw new Error(d.error || "İşlem başarısız");
    return d;
  }
  function logout() { token = ""; try { localStorage.removeItem("opticalav-admin"); } catch {} $("#logout").hidden = true; login(); }
  $("#logout").addEventListener("click", logout);

  function login(msg) {
    app.innerHTML = `<form class="panel login" id="lf"><h2>Yönetici girişi</h2>
      <label class="f">Şifre<input type="password" name="pw" autocomplete="current-password" required autofocus></label>
      <div class="err" id="le" ${msg ? "" : "hidden"} style="margin-top:12px">${esc(msg || "")}</div>
      <button class="btn block" style="margin-top:14px">Giriş yap</button></form>`;
    $("#lf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = e.target.querySelector("button"); b.disabled = true;
      try {
        const d = await api("login", { method: "POST", body: { password: e.target.pw.value } });
        token = d.token; try { localStorage.setItem("opticalav-admin", token); } catch {}
        await load();
      } catch (ex) { $("#le").textContent = ex.message; $("#le").hidden = false; b.disabled = false; }
    });
  }

  async function load() {
    app.innerHTML = `<div class="loading">Yükleniyor…</div>`;
    try { D = await api("data"); } catch (e) { if (token) app.innerHTML = `<div class="err" style="margin:20px 0">${esc(e.message)}</div>`; return; }
    $("#logout").hidden = false;
    render();
  }

  function render() {
    const waiting = D.orders.filter((o) => ["yeni", "havale-bekleniyor"].includes(o.status)).length;
    const tabs = [["orders", `Siparişler${waiting ? `<span class="badge">${waiting}</span>` : ""}`], ["products", "Ürünler"], ["settings", "Mağaza bilgileri"], ["payment", "Kartla ödeme"], ["password", "Şifre"]];
    app.innerHTML = `<nav class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</nav><div id="view"></div>`;
    app.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.t; render(); }));
    ({ orders, products, settings, payment, password })[tab]();
  }
  const view = () => $("#view");

  // ---------- siparişler ----------
  let ofilter = "acik";
  function orders() {
    const open = ["havale-bekleniyor", "yeni", "hazirlaniyor", "kargoda"];
    const list = D.orders.filter((o) => ofilter === "hepsi" || (ofilter === "acik" ? open.includes(o.status) : !open.includes(o.status)));
    view().innerHTML = `
      <div class="filters"><select id="of"><option value="acik">Açık siparişler</option><option value="kapali">Tamamlanan / iptal / başarısız</option><option value="hepsi">Tümü</option></select>
      <button class="btn ghost" id="refresh" style="min-height:38px">Yenile</button></div>
      <div class="list">${list.length ? list.map(orderCard).join("") : `<div class="empty">Burada sipariş yok.</div>`}</div>`;
    $("#of").value = ofilter;
    $("#of").addEventListener("change", (e) => { ofilter = e.target.value; orders(); });
    $("#refresh").addEventListener("click", load);
    view().querySelectorAll("form[data-id]").forEach((f) => f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      try {
        const { order } = await api("order", { method: "POST", body: { id: f.dataset.id, status: fd.get("status"), cargo: fd.get("cargo"), adminNote: fd.get("adminNote") } });
        D.orders = D.orders.map((o) => (o.id === order.id ? order : o));
        toast("Sipariş güncellendi"); render();
      } catch (ex) { toast(ex.message); }
    }));
  }
  function orderCard(o) {
    const c = o.customer, [sl, sc] = STATUS[o.status] || [o.status, ""];
    const phone = c.phone.replace(/\D/g, "");
    const wa = phone ? `https://wa.me/${phone.length === 10 ? "90" + phone : phone.replace(/^0/, "90")}` : "";
    return `<details class="order"><summary>
        <b>${esc(c.name)} ${esc(c.surname)}</b><b>${tl(o.total)}</b>
        <span class="meta" style="font-size:13px;color:var(--muted)">${esc(o.id)} · ${date(o.createdAt)} · ${o.method === "card" ? "Kart" : "Havale"}</span><span class="pill ${sc}">${sl}</span>
      </summary><div class="body">
        <div>${o.items.map((i) => `<div class="row" style="justify-content:space-between"><span>${esc(i.name)} × ${i.qty}</span><span>${tl(i.price * i.qty)}</span></div>`).join("")}
          <div class="row note" style="justify-content:space-between"><span>Kargo</span><span>${o.shipping ? tl(o.shipping) : "Ücretsiz"}</span></div></div>
        <dl>
          <dt>Telefon</dt><dd><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>${wa ? ` · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</dd>
          <dt>E-posta</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd>
          <dt>Adres</dt><dd>${esc(c.address)}<br>${esc(c.district)} / ${esc(c.city)}</dd>
          <dt>Fatura</dt><dd>${c.invoiceType === "kurumsal" ? `${esc(c.companyName)} · ${esc(c.taxOffice)} · ${esc(c.taxNo)}` : `Bireysel${c.tckn ? ` · TC: ${esc(c.tckn)}` : ""}`}</dd>
          ${c.note ? `<dt>Not</dt><dd>${esc(c.note)}</dd>` : ""}
          ${o.payment ? `<dt>Ödeme</dt><dd>iyzico #${esc(o.payment.paymentId)} · ${esc(o.payment.cardFamily || "")} **** ${esc(o.payment.lastFour || "")}${o.payment.installment > 1 ? ` · ${o.payment.installment} taksit` : ""}</dd>` : ""}
          ${o.history.length ? `<dt>Geçmiş</dt><dd style="font-size:13px;color:var(--muted)">${o.history.map((h) => `${date(h.at)} – ${esc(h.note)}`).join("<br>")}</dd>` : ""}
        </dl>
        <form data-id="${esc(o.id)}" class="form">
          <label class="f">Durum<select name="status">${D.statuses.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${(STATUS[s] || [s])[0]}</option>`).join("")}</select></label>
          <label class="f">Kargo takip no<input name="cargo" value="${esc(o.cargo || "")}" placeholder="Örn. Yurtiçi 123456"></label>
          <label class="f full">Kendi notunuz<input name="adminNote" value="${esc(o.adminNote || "")}"></label>
          <button class="btn full">Kaydet</button>
        </form>
      </div></details>`;
  }

  // ---------- ürünler ----------
  function products() {
    view().innerHTML = `
      <div class="filters"><button class="btn" id="new">+ Yeni ürün</button><input id="pq" type="search" placeholder="Ürün ara…"></div>
      ${D.products.some((p) => p.sample) ? `<div class="hint" style="margin-bottom:12px">Listede Instagram'dan derlediğim <b>örnek ürünler</b> var. Fiyatı ve fotoğrafı girip kaydedin; satmadığınız ürünleri silin. Fiyatı 0 olan ürünlerde sitede "Fiyat için bize yazın" çıkar.</div>` : ""}
      <div class="list" id="pl"></div>`;
    const draw = () => {
      const q = $("#pq").value.toLocaleLowerCase("tr");
      $("#pl").innerHTML = D.products.filter((p) => !q || p.name.toLocaleLowerCase("tr").includes(q)).map((p) => `
        <button class="item" data-id="${esc(p.id)}">
          <div class="thumb">${p.images[0] ? `<img src="/img/${esc(p.images[0])}" alt="">` : `<div class="ph">${ICON}</div>`}</div>
          <div><h3>${esc(p.name)}</h3><div class="meta">${p.price > 0 ? tl(p.price) : "Fiyat girilmedi"} · ${esc((D.categories.find((c) => c.id === p.category) || {}).name || "")}</div></div>
          <div style="display:grid;gap:4px;justify-items:end">${!p.active ? '<span class="pill">Gizli</span>' : !p.inStock ? '<span class="pill bad">Tükendi</span>' : '<span class="pill ok">Satışta</span>'}${p.sample ? '<span class="pill warn">Örnek</span>' : ""}</div>
        </button>`).join("") || `<div class="empty">Ürün yok.</div>`;
      $("#pl").querySelectorAll(".item").forEach((b) => b.addEventListener("click", () => edit(D.products.find((p) => p.id === b.dataset.id))));
    };
    $("#pq").addEventListener("input", draw);
    $("#new").addEventListener("click", () => edit(null));
    draw();
  }

  async function resize(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const max = 1600, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    } finally { URL.revokeObjectURL(url); }
  }

  function edit(p) {
    const isNew = !p;
    p = p ? { ...p, images: [...p.images] } : { name: "", brand: "", category: "fener", description: "", price: 0, oldPrice: 0, images: [], inStock: true, active: true, featured: false };
    const imgs = () => `${p.images.map((k, i) => `<div class="im"><img src="/img/${esc(k)}" alt=""><button type="button" data-rm="${i}" aria-label="Sil">×</button>${i === 0 ? '<span class="cover">Kapak</span>' : ""}</div>`).join("")}
      <label class="im add">+ Fotoğraf<br>ekle<input type="file" accept="image/*" multiple hidden id="up"></label>`;
    view().innerHTML = `<form class="panel" id="pf" style="margin-bottom:60px">
      <button type="button" class="link-btn" id="back">← Ürünlere dön</button>
      <h2 style="margin-top:12px">${isNew ? "Yeni ürün" : "Ürünü düzenle"}</h2>
      <div class="form">
        <label class="f full">Ürün adı<input name="name" required value="${esc(p.name)}"></label>
        <label class="f">Marka<input name="brand" value="${esc(p.brand)}"></label>
        <label class="f">Kategori<select name="category">${D.categories.map((c) => `<option value="${c.id}" ${c.id === p.category ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
        <label class="f">Satış fiyatı (₺, KDV dahil)<input name="price" type="number" min="0" step="0.01" inputmode="decimal" value="${p.price || ""}" placeholder="0"></label>
        <label class="f">Eski fiyat <span class="opt">(indirim göstermek için)</span><input name="oldPrice" type="number" min="0" step="0.01" inputmode="decimal" value="${p.oldPrice || ""}"></label>
        <div class="f full">Fotoğraflar <span class="opt">(ilk fotoğraf kapak olur)</span><div class="imgs" id="imgs">${imgs()}</div><span class="note" id="upst"></span></div>
        <label class="f full">Açıklama<textarea name="description" style="min-height:140px">${esc(p.description)}</textarea></label>
        <div class="toggles full">
          <label class="check"><input type="checkbox" name="active" ${p.active ? "checked" : ""}> Sitede göster</label>
          <label class="check"><input type="checkbox" name="inStock" ${p.inStock ? "checked" : ""}> Stokta var</label>
          <label class="check"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}> Öne çıkar</label>
        </div>
      </div>
      <div class="sticky-actions"><button class="btn grow">Kaydet</button>${isNew ? "" : `<button type="button" class="btn ghost" id="del">Sil</button>`}</div>
    </form>`;
    window.scrollTo(0, 0);
    const wire = () => {
      $("#imgs").innerHTML = imgs();
      $("#imgs").querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { p.images.splice(Number(b.dataset.rm), 1); wire(); }));
      $("#up").addEventListener("change", async (e) => {
        const files = [...e.target.files];
        for (const [n, file] of files.entries()) {
          $("#upst").textContent = `Yükleniyor ${n + 1}/${files.length}…`;
          try {
            const blob = await resize(file);
            const { key } = await api("upload", { method: "POST", raw: blob, type: "image/jpeg" });
            p.images.push(key);
          } catch (ex) { toast(ex.message || "Fotoğraf yüklenemedi"); }
        }
        $("#upst").textContent = ""; wire();
      });
    };
    wire();
    $("#back").addEventListener("click", () => render());
    $("#pf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, fd = new FormData(f);
      const body = { id: p.id, name: fd.get("name"), brand: fd.get("brand"), category: fd.get("category"), description: fd.get("description"),
        price: Number(fd.get("price")) || 0, oldPrice: Number(fd.get("oldPrice")) || 0, images: p.images,
        active: f.active.checked, inStock: f.inStock.checked, featured: f.featured.checked };
      const btn = f.querySelector(".sticky-actions .btn"); btn.disabled = true;
      try {
        const { product } = await api("product", { method: "POST", body });
        const i = D.products.findIndex((x) => x.id === product.id);
        if (i >= 0) D.products[i] = product; else D.products.unshift(product);
        toast("Ürün kaydedildi"); render();
      } catch (ex) { toast(ex.message); btn.disabled = false; }
    });
    const del = $("#del");
    if (del) del.addEventListener("click", async () => {
      if (!confirm(`"${p.name}" silinsin mi?`)) return;
      try { await api(`product?id=${encodeURIComponent(p.id)}`, { method: "DELETE" }); D.products = D.products.filter((x) => x.id !== p.id); toast("Ürün silindi"); render(); }
      catch (ex) { toast(ex.message); }
    });
  }

  // ---------- ayarlar ----------
  function settings() {
    const s = D.settings;
    const f = (k, label, attrs = "", cls = "") => `<label class="f ${cls}">${label}<input name="${k}" value="${esc(s[k])}" ${attrs}></label>`;
    view().innerHTML = `<form class="panel" id="sf" style="margin-bottom:60px">
      <h2>Mağaza</h2><div class="form">
        ${f("storeName", "Mağaza adı")}${f("tagline", "Slogan")}
        ${f("announcement", "Üst duyuru bandı", "", "full")}
      </div>
      <h2 style="margin-top:22px">İletişim</h2><div class="form">
        ${f("phone", "Telefon", 'type="tel"')}${f("whatsapp", "WhatsApp numarası", 'type="tel" placeholder="05xx xxx xx xx"')}
        ${f("email", "E-posta", 'type="email"')}${f("instagram", "Instagram kullanıcı adı")}
        <label class="f full">Adres<textarea name="address">${esc(s.address)}</textarea></label>
      </div>
      <h2 style="margin-top:22px">Şirket <span class="note" style="font-family:var(--body);text-transform:none">(sözleşmelerde ve faturada görünür)</span></h2><div class="form">
        ${f("companyTitle", "Şirket ünvanı", "", "full")}${f("taxOffice", "Vergi dairesi")}${f("taxNo", "Vergi no / TCKN")}${f("mersis", "MERSİS no (varsa)")}
      </div>
      <h2 style="margin-top:22px">Havale / EFT</h2><div class="form">
        ${f("bankName", "Banka")}${f("ibanName", "Hesap sahibi")}${f("iban", "IBAN", 'placeholder="TR.."', "full")}
      </div>
      <h2 style="margin-top:22px">Kargo ve iade</h2><div class="form">
        ${f("shippingFee", "Kargo ücreti (₺)", 'type="number" min="0" inputmode="decimal"')}${f("freeShippingOver", "Ücretsiz kargo alt limiti (₺, 0 = yok)", 'type="number" min="0" inputmode="decimal"')}
        ${f("returnDays", "İade süresi (gün, en az 14)", 'type="number" min="14"')}
      </div>
      <div class="sticky-actions"><button class="btn grow">Kaydet</button></div>
    </form>`;
    $("#sf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      if (Number(body.returnDays) < 14) body.returnDays = 14;
      try { D.settings = (await api("settings", { method: "POST", body })).settings; toast("Bilgiler kaydedildi"); }
      catch (ex) { toast(ex.message); }
    });
  }

  function payment() {
    const p = D.payment;
    view().innerHTML = `<form class="panel" id="payf" style="margin-bottom:60px">
      <h2>Kartla ödeme (iyzico)</h2>
      <div class="hint" style="margin-bottom:16px">
        1. <a href="https://www.iyzico.com/isim-icin" target="_blank" rel="noopener">iyzico.com</a>'dan şirket adına üye işyeri başvurusu yapın. Başvuruda site adresi olarak bu siteyi verin.<br>
        2. Onaylandıktan sonra iyzico panelinde <b>Ayarlar → Firma Ayarları</b> kısmındaki <b>API Anahtarı</b> ve <b>Güvenlik Anahtarı</b>'nı buraya yapıştırın.<br>
        3. "Kartla ödemeyi aç" kutusunu işaretleyip kaydedin. Bundan sonra müşteriler ödeme sayfasında kart seçeneğini görür.
      </div>
      <div class="form">
        <label class="f full">API Anahtarı<input name="apiKey" value="${esc(p.apiKey)}" autocomplete="off"></label>
        <label class="f full">Güvenlik Anahtarı (Secret Key)<input name="secretKey" type="password" autocomplete="new-password" placeholder="${p.hasSecret ? "Kayıtlı (değiştirmek için yeni anahtarı girin)" : ""}"></label>
        <div class="toggles full">
          <label class="check"><input type="checkbox" name="enabled" ${p.enabled ? "checked" : ""}> Kartla ödemeyi aç</label>
          <label class="check"><input type="checkbox" name="sandbox" ${p.sandbox ? "checked" : ""}> Test modu (sandbox anahtarlarıyla deneme)</label>
        </div>
      </div>
      <div class="sticky-actions"><button class="btn grow">Kaydet</button></div>
    </form>`;
    $("#payf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        D.payment = (await api("payment", { method: "POST", body: { apiKey: f.apiKey.value, secretKey: f.secretKey.value, enabled: f.enabled.checked, sandbox: f.sandbox.checked } })).payment;
        toast("Ödeme ayarları kaydedildi"); payment();
      } catch (ex) { toast(ex.message); }
    });
  }

  function password() {
    view().innerHTML = `<form class="panel login" id="pwf" style="margin:0 0 60px"><h2>Şifre değiştir</h2>
      <label class="f">Mevcut şifre<input type="password" name="current" autocomplete="current-password" required></label>
      <label class="f" style="margin-top:10px">Yeni şifre (en az 8 karakter)<input type="password" name="next" minlength="8" autocomplete="new-password" required></label>
      <button class="btn block" style="margin-top:14px">Şifreyi değiştir</button></form>`;
    $("#pwf").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const d = await api("password", { method: "POST", body: { current: e.target.current.value, next: e.target.next.value } });
        token = d.token; try { localStorage.setItem("opticalav-admin", token); } catch {}
        toast("Şifre değiştirildi"); e.target.reset();
      } catch (ex) { toast(ex.message); }
    });
  }

  if (token) load(); else login();
})();
