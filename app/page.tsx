import { Building2 } from "lucide-react";

import { ChatInterface } from "@/components/chat/chat-interface";
import { SettingsDialog } from "@/components/settings/settings-dialog";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-muted/40 to-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Company Research Assistant</span>
          </div>
          <SettingsDialog />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <ChatInterface />
      </main>
    </div>
  );
}
