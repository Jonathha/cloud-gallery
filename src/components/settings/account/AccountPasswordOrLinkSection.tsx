import React from 'react';
import { AccountPasswordFormSection } from './AccountPasswordFormSection';
import { LinkEmailPasswordFormSection } from './LinkEmailPasswordFormSection';

interface AccountPasswordOrLinkSectionProps {
  isEmailProvider: boolean;
  canUnlink: boolean;
  isChangingPassword: boolean;
  setIsChangingPassword: (val: boolean) => void;
  passwordProps: any;
  onUnlink: () => void;
  isUnlinking: boolean;
  onLinkSuccess: () => void | Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function AccountPasswordOrLinkSection({
  isEmailProvider,
  canUnlink,
  isChangingPassword,
  setIsChangingPassword,
  passwordProps,
  onUnlink,
  isUnlinking,
  onLinkSuccess,
  showToast,
}: AccountPasswordOrLinkSectionProps) {
  if (isEmailProvider) {
    return (
      <AccountPasswordFormSection
        canUnlink={canUnlink}
        isChangingPassword={isChangingPassword}
        setIsChangingPassword={setIsChangingPassword}
        passwordProps={passwordProps}
        onUnlink={onUnlink}
        isUnlinking={isUnlinking}
      />
    );
  }

  return (
    <LinkEmailPasswordFormSection
      onLinkSuccess={onLinkSuccess}
      showToast={showToast}
    />
  );
}

export default AccountPasswordOrLinkSection;
