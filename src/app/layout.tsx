import type { Metadata } from "next";
import {
  Geist_Mono,
  Inter,
  Tiro_Devanagari_Hindi,
  Noto_Sans_Devanagari,
  Noto_Sans_Telugu,
  Noto_Sans_Tamil,
  Noto_Sans_Gujarati,
  Noto_Sans_Oriya,
  Noto_Sans_Kannada,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { I18nRoot } from "@/features/i18n/components/i18n-root";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// One font per script, each exposed as its own CSS variable. Which one
// actually renders body text is decided in globals.css, keyed off
// `html[lang]` — see `I18nRoot`, which sets that attribute on locale change.
// Hindi specifically uses Tiro Devanagari Hindi (a serif) per an explicit
// design call; every other regional script gets a well-supported sans
// (Noto Sans's per-script family) since none was requested for those.
const tiroDevanagariHindi = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari", "latin"],
  variable: "--font-hi",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  variable: "--font-mr",
});

const notoSansTelugu = Noto_Sans_Telugu({
  subsets: ["telugu", "latin"],
  variable: "--font-te",
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ["tamil", "latin"],
  variable: "--font-ta",
});

const notoSansGujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati", "latin"],
  variable: "--font-gu",
});

const notoSansOriya = Noto_Sans_Oriya({
  subsets: ["oriya", "latin"],
  variable: "--font-or",
});

const notoSansKannada = Noto_Sans_Kannada({
  subsets: ["kannada", "latin"],
  variable: "--font-kn",
});

export const metadata: Metadata = {
  title: "Amama",
  description: "Amama — cross-border commerce, made simple.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={cn(
        "h-full",
        "antialiased",
        geistMono.variable,
        "font-sans",
        inter.variable,
        tiroDevanagariHindi.variable,
        notoSansDevanagari.variable,
        notoSansTelugu.variable,
        notoSansTamil.variable,
        notoSansGujarati.variable,
        notoSansOriya.variable,
        notoSansKannada.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <I18nRoot>
          {children}
          <Toaster />
        </I18nRoot>
      </body>
    </html>
  );
}
