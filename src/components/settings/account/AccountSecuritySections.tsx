import React from 'react';
import { SecurityPasswordFormSection } from './SecurityPasswordFormSection';
import { VaultPinFormSection } from './VaultPinFormSection';

interface AccountSecuritySectionsProps {
  isChangingExtraPassword: boolean;
  setIsChangingExtraPassword: (val: boolean) => void;
  extraPassword: any;
  securityProps: any;
  isChangingVaultPin: boolean;
  setIsChangingVaultPin: (val: boolean) => void;
  vaultProps: any;
}

export function AccountSecuritySections({
  isChangingExtraPassword,
  setIsChangingExtraPassword,
  extraPassword,
  securityProps,
  isChangingVaultPin,
  setIsChangingVaultPin,
  vaultProps
}: AccountSecuritySectionsProps) {
  return (
    <>
      <SecurityPasswordFormSection
        isChangingExtraPassword={isChangingExtraPassword}
        setIsChangingExtraPassword={setIsChangingExtraPassword}
        extraPassword={extraPassword}
        securityProps={securityProps}
      />

      <VaultPinFormSection
        isChangingVaultPin={isChangingVaultPin}
        setIsChangingVaultPin={setIsChangingVaultPin}
        vaultProps={vaultProps}
      />
    </>
  );
}

export default AccountSecuritySections;
