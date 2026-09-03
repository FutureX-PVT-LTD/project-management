import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/features/auth/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'FutureX | Project Management Workspace',
  description: 'Enterprise project planning, task tracking, and game delivery workspace for FutureX.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-fx-bg text-fx-text-primary antialiased selection:bg-fx-green-soft selection:text-fx-green-dark" suppressHydrationWarning>
        <Script id="remove-extension-hydration-attrs" strategy="beforeInteractive">
          {`
            (function () {
              function clean() {
                document.querySelectorAll('[bis_skin_checked]').forEach(function (node) {
                  node.removeAttribute('bis_skin_checked');
                });
              }
              clean();
              new MutationObserver(clean).observe(document.documentElement, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['bis_skin_checked']
              });
            })();
          `}
        </Script>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
