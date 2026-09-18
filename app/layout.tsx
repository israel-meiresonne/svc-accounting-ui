import type { Metadata } from "next";
import { IBM_Plex_Mono, Silkscreen } from "next/font/google";

import { QueryProvider } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const fontDisplay = Silkscreen({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const fontBody = IBM_Plex_Mono({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LEDGR_OS",
  description: "Accounting app",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang="en"
      className={`dark ${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
