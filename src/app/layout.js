/**
 * Layout raiz (App Router): `metadata` por defeito; fontes Geist via `next/font` (variáveis CSS).
 */
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "apis-core",
    template: "%s · apis-core",
  },
  description:
    "APIs REST com JWT, CRUD `demo_items`, documentação OpenAPI e utilitários de deploy.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
