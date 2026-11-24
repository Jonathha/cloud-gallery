import {
  Shield, KeyRound, Zap, Lock, Radio, HardDrive, Sparkles,
  Wrench, User, EyeOff, Bot, Palette, VenetianMask, Info
} from 'lucide-react';
import TrashIcon from '../../icons/TrashIcon';

export interface DecryptedImage {
  id: string;
  url: string;
  failed?: boolean;
  createdAt: number;
}

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  images?: DecryptedImage[];
  onOpenTrash?: () => void;
  isInline?: boolean;
  initialTab?: 'security' | 'vaultCrypto' | 'quickAccess' | 'storage' | 'repair' | 'account' | 'appearance' | 'about' | 'menu' | 'news' | 'decoyVault' | 'ai';
  onSubTabChange?: (tab: string) => void;
}

export const ICON_MAP = {
  Shield, KeyRound, Zap, Lock, Radio, HardDrive,
  Trash2: TrashIcon, Sparkles, Wrench, User, EyeOff,
  Bot, Palette, VenetianMask, Info
};

export const CATEGORY_GROUPS = [
  {
    title: 'Segurança & Privacidade',
    ids: ['security', 'vaultCrypto', 'quickAccess', 'decoyVault']
  },
  {
    title: 'Armazenamento & Manutenção',
    ids: ['storage', 'repair']
  },
  {
    title: 'Conta & Aplicativo',
    ids: ['account', 'appearance', 'about']
  }
];
