
// Вот этот импорт ОБЯЗАТЕЛЬНО должен быть здесь, чтобы проект понимал, что такое <Providers>
import { Providers } from "@/app/providers";
import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Metadata, Viewport } from "next";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-head",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | ДЕТАЛЬПРО - Автозапчасти",
    default: "ДЕТАЛЬПРО - Автозапчасти с доставкой по России",
  },
  description: "Интернет-магазин автозапчастей. Поиск по артикулу, более 2 000 000 позиций, доставка СДЭК.",
  keywords: ["автозапчасти", "запчасти", "поиск по артикулу", "СДЭК доставка"],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "ДЕТАЛЬПРО",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${barlowCondensed.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        {/* Все провайдеры (сессия, уведомления, корзина) теперь заведутся дружно */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}