import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OneTrack",
  description: "Focus on one goal. Build your streak. Change your life.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.className} min-h-screen`}>{children}</body>
    </html>
  );
}
