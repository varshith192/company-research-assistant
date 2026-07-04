"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/lib/settings-context";
import { ModelCombobox } from "./model-combobox";

export function SettingsDialog() {
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [botToken, setBotToken] = useState(settings.discordBotToken);
  const [channelId, setChannelId] = useState(settings.discordChannelId);
  const [applicantName, setApplicantName] = useState(settings.applicantName);
  const [applicantEmail, setApplicantEmail] = useState(settings.applicantEmail);

  function handleOpenChange(next: boolean) {
    if (next) {
      setBotToken(settings.discordBotToken);
      setChannelId(settings.discordChannelId);
      setApplicantName(settings.applicantName);
      setApplicantEmail(settings.applicantEmail);
    }
    setOpen(next);
  }

  function saveDiscordConfig() {
    update({
      discordBotToken: botToken.trim(),
      discordChannelId: channelId.trim(),
      applicantName: applicantName.trim(),
      applicantEmail: applicantEmail.trim(),
    });
    toast.success("Configuration saved.");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="icon" aria-label="Settings" />}>
        <Settings2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Choose your AI model and configure Discord report delivery.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="model" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="model" className="flex-1">
              AI Model
            </TabsTrigger>
            <TabsTrigger value="discord" className="flex-1">
              Discord Integration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-3 pt-2">
            <Label>OpenRouter model</Label>
            <ModelCombobox value={settings.model} onChange={(model) => update({ model })} />
            <p className="text-xs text-muted-foreground">
              Any model available on OpenRouter can be used to generate the research report.
            </p>
          </TabsContent>

          <TabsContent value="discord" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="applicant-name">Applicant Name</Label>
              <Input
                id="applicant-name"
                placeholder="Jane Doe"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicant-email">Applicant Email Address</Label>
              <Input
                id="applicant-email"
                type="email"
                placeholder="jane@example.com"
                value={applicantEmail}
                onChange={(e) => setApplicantEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord-token">Discord Bot Token</Label>
              <Input
                id="discord-token"
                type="password"
                placeholder="Bot token provided by evaluator"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord-channel">Discord Channel ID</Label>
              <Input
                id="discord-channel"
                placeholder="123456789012345678"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Stored only in your browser. After a report is generated, it will automatically be
              sent to this channel along with your applicant details.
            </p>
            <Button onClick={saveDiscordConfig} className="w-full">
              Save Configuration
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
