import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CottageView } from "@/components/cottage/view";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <Splash />;
  return <CottageView />;
}

function Splash() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
      <p className="font-serif text-2xl text-fg">蓝栖小屋</p>
      <p className="text-sm text-muted">正在把客厅的光打开</p>
    </main>
  );
}
