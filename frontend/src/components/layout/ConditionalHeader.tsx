'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export const ConditionalHeader: React.FC = () => {
  const pathname = usePathname();


  return <Header />;
};
