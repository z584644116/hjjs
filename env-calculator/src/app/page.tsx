'use client';

import React from 'react';
import { useAuthStore } from '@/stores';
import NavigationGrid from '@/components/NavigationGrid';
import AuthSection from '@/components/AuthSection';

export default function Home() {
  const { authMode, isAuthenticated } = useAuthStore();
  
  if (authMode === 'guest' || (authMode === 'registered' && isAuthenticated)) {
    return <NavigationGrid />;
  }
  
  // 初始状态或未选择模式时显示选择界面
  return <AuthSection />;
}
