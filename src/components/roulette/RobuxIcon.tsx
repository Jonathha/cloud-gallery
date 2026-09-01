import React from 'react';

interface RobuxIconProps {
  size?: number;
  className?: string;
}

export function RobuxIcon({ size = 20, className = "text-amber-400" }: RobuxIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Robux"
      role="img"
    >
      {/* 
        Official Roblox Robux Currency Emblem:
        Symmetric hexagonal coin with centered square cutout.
      */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.08 1.54a1.85 1.85 0 0 1 1.84 0l8.16 4.71a1.85 1.85 0 0 1 .92 1.6v9.42a1.85 1.85 0 0 1-.92 1.6l-8.16 4.71a1.85 1.85 0 0 1-1.84 0l-8.16-4.71a1.85 1.85 0 0 1-.92-1.6V7.85a1.85 1.85 0 0 1 .92-1.6l8.16-4.71zM9 9h6v6H9V9z"
      />
    </svg>
  );
}

