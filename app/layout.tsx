import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import MentorshipCTA from "@/components/MentorshipCTA";

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
  title: "QuizPro – AI-Powered Data Analyst Interview Prep",
  description:
    "Master SQL, Excel & Power BI with AI-generated quizzes, deep analytics, and personalized learning paths. Built for freshers and experienced professionals.",
  keywords: [
    "data analyst interview prep",
    "SQL quiz",
    "Excel quiz",
    "Power BI quiz",
    "AI quiz platform",
    "data analytics practice",
  ],
  openGraph: {
    title: "QuizPro – AI-Powered Data Analyst Interview Prep",
    description:
      "Personalized quizzes for SQL, Excel & Power BI. AI-generated, instant grading, deep analytics.",
    type: "website",
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
