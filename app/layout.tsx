import type { Metadata } from "next";
import localFont from "next/font/local";
import MentorshipCTA from "@/components/MentorshipCTA";
import {
  BRAND_ASSETS,
  BRAND_DESCRIPTION,
  BRAND_KEYWORDS,
  BRAND_NAME,
  BRAND_TITLE,
} from "@/lib/branding";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: BRAND_TITLE,
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  keywords: BRAND_KEYWORDS,
  icons: {
    icon: BRAND_ASSETS.icon,
    shortcut: BRAND_ASSETS.icon,
    apple: BRAND_ASSETS.icon,
  },
  openGraph: {
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
    type: "website",
    images: [
      {
        url: BRAND_ASSETS.logo,
        alt: `${BRAND_NAME} logo`,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0 }}
        suppressHydrationWarning
      >
        {children}
        <MentorshipCTA />
      </body>
    </html>
  );
}
