import './globals.css';
import { Providers } from './providers';
export const metadata = { title: 'PaChat Instagram Edition', viewport: 'width=device-width, initial-scale=1, maximum-scale=1' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}