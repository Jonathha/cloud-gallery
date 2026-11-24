/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PrivateModeProvider } from './contexts/PrivateModeContext';
import { AuthStatus } from './contexts/AuthContextTypes';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import PrivacyScreen from './components/PrivacyScreen';
import { useWebAutoUpdate } from './hooks/useWebAutoUpdate';
import LoadingMark from './components/LoadingMark';
import { subscribeSecurityState, SecurityState, resetSecurityState } from './utils/securityInterceptor';
import GlobalTooltip from './components/GlobalTooltip';

// Lazy loading of private and heavy modules - unauthenticated users do NOT download these bundles
const Gallery = lazy(() => import('./components/Gallery'));
const VaultSetup = lazy(() => import('./components/VaultSetup'));
const VaultUnlock = lazy(() => import('./components/VaultUnlock'));
const PublicShareView = lazy(() => import('./components/PublicShareView'));
const AppUpdateCheckOverlay = lazy(() => import('./components/AppUpdateCheckOverlay'));
const InstallAppBanner = lazy(() => import('./components/InstallAppBanner'));
const CleanNotFoundView = lazy(() => import('./components/CleanNotFoundView'));
const BlockedPage = lazy(() => import('./components/BlockedPage'));

const ComponentLoader = LoadingMark;

function AppContent() {
  useWebAutoUpdate();
  const { authStatus } = useAuth();
  const [securityStates, setSecurityStates] = useState<Record<string, SecurityState>>({});

  useEffect(() => {
    return subscribeSecurityState((states) => {
      setSecurityStates(states);
    });
  }, []);

  // If we are in public sharing mode, render the public view directly!
  const urlParams = new URLSearchParams(window.location.search);
  const isShare = urlParams.has('share');

  // Handle clean 404 for suspicious/invalid pathname
  const pathname = window.location.pathname;

  let activeModules: string[] = [];
  if (isShare) {
    activeModules = ['share', 'share_view'];
  } else if (authStatus === AuthStatus.Unauthenticated) {
    activeModules = ['auth'];
  } else {
    activeModules = ['storage', 'upload', 'chat', 'share_create', 'share_manage', 'share'];
  }

  const activeSecurityState = activeModules
    .map(m => securityStates[m])
    .find(s => s && (s.isBlocked || s.isCaptchaRequired));

  if (activeSecurityState) {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <BlockedPage 
          module={activeSecurityState.module}
          isBlocked={activeSecurityState.isBlocked} 
          reason={activeSecurityState.reason} 
          onVerified={() => {
            resetSecurityState(activeSecurityState.module);
          }}
        />
      </Suspense>
    );
  }

  if (isShare) {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <PublicShareView />
      </Suspense>
    );
  }

  if (pathname !== '/' && pathname !== '/index.html') {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <CleanNotFoundView />
      </Suspense>
    );
  }

  switch (authStatus) {
    case AuthStatus.Loading:
      return <ComponentLoader />;

    case AuthStatus.Unauthenticated:
      // Static import: ONLY Login component & core auth assets loaded for unauthenticated users
      return <Login />;

    case AuthStatus.NeedsSetup:
      return (
        <Suspense fallback={<ComponentLoader />}>
          <VaultSetup />
        </Suspense>
      );

    case AuthStatus.Locked:
      return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a]">
          <Suspense fallback={<ComponentLoader />}>
            <VaultUnlock />
          </Suspense>
        </div>
      );

    case AuthStatus.Unlocked:
      return (
        <Suspense fallback={<ComponentLoader />}>
          <Gallery />
        </Suspense>
      );

    default:
      // Seguro por padrão contra bypass/estados indefinidos
      return null;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <PrivateModeProvider>
        <AuthProvider>
          <PrivacyScreen />
          <AppContent />
          <Suspense fallback={null}>
            <AppUpdateCheckOverlay />
            <InstallAppBanner />
          </Suspense>
          <GlobalTooltip />
        </AuthProvider>
      </PrivateModeProvider>
    </ErrorBoundary>
  );
}
