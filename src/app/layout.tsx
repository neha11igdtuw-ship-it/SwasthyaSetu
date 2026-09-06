import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwasthyaSetu | Rural Healthcare & Continuity of Care Platform",
  description:
    "Offline-first, multilingual healthcare access and referral continuity platform for patients, health workers, doctors, and healthcare facilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#f6fafa] text-[#0d252c] min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
