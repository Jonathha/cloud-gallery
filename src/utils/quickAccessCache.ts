/**
 * Barrel principal do cache persistente de acesso rápido
 * Exporta todas as interfaces e funções com retrocompatibilidade total
 */

export type {
  QuickAccessThumbnailRecord,
  QuickAccessDB
} from './quickAccess/types';

export {
  getQuickAccessDB
} from './quickAccess/db';

export {
  saveThumbnailToQuickAccessCache
} from './quickAccess/saveThumbnail';

export {
  hydrateQuickAccessThumbnails
} from './quickAccess/hydrateThumbnails';

export {
  populateMissingQuickAccessThumbnails
} from './quickAccess/populateThumbnails';

export {
  getQuickAccessThumbnail,
  removeThumbnailFromQuickAccessCache
} from './quickAccess/itemOperations';

export {
  clearQuickAccessCache
} from './quickAccess/clearCache';
