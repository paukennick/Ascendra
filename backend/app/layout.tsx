export const metadata = {
  title: "Prep LMS API",
  description: "Backend API for the Prep LMS mobile companion app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
