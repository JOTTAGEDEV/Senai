import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Geist_Mono, Rubik } from "next/font/google";
import { FundoVidro } from "@/components/FundoVidro";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["600"] });
// Títulos metálicos (arredondado e pesado, como a referência "AE Glass")
const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], weight: ["700", "800"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Milano Multimarcas · Painel",
  description: "Atendimento com IA no WhatsApp, estoque e leads da Milano Multimarcas",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${rubik.variable} antialiased`}>
        <FundoVidro />
        {children}
      </body>
    </html>
  );
}
