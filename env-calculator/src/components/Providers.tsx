'use client';

import React from 'react';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
      {children}
    </FluentProvider>
  );
}