import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/components/shell/locale-provider";
import { BASE_PATH } from "@/lib/base-path";
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
  // El basePath no se aplica solo a los metadatos: se antepone a mano.
  icons: {
    icon: `${BASE_PATH}/icon-192.png`,
    apple: `${BASE_PATH}/icon-192.png`,
  },
  manifest: `${BASE_PATH}/manifest.json`,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // El idioma lo resuelve LocaleProvider en el navegador (cookie
  // avimetrica-locale); el lang inicial es el del HTML prerenderizado y el
  // proveedor lo actualiza al montar.
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <LocaleProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <ServiceWorkerRegistrar />
            <Toaster />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
