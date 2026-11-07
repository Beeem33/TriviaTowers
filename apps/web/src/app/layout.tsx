import type { Metadata, Viewport } from "next";
import { ClientEffects } from "@/components/ui/ClientEffects";
import { PRODUCTION_URL, configuredSiteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(configuredSiteUrl() ?? PRODUCTION_URL),
  title: {
    default: "TriviaTowers.io — Daily trivia. Build your tower.",
    template: "%s · TriviaTowers.io",
  },
  description:
    "Answer today's 10 trivia questions to build a 3D tower on your floating island. Keep your streak, beat your friends, and share how high you built. Free in your browser.",
  applicationName: "TriviaTowers",
  openGraph: {
    title: "TriviaTowers.io",
    description: "Daily trivia where every correct answer adds a floor to your tower. Can you build higher?",
    url: "/",
    siteName: "TriviaTowers.io",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "TriviaTowers.io", description: "Daily trivia. Build your tower." },
};

export const viewport: Viewport = {
  themeColor: "#6fbcff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <ClientEffects />
        {children}
      </body>
    </html>
  );
}
