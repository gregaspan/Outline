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
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      }
    ]
  };
}