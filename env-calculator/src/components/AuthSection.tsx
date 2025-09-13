'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  Title1,
  Title2,
  Body1,
  Divider,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  PersonRegular,
  SignOutRegular,
  SettingsRegular,
} from '@fluentui/react-icons';
import { useAuthStore } from '@/stores';
import AuthModal from './AuthModal';

export default function AuthSection() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { authMode, currentUser, logout, setAuthMode } = useAuthStore();
  
  const handleGuestMode = () => {
    setAuthMode('guest');
    setShowAuthModal(false);
  };
  
  const handleRegisteredMode = () => {
    setShowAuthModal(true);
  };
  
  const handleLogout = () => {
    logout();
    setAuthMode('guest');
  };

  if (authMode === 'registered' && currentUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Body1>欢迎，{currentUser.username}</Body1>
        <Menu>
          <MenuTrigger>
            <Button
              appearance="subtle"
              icon={<PersonRegular />}
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<SettingsRegular />}>
                设置
              </MenuItem>
              <MenuItem 
                icon={<SignOutRegular />}
                onClick={handleLogout}
              >
                退出登录
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    );
  }

  return (
    <>
      <Card style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <Title1 style={{ textAlign: 'center', marginBottom: '16px' }}>
          欢迎使用环境计算器
        </Title1>
        
        <Body1 style={{ textAlign: 'center', marginBottom: '24px' }}>
          选择您的使用模式
        </Body1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Title2 style={{ fontSize: '16px', marginBottom: '8px' }}>
              访客模式
            </Title2>
            <Body1 style={{ marginBottom: '12px', color: 'var(--colorNeutralForeground2)' }}>
              数据保存在浏览器本地存储，清除浏览器数据后将丢失
            </Body1>
            <Button 
              appearance="outline"
              size="large"
              style={{ width: '100%' }}
              onClick={handleGuestMode}
            >
              以访客身份继续
            </Button>
          </div>
          
          <Divider>或</Divider>
          
          <div>
            <Title2 style={{ fontSize: '16px', marginBottom: '8px' }}>
              注册/登录
            </Title2>
            <Body1 style={{ marginBottom: '12px', color: 'var(--colorNeutralForeground2)' }}>
              数据保存在云端，可在不同设备间同步访问
            </Body1>
            <Button 
              appearance="primary"
              size="large"
              style={{ width: '100%' }}
              onClick={handleRegisteredMode}
            >
              登录或注册
            </Button>
          </div>
        </div>
      </Card>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}