import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: "Ascendra API",
  description: "Backend API for the Ascendra mobile companion app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
