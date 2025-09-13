'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  Title1,
  Title2,
  Body1,
  Button,
} from '@fluentui/react-components';
import {
  Calculator24Regular,
  Settings24Regular,
  Info24Regular,
} from '@fluentui/react-icons';

const navigationItems = [
  {
    id: 'sampling-calculator',
    title: '采样嘴计算',
    description: '根据烟气参数和仪器规格计算推荐的采样嘴直径',
    icon: <Calculator24Regular />,
    href: '/calculator/sampling',
    available: true,
  },
  {
    id: 'do-saturation',
    title: '水饱和空气溶解氧计算',
    description: '按温度(0~40℃)与大气压换算饱和DO与核查示值范围',
    icon: <Calculator24Regular />,
    href: '/calculator/do',
    available: true,
  },
  {
    id: 'ph-calculator',
    title: 'pH 计算',
    description: '输入温度，显示5种标准缓冲溶液的当前温度标准值',
    icon: <Calculator24Regular />,
    href: '/calculator/ph',
    available: true,
  },
  {
    id: 'well-calculator',
    title: '地下水井水体积',
    description: '输入井参数与水位，计算埋深、井水深度、井水体积',
    icon: <Calculator24Regular />,
    href: '/calculator/well',
    available: true,
  },
  {
    id: 'gas-converter',
    title: '气体单位换算',
    description: 'SO2/NO/NO2/CO/NMHC 的 ppm ↔ mg/m³ 换算',
    icon: <Calculator24Regular />,
    href: '/calculator/gas',
    available: true,
  },
];

export default function NavigationGrid() {
  return (
    <div className="page-container">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Title1 style={{ marginBottom: '8px' }}>环境计算器</Title1>
        <Body1 style={{ color: 'var(--colorNeutralForeground2)' }}>
          专业的环境监测计算工具集
        </Body1>
      </div>
      
      <div 
        style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}
      >
        {navigationItems.map((item) => (
          <Card
            key={item.id}
            style={{
              padding: '24px',
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              cursor: item.available ? 'pointer' : 'not-allowed',
              opacity: item.available ? 1 : 0.6,
              transition: 'all 0.2s ease',
            }}
          >
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '12px'
              }}
            >
              <div 
                style={{ 
                  color: item.available ? 'var(--colorBrandForeground1)' : 'var(--colorNeutralForeground3)',
                }}
              >
                {item.icon}
              </div>
              <Title2 style={{ fontSize: '18px', margin: 0 }}>
                {item.title}
              </Title2>
            </div>
            
            <Body1 
              style={{ 
                marginBottom: '16px',
                flex: 1,
                color: 'var(--colorNeutralForeground2)'
              }}
            >
              {item.description}
            </Body1>
            
            <div>
              {item.available ? (
                <Link href={item.href} passHref>
                  <Button 
                    appearance="primary"
                    style={{ width: '100%' }}
                  >
                    开始使用
                  </Button>
                </Link>
              ) : (
                <Button 
                  appearance="outline"
                  disabled
                  style={{ width: '100%' }}
                >
                  敬请期待
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}