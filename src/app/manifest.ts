import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "備品・機材の貸出返却台帳",
    short_name: "うみねこ台帳",
    description: "共用備品の貸出・返却管理",
    lang: "ja",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#137b70",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
