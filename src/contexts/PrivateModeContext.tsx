import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { detectIncognito } from 'detectincognitojs';

interface PrivateModeContextType {
  isPrivateMode: boolean;
  isChecking: boolean;
  browserName: string;
}

const PrivateModeContext = createContext<PrivateModeContextType>({
  isPrivateMode: false,
  isChecking: true,
  browserName: 'Unknown',
});

export const PrivateModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [browserName, setBrowserName] = useState<string>('Unknown');

  useEffect(() => {
    let mounted = true;

    const checkPrivateMode = async () => {
      try {
        const result = await detectIncognito();
        if (mounted) {
          setIsPrivateMode(result.isPrivate);
          setBrowserName(result.browserName);
        }
      } catch (err) {
        console.error('Error detecting private mode:', err);
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkPrivateMode();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PrivateModeContext.Provider value={{ isPrivateMode, isChecking, browserName }}>
      {children}
    </PrivateModeContext.Provider>
  );
};

export const usePrivateMode = () => useContext(PrivateModeContext);
