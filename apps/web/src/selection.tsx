import { createContext, useContext } from 'react';
import type { Claim } from '@ps154/shared';

export const SelectionContext = createContext<{
  active: Claim | null; select: (c: Claim | null) => void;
}>({ active: null, select: () => {} });

export const useSelection = () => useContext(SelectionContext);
