import { useState } from 'react';

export function useSelectionState() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [duplicatesToDelete, setDuplicatesToDelete] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  return {
    isSelectionMode, setIsSelectionMode,
    selectedForDeletion, setSelectedForDeletion,
    isDeletingMultiple, setIsDeletingMultiple,
    isCleaningDuplicates, setIsCleaningDuplicates,
    duplicatesToDelete, setDuplicatesToDelete,
    lastSelectedIndex, setLastSelectedIndex,
  };
}
