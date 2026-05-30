
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
    template: "%s | Дорожный комплекс ГАРАЖ",
    default: "Дорожный комплекс ГАРАЖ — Автозапчасти с доставкой по России",
  },
  description: "Профессиональный магазин запчастей для грузовой техники и легковых авто. Работаем с 2007 года. На 932 км трассы М4 «Дон». Доставка СДЭК.",
  keywords: ["автозапчасти", "запчасти грузовые", "Дорожный комплекс Гараж", "Каменск-Шахтинский", "поиск по артикулу"],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Дорожный комплекс ГАРАЖ",
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