'use client';

import React from 'react';
import Link from 'next/link';
import {
  Button,
  Title3,
  Body1,
} from '@fluentui/react-components';
import {
  Home24Regular,
  PersonRegular,
} from '@fluentui/react-icons';
import { useAuthStore } from '@/stores';

export default function TopNavigation() {
  const { authMode } = useAuthStore();

  return (
    <div 
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid var(--colorNeutralStroke2)',
        backgroundColor: 'var(--colorNeutralBackground1)',
      }}
    >
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Home24Regular />
          <Title3>环境计算器</Title3>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Body1 style={{ color: 'var(--colorNeutralForeground2)' }}>
            访客模式
          </Body1>
        </div>
      </div>
    </div>
  );
}