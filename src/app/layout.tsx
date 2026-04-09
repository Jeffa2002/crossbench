import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crossbench — Your voice in parliament",
  description: "Vote on Australian federal legislation. Make your MP listen.",
  metadataBase: new URL("https://crossbench.io"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
