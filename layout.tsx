import "./globals.css";
export const metadata = {
  title: "Trade Mentor",
  description: "AI Trading Journal"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
