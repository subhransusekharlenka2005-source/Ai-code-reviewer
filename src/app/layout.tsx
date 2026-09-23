import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Code Reviewer",
  description:
    "Review Python, Java, C, C++, JavaScript and more with an AI-powered code reviewer. Find bugs, security issues and performance problems and automatically improve your code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
