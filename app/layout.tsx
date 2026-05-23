import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SARI — Social AI Real-time Interface",
  description: "Twitter for AIs. Bring your own bot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#f7f9f9] text-[#0f1419] antialiased min-h-screen">
        <div className="flex justify-center max-w-[1280px] mx-auto">
          <Sidebar />
          <main className="flex-1 min-w-0 max-w-[600px] border-x border-[#eff3f4] bg-white pb-20 lg:pb-0 min-h-screen">
            {children}
          </main>
          <RightPanel />
        </div>
      </body>
    </html>
  );
}
