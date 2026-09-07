import type { Metadata } from 'next';
import { Instrument_Sans, Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/features/auth/AuthContext';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
  weight: ['400', '500', '600', '700'],
});

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
    <html lang="en" className={`${instrumentSans.variable} ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                // Intercept and suppress third-party browser extension errors (e.g. Urban VPN, Bitdefender, etc.)
                function isExtensionError(eventOrReason) {
                  try {
                    var src = '';
                    if (!eventOrReason) return false;
                    if (typeof eventOrReason === 'string') src += eventOrReason;
                    if (eventOrReason.filename) src += ' ' + eventOrReason.filename;
                    if (eventOrReason.message) src += ' ' + eventOrReason.message;
                    if (eventOrReason.error && eventOrReason.error.stack) src += ' ' + eventOrReason.error.stack;
                    if (eventOrReason.stack) src += ' ' + eventOrReason.stack;
                    if (eventOrReason.reason) {
                      if (eventOrReason.reason.message) src += ' ' + eventOrReason.reason.message;
                      if (eventOrReason.reason.stack) src += ' ' + eventOrReason.reason.stack;
                    }
                    return (
                      src.indexOf('chrome-extension:') !== -1 ||
                      src.indexOf('moz-extension:') !== -1 ||
                      src.indexOf('safari-extension:') !== -1 ||
                      src.indexOf('eppiocemhmnlbhjplcgkofciiegomcon') !== -1 ||
                      src.indexOf("reading 'M_ID'") !== -1 ||
                      src.indexOf('M_ID') !== -1
                    );
                  } catch (e) {
                    return false;
                  }
                }

                // Intercept during capturing phase before Next.js error overlay can grab it
                window.addEventListener('error', function (event) {
                  if (isExtensionError(event)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function (event) {
                  if (isExtensionError(event.reason || event)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    return true;
                  }
                }, true);

                var origOnError = window.onerror;
                window.onerror = function (msg, url, line, col, error) {
                  if (
                    (typeof msg === 'string' && (msg.indexOf('chrome-extension:') !== -1 || msg.indexOf('M_ID') !== -1)) ||
                    (url && (url.indexOf('chrome-extension:') !== -1 || url.indexOf('moz-extension:') !== -1)) ||
                    (error && error.stack && error.stack.indexOf('chrome-extension:') !== -1)
                  ) {
                    return true;
                  }
                  if (origOnError) return origOnError.apply(this, arguments);
                  return false;
                };

                var origConsoleError = console.error;
                console.error = function () {
                  var args = Array.prototype.slice.call(arguments);
                  var str = args.map(function (a) {
                    if (!a) return '';
                    if (typeof a === 'string') return a;
                    if (a.stack) return a.stack;
                    if (a.message) return a.message;
                    return '';
                  }).join(' ');
                  if (
                    str.indexOf('chrome-extension:') !== -1 ||
                    str.indexOf('moz-extension:') !== -1 ||
                    str.indexOf('safari-extension:') !== -1 ||
                    str.indexOf('eppiocemhmnlbhjplcgkofciiegomcon') !== -1 ||
                    str.indexOf("reading 'M_ID'") !== -1
                  ) {
                    return;
                  }
                  return origConsoleError.apply(console, arguments);
                };
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans bg-fx-bg text-fx-text-primary antialiased selection:bg-[#EEF4FF] selection:text-[#2563EB]" suppressHydrationWarning>
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
