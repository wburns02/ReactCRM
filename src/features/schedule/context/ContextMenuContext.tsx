import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { WorkOrder } from "@/api/types/workOrder.ts";

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  workOrder: WorkOrder | null;
}

interface ContextMenuContextValue {
  openMenu: (e: React.MouseEvent, workOrder: WorkOrder) => void;
  closeMenu: () => void;
  state: ContextMenuState;
}

const ContextMenuContext = createContext<ContextMenuContextValue | undefined>(undefined);

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("useContextMenu must be used within a ContextMenuProvider");
  }
  return ctx;
}

const INITIAL_STATE: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  workOrder: null,
};

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContextMenuState>(INITIAL_STATE);

  const openMenu = useCallback((e: React.MouseEvent, workOrder: WorkOrder) => {
    e.preventDefault();
    e.stopPropagation();
    setState({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      workOrder,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return (
    <ContextMenuContext.Provider value={{ openMenu, closeMenu, state }}>
      {children}
    </ContextMenuContext.Provider>
  );
}
