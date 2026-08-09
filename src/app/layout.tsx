import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistrar } from "@/components/uniformidad/sw-registrar";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avimétrica Pro",
  description: "Analítica de peso, uniformidad y desempeño avícola. Por Gustavo Alonso Ardón, MSc. — Universidad Nacional de Agricultura, Honduras.",
  keywords: ["avimétrica", "uniformidad", "aves", "avicultura", "Ardón", "poultry", "Honduras"],
  authors: [{ name: "Gustavo Alonso Ardón, MSc." }],
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Avimétrica Pro",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale: el zoom con dos dedos debe quedar disponible (WCAG 1.4.4).
  // La app está llena de tablas de cifras y gráficos SVG que se leen ampliando.
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // El idioma sale de la cookie que lee src/i18n/request.ts; `lang` del <html>
  // debe seguirlo para que lectores de pantalla y correctores acierten.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <ServiceWorkerRegistrar />
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
