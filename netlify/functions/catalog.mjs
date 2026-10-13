import { json, getProducts, getSettings, getPayment, cardReady, CATEGORIES } from "../lib/shop.mjs";

export default async () => {
  const [products, settings, pay] = await Promise.all([getProducts(), getSettings(), getPayment()]);
  return json({
    settings,
    categories: CATEGORIES,
    card: cardReady(pay),
    products: products.filter((p) => p.active).map(({ sample, ...p }) => p),
  });
};
export const config = { path: "/api/catalog" };
