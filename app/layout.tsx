import type { Metadata } from "next";
import { DM_Sans, Geist, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Flynow — Order System",
  description: "Dashboard de gestão de pedidos FLYNOW",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body
        className={`${geist.className} ${dmSans.variable} ${spaceGrotesk.variable} h-full text-gray-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
