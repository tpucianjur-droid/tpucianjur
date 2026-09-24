import type { MetadataRoute } from "next";
import { TPU_ASSETS } from "@/lib/assets";
import { APP } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP.name,
    short_name: "TPU Astana",
    description: APP.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f7",
    theme_color: "#174a3a",
    lang: "id",
    icons: [
      { src: TPU_ASSETS.appIcon, sizes: "192x192", type: "image/png" },
      { src: TPU_ASSETS.logoMark, sizes: "512x512", type: "image/png" },
    ],
  };
}
