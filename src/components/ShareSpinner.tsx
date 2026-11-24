import React from 'react';
import Spinner from './Spinner';

interface ShareSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Use on light backgrounds (e.g. the white primary button). */
  dark?: boolean;
  label?: string;
}

const SIZES = { sm: 14, md: 16, lg: 28 };

/** Small circular loading indicator used across the share flow. */
export default function ShareSpinner({ size = 'md', dark = false, label }: ShareSpinnerProps) {
  return <Spinner size={SIZES[size]} tone={dark ? 'ink' : 'brand'} label={label} />;
}
