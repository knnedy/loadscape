"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { samplePath, type SampledPath } from "@/lib/edge-routing/sample-path";

export interface EdgeGeometry {
  path: SampledPath;
  colorVar: string;
}

export type EdgeGeometryMap = Map<string, EdgeGeometry>;

const EdgeGeometryContext = createContext<EdgeGeometryMap | null>(null);

// A plain map that edges write into and the particle layer reads on every
// animation frame. Nothing here causes a React re-render.
export function EdgeGeometryProvider({ children }: { children: ReactNode }) {
  const [geometry] = useState<EdgeGeometryMap>(() => new Map());

  return (
    <EdgeGeometryContext.Provider value={geometry}>
      {children}
    </EdgeGeometryContext.Provider>
  );
}

export function useEdgeGeometry(): EdgeGeometryMap | null {
  return useContext(EdgeGeometryContext);
}

export function useRegisterEdgeGeometry(
  id: string,
  pathData: string,
  colorVar: string,
) {
  const geometry = useEdgeGeometry();
  const path = useMemo(() => samplePath(pathData), [pathData]);

  useEffect(() => {
    if (!geometry) return;
    geometry.set(id, { path, colorVar });
    return () => {
      geometry.delete(id);
    };
  }, [geometry, id, path, colorVar]);
}
