import type { Viewport } from 'next';
import { Baloo_2 } from 'next/font/google';
import QuestlineApp from '@/components/questline/QuestlineApp';

const baloo = Baloo_2({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-baloo' });

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function Page() {
  return <QuestlineApp fontClass={baloo.variable} />;
}