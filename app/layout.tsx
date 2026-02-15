import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gesture + Gaze Controlled 3D Interaction',
  description: 'Web-based 3D scene with hand tracking and gaze control',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
