import { images } from "../lib/shop.mjs";

export default async (req, context) => {
  const key = context.params.key;
  if (!/^[a-z0-9-]{8,80}$/i.test(key || "")) return new Response("Bulunamadı", { status: 404 });
  const res = await images().getWithMetadata(key, { type: "arrayBuffer" });
  if (!res) return new Response("Bulunamadı", { status: 404 });
  return new Response(res.data, {
    headers: {
      "content-type": res.metadata?.type || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
export const config = { path: "/img/:key" };
