"use client";

import { useReactFlow } from "@xyflow/react";
import { renderCanvasToPng } from "@/lib/export-image";
import { downloadText, downloadUrl } from "@/lib/download";
import {
  useTopologyStore,
  useTopologyStoreApi,
} from "../_store/topology-provider";
import { parseTopology, serializeTopology } from "../_lib/topology-io";

export function useDiagramFiles() {
  const { getNodes, getNodesBounds, fitView } = useReactFlow();
  const storeApi = useTopologyStoreApi();
  const replaceTopology = useTopologyStore((s) => s.replaceTopology);

  async function exportPng() {
    const nodes = getNodes();
    if (nodes.length === 0) return;
    try {
      const dataUrl = await renderCanvasToPng(getNodesBounds(nodes));
      downloadUrl(dataUrl, "loadscape-diagram.png");
    } catch (error) {
      console.error("PNG export failed", error);
    }
  }

  function exportJson() {
    const { nodes, edges } = storeApi.getState();
    if (nodes.length === 0) return;
    downloadText(
      serializeTopology(nodes, edges),
      "loadscape-diagram.json",
      "application/json",
    );
  }

  async function importFile(file: File) {
    try {
      const { nodes, edges } = parseTopology(await file.text());
      replaceTopology(nodes, edges);
      requestAnimationFrame(() =>
        fitView({ maxZoom: 1, padding: 0.4, duration: 300 }),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Couldn't import that file.",
      );
    }
  }

  function openImportPicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void importFile(file);
    };
    input.click();
  }

  return { exportPng, exportJson, openImportPicker };
}
