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

export const metadata = getSEOTags();

export default function RootLayout({ children }) {
	return (
		<html lang="en" data-theme={config.colors.theme} className={font.className}>
			<head>
				<link rel="manifest" href="/manifest" />
				<meta name="theme-color" content="#ffffff" />
				<link rel="apple-touch-icon" href="icon512_maskable.png" />
				<link rel="icon" href="icon512_rounded.png" />

			</head>
			<body>
				<ClientLayout>{children}</ClientLayout>
			</body>
		</html>
	);
}