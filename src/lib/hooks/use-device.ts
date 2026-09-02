'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isStandalone: boolean; // PWA installed / home screen
  isIOS: boolean;
  isAndroid: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
  isSmallScreen: boolean; // < 640px
  hasNotch: boolean;
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        isStandalone: false,
        isIOS: false,
        isAndroid: false,
        orientation: 'landscape',
        screenWidth: 1280,
        screenHeight: 800,
        isSmallScreen: false,
        hasNotch: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    let deviceType: DeviceType = 'desktop';
    if (width < 640 || (isTouch && width < 768 && height > width)) {
      deviceType = 'mobile';
    } else if (width < 1024 || (isTouch && width >= 768 && width <= 1280)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }

    return {
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isTouch,
      isStandalone,
      isIOS,
      isAndroid,
      orientation: width > height ? 'landscape' : 'portrait',
      screenWidth: width,
      screenHeight: height,
      isSmallScreen: width < 640,
      hasNotch: isIOS && (height >= 812 || width >= 812),
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const ua = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /android/.test(ua);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

      let deviceType: DeviceType = 'desktop';
      if (width < 640 || (isTouch && width < 768 && height > width)) {
        deviceType = 'mobile';
      } else if (width < 1024 || (isTouch && width >= 768 && width <= 1280)) {
        deviceType = 'tablet';
      } else {
        deviceType = 'desktop';
      }

      setDeviceInfo({
        deviceType,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        isTouch,
        isStandalone,
        isIOS,
        isAndroid,
        orientation: width > height ? 'landscape' : 'portrait',
        screenWidth: width,
        screenHeight: height,
        isSmallScreen: width < 640,
        hasNotch: isIOS && (height >= 812 || width >= 812),
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}
