// app/questline/page.tsx  (server component: only loads the font and the client shell)
import type { Viewport } from 'next';
import { Baloo_2 } from 'next/font/google';
import QuestlineApp from '@/components/questline/QuestlineApp';

const baloo = Baloo_2({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-baloo' });

// viewport-fit=cover lets the map run under the notch; the CSS handles the safe-area insets.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function Page() {
  return <QuestlineApp fontClass={baloo.variable} />;
}