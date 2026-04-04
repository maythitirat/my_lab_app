'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { LiffProfile } from '@/types';

interface LiffContextValue {
  profile: LiffProfile | null;
  isReady: boolean;
  error: string | null;
  closeLiff: () => Promise<void>;
}

const LiffContext = createContext<LiffContextValue>({
  profile: null,
  isReady: false,
  error: null,
  closeLiff: async () => {},
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      // Development fallback — allows running locally without a real LIFF ID
      if (!liffId) {
        if (process.env.NODE_ENV === 'development') {
          setProfile({
            userId: 'dev-user-id',
            displayName: 'Dev User',
            pictureUrl: 'https://picsum.photos/seed/avatar/100/100',
          });
          setIsReady(true);
          return;
        }
        setError('LIFF ID is not configured. Set NEXT_PUBLIC_LIFF_ID in your .env file.');
        setIsReady(true);
        return;
      }

      try {
        // Dynamic import prevents SSR issues
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const userProfile = await liff.getProfile();
        setProfile({
          userId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'LIFF initialization failed');
      } finally {
        setIsReady(true);
      }
    };

    initLiff();
  }, []);

  const closeLiff = async () => {
    try {
      const liff = (await import('@line/liff')).default;
      if (liff.isInClient()) {
        liff.closeWindow();
      }
    } catch {
      // Not inside LIFF client — silently ignore
    }
  };

  return (
    <LiffContext.Provider value={{ profile, isReady, error, closeLiff }}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  return useContext(LiffContext);
}
