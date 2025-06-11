// app/layout.js

import { Inter } from "next/font/google";
import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import config from "@/config";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const viewport = {
  themeColor: config.colors.main,
  width: "device-width",
  initialScale: 1,
};

// Merge your default SEO tags with PWA-specific metadata
export const metadata = {
  ...getSEOTags(),
  manifest: "/manifest.json",
  themeColor: config.colors.main,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme={config.colors.theme}
      className={font.className}
    >
      <body>
        {/* ClientLayout wraps your app and includes client-only features */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}