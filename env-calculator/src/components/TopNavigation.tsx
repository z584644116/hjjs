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
  const { authMode, currentUser, logout, setAuthMode } = useAuthStore();

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
        {authMode === 'registered' && currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PersonRegular />
              <Body1>{currentUser.username}</Body1>
            </div>
            <Button
              appearance="subtle"
              onClick={() => { logout(); setAuthMode('guest'); }}
            >
              退出
            </Button>
          </div>
        ) : authMode === 'guest' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Body1 style={{ color: 'var(--colorNeutralForeground2)' }}>
              访客模式
            </Body1>
            <Button
              appearance="subtle"
              size="small"
              onClick={() => setAuthMode('initial')}
            >
              切换模式
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}