import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#14171f",
};

export const metadata: Metadata = {
  title: "AI Code Reviewer - Inspect, Fix & Improve Code with AI",
  description:
    "Review Python, Java, C, C++, JavaScript, TypeScript, Go, Rust, and SQL code with AI. Detect bugs, security vulnerabilities, and performance flaws automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#efede4] text-[#1c1c18] font-sans antialiased overflow-x-hidden selection:bg-signal/20">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
