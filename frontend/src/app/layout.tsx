import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, themeNoFlashScript } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "Marketing Hub — Mangone Law Firm",
  description: "Plataforma interna del Departamento de Marketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body className="h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
