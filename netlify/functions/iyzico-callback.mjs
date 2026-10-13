import { shop, getPayment, iyzico, money } from "../lib/shop.mjs";

const back = (origin, id, ok) => Response.redirect(`${origin}/#/siparis/${id || ""}${ok ? "" : "?odeme=hata"}`, 303);

export default async (req) => {
  const origin = new URL(req.url).origin;
  let token = "";
  try { token = String((await req.formData()).get("token") || ""); } catch {}
  if (!token) return Response.redirect(`${origin}/#/sepet`, 303);

  const pay = await getPayment();
  let r;
  try { r = await iyzico(pay, "/payment/iyzipos/checkoutform/auth/ecom/detail", { locale: "tr", token }); }
  catch { r = {}; }
  const id = r.basketId || r.conversationId;
  if (!id) return Response.redirect(`${origin}/#/sepet?odeme=hata`, 303);

  const order = await shop().get(`orders/${id}`, { type: "json" });
  if (!order || order.iyzicoToken !== token) return back(origin, id, false);

  const ok = r.status === "success" && r.paymentStatus === "SUCCESS" && money(r.paidPrice) === money(order.total);
  if (order.status === "odeme-bekleniyor" || order.status === "odeme-basarisiz") {
    order.status = ok ? "yeni" : "odeme-basarisiz";
    order.payment = { paymentId: r.paymentId, paidPrice: r.paidPrice, installment: r.installment, cardFamily: r.cardFamily, lastFour: r.lastFourDigits };
    order.history.push({ at: new Date().toISOString(), note: ok ? "Kartla ödeme alındı" : `Ödeme başarısız: ${r.errorMessage || r.paymentStatus || ""}` });
    await shop().setJSON(`orders/${id}`, order);
  }
  return back(origin, id, order.status !== "odeme-basarisiz");
};
export const config = { path: "/api/iyzico-callback" };
