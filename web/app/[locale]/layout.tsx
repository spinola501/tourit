export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP, Noto_Sans_SC } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const notoJP = Noto_Sans_JP({ variable: "--font-noto-jp", subsets: ["latin"], weight: ["400", "600", "700"] });
const notoSC = Noto_Sans_SC({ variable: "--font-noto-sc", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "TourIt — Every place has a story",
  description: "AI-powered audio tours for curious travellers. Listen as you go.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  const messages = await getMessages();

  const fontVars = [
    geistSans.variable,
    geistMono.variable,
    notoJP.variable,
    notoSC.variable,
  ].join(" ");

  return (
    <html lang={locale} className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
