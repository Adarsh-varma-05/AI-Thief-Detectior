import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AI Thief Detection Alarm",
  description: "A real-time AI object detection application designed to alert you of potential intruders using your webcam. Built with Next.js and TensorFlow.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
