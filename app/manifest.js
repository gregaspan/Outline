export default function manifest() {
  return {
    name: "Outline",
    short_name: "Outline",
    description: "Outline – a clean, installable PWA",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "icon512_maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "icon512_rounded.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}