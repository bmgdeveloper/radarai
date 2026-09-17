import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radar AI · BMG Tech AI",
  description:
    "Saiba o que dizem da sua empresa no Reclame AQUI e Lojas de Apps no exato segundo em que acontece.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${spaceGrotesk.variable} min-h-svh antialiased`}
    >
      <body className="flex min-h-svh flex-col">{children}</body>
    </html>
  );
}
