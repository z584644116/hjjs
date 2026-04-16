'use client';

import React, { Suspense } from 'react';
import NavigationGrid from '@/components/NavigationGrid';

export default function Home() {
  // 统一访客模式：直接显示主功能
  return (
    <Suspense fallback={null}>
      <NavigationGrid />
    </Suspense>
  );
}
