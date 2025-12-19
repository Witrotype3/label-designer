import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Label Designer',
    description: 'Professional label design system with print-accurate output',
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
