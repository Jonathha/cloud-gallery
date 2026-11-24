import React from 'react';

export interface TrashIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}

/**
 * TrashIcon - Ícone de Lixeira com geometria vetorial de alta precisão.
 * Design refinado: alça com proporção harmônica, tampa com relevo óptico,
 * corpo cônico balanceado com raio de transição suave e nervuras simétricas.
 */
export const TrashIcon: React.FC<TrashIconProps> = ({
  size = 24,
  strokeWidth = 2,
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Alça superior da tampa com cantos suaves */}
      <path d="M8.5 5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V6" />
      
      {/* Barra estrutural da tampa */}
      <path d="M3.5 6h17" />
      
      {/* Recipiente com conicidade elegante e base arredondada de alta fidelidade */}
      <path d="M5.5 6.5L6.68 18.2A2.5 2.5 0 0 0 9.17 20.5h5.66a2.5 2.5 0 0 0 2.49-2.3L18.5 6.5" />
      
      {/* 3 ranhuras verticais proporcionais para acabamento visual refinado */}
      <path d="M9.5 11v5.5" />
      <path d="M12 11v5.5" />
      <path d="M14.5 11v5.5" />
    </svg>
  );
};

export default TrashIcon;

