import type { Metadata } from "next";
import localFont from "next/font/local";
import MentorshipCTA from "@/components/MentorshipCTA";
import ThemeProvider from "@/components/layout/ThemeProvider";
import { PlanProvider } from "@/components/upgrade/PlanProvider";
import { GlobalUpgradeDialog } from "@/components/upgrade/GlobalUpgradeDialog";
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

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var manual = localStorage.getItem('theme-override');
      var theme = 'light';
      if (manual) {
        theme = manual;
      } else {
        var d = new Date();
        var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        var ist = new Date(utc + (3600000 * 5.5));
        var h = ist.getHours();
        var m = ist.getMinutes();
        if (h > 19 || (h === 19 && m >= 30) || h < 6) {
          theme = 'dark';
        }
      }
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.add('no-transitions');
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0 }}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <PlanProvider>
            {children}
            <MentorshipCTA />
            <GlobalUpgradeDialog />
          </PlanProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
