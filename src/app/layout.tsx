import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/languageContext";
import { AppStateProvider } from "@/lib/store/AppStateProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#f6fafa] dark:bg-[#0b1a1f] text-[#0d252c] dark:text-[#eaf4f2] min-h-screen flex flex-col">
        <ThemeProvider>
          <LanguageProvider>
            <AppStateProvider>{children}</AppStateProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
