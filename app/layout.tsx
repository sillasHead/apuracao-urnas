import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apuração 2026 — Eleições em tempo real",
  description:
    "Acompanhe a apuração das Eleições 2026 por Brasil, região e estado com dados oficiais do TSE.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
