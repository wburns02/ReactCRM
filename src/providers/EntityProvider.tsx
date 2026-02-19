/**
 * Entity Provider
 *
 * Provides multi-entity (multi-LLC) context for the application.
 * Manages the currently selected entity and persists it to localStorage.
 * The X-Entity-ID header is set in client.ts based on localStorage.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEntities } from "@/api/hooks/useEntities";
import type { CompanyEntity } from "@/api/types/entity";

const STORAGE_KEY = "selected_entity_id";

export interface EntityContextValue {
  /** Currently selected entity (null while loading) */
  entity: CompanyEntity | null;
  /** All available entities */
  entities: CompanyEntity[];
  /** Whether entities are loading */
  isLoading: boolean;
  /** Switch to a different entity */
  setEntity: (entity: CompanyEntity) => void;
  /** Whether there are multiple entities (show switcher) */
  hasMultipleEntities: boolean;
}

const EntityContext = createContext<EntityContextValue | undefined>(undefined);

export function useEntity(): EntityContextValue {
  const ctx = useContext(EntityContext);
  if (!ctx) {
    throw new Error("useEntity must be used within <EntityProvider>");
  }
  return ctx;
}

/** Optional hook that doesn't throw if provider is missing */
export function useOptionalEntity(): EntityContextValue | undefined {
  return useContext(EntityContext);
}

export function EntityProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: entities = [], isLoading } = useEntities();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );

  // Resolve the selected entity from the list
  const entity = useMemo(() => {
    if (entities.length === 0) return null;
    // Try to find the stored selection
    if (selectedId) {
      const found = entities.find((e) => e.id === selectedId);
      if (found) return found;
    }
    // Fall back to default entity
    return entities.find((e) => e.is_default) ?? entities[0];
  }, [entities, selectedId]);

  // Keep localStorage in sync
  useEffect(() => {
    if (entity) {
      localStorage.setItem(STORAGE_KEY, entity.id);
    }
  }, [entity]);

  const setEntity = useCallback(
    (newEntity: CompanyEntity) => {
      setSelectedId(newEntity.id);
      localStorage.setItem(STORAGE_KEY, newEntity.id);
      // Invalidate all queries so they re-fetch with the new X-Entity-ID header
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({
      entity,
      entities,
      isLoading,
      setEntity,
      hasMultipleEntities: entities.length > 1,
    }),
    [entity, entities, isLoading, setEntity],
  );

  return (
    <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
  );
}
