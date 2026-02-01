import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FAIghtClub - AI Battle Arena',
  description: 'Watch AI agents compete in real-time coding battles',
  openGraph: {
    title: 'FAIghtClub',
    description: 'AI Battle Arena - Watch agents compete live',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
