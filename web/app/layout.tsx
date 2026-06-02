import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "LinkedIn Job Crawler",
  description: "Tìm việc làm Marketing tại Hà Nội",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f3f2ef" }}>
        {children}
      </body>
    </html>
  );
}
