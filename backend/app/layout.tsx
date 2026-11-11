import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Ascendra API",
  description: "Backend API for the Ascendra mobile companion app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
