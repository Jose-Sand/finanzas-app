import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (SIL OFL): Bricolage Grotesque for display, IBM Plex Sans for text.
const bricolage = localFont({
  variable: "--font-bricolage",
  src: "../fonts/bricolage-grotesque.woff2",
  weight: "200 800",
  display: "swap",
});

const plex = localFont({
  variable: "--font-plex",
  src: [
    { path: "../fonts/ibm-plex-sans-400.woff2", weight: "400" },
    { path: "../fonts/ibm-plex-sans-500.woff2", weight: "500" },
    { path: "../fonts/ibm-plex-sans-600.woff2", weight: "600" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Caudal — tus finanzas en pesos y dólares", template: "%s · Caudal" },
  description:
    "Registra ingresos y gastos en varias monedas, controla presupuestos y metas, y mira tu patrimonio real con la tasa del día.",
  applicationName: "Caudal",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1528" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${bricolage.variable} ${plex.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("caudal-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
