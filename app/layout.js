import { AcademicConfigsProvider } from './admin-dashboard/context/AcademicConfigsContext';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ClassLogs | School Management & Operational Control Center",
  description: "Official ClassLogs portal for Cameroonian schools. Digitized teacher logbooks, instant MINSEC report cards, fee tracking, and parent portals.",
  keywords: ["ClassLogs", "NsuRecords", "MINSEC", "Cameroon School Portal", "Report Cards"],
  authors: [{ name: "NsuRecords" }],
  metadataBase: new URL("https://classlogs.cc"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ClassLogs | Official School Onboarding Portal",
    description: "School management made easy. Real-time sequence scores, MINSEC logbook tracking, and instant report cards.",
    url: "https://classlogs.cc",
    siteName: "ClassLogs by NsuRecords",
    images: [
      {
        url: "/og-banner.png",
        width: 1200,
        height: 630,
        alt: "ClassLogs Operational Control Center",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClassLogs | Official School Onboarding Portal",
    description: "ClassLogs operational control center for Cameroonian secondary schools.",
    images: ["/og-banner.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AcademicConfigsProvider>
          {children}
        </AcademicConfigsProvider>
      </body>
    </html>
  );
}