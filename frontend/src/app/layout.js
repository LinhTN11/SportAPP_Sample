import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'SportApp - Đặt sân thể thao trực tuyến',
  description: 'Nền tảng đặt sân thể thao, ghép trận thông minh. Tìm sân, đặt sân, ghép đối thủ dễ dàng.',
  keywords: 'đặt sân, thể thao, bóng đá, cầu lông, ghép trận, sport booking',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
