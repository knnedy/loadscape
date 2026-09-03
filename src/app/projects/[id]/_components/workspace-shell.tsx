import { TopBar } from "./top-bar";
import { NodeTray } from "./node-tray";
import { Canvas } from "./canvas";
import { TopologyProvider } from "../_store/topology-provider";

export function WorkspaceShell({ projectName }: { projectName: string }) {
  return (
    <TopologyProvider>
      <div className="flex h-screen w-full flex-col">
        <TopBar projectName={projectName} />
        <div className="flex flex-1 overflow-hidden">
          <NodeTray />
          <main className="flex-1 overflow-hidden">
            <Canvas />
          </main>
        </div>
      </div>
    </TopologyProvider>
  );
}
