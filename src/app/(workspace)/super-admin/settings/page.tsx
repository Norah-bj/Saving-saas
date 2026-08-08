"use client";

import * as React from "react";
import { CheckCircle2, KeyRound, RefreshCw, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";

interface ApiKey {
  id: string;
  label: string;
  maskedValue: string;
  createdDate: string;
  lastUsedDate: string;
}

const RANDOM_SUFFIX_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSuffix(length = 4) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += RANDOM_SUFFIX_CHARS[Math.floor(Math.random() * RANDOM_SUFFIX_CHARS.length)];
  }
  return out;
}

const INITIAL_API_KEYS: ApiKey[] = [
  {
    id: "key-1",
    label: "Production — Main",
    maskedValue: "sk_live_••••••••wJ2k",
    createdDate: "2025-01-14",
    lastUsedDate: "2026-08-07",
  },
  {
    id: "key-2",
    label: "Reporting Integration",
    maskedValue: "sk_live_••••••••q9Rt",
    createdDate: "2025-06-02",
    lastUsedDate: "2026-08-05",
  },
  {
    id: "key-3",
    label: "Staging / QA",
    maskedValue: "sk_test_••••••••4mNv",
    createdDate: "2026-03-19",
    lastUsedDate: "2026-07-30",
  },
];

export default function SuperAdminSettingsPage() {
  const [platformName, setPlatformName] = React.useState("IkiminaConnect");
  const [supportEmail, setSupportEmail] = React.useState("support@ikiminaconnect.rw");
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const [apiKeys, setApiKeys] = React.useState(INITIAL_API_KEYS);

  function handleSave() {
    setSaved(true);
  }

  function regenerate(id: string) {
    setApiKeys((prev) =>
      prev.map((key) =>
        key.id === id
          ? {
              ...key,
              maskedValue: `${key.maskedValue.startsWith("sk_test") ? "sk_test" : "sk_live"}_••••••••${randomSuffix()}`,
              lastUsedDate: "2026-08-08",
            }
          : key
      )
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings & API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide configuration and programmatic access credentials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Platform Settings</CardTitle>
          <CardDescription>General configuration shown across all organizations.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={platformName}
                onChange={(e) => {
                  setPlatformName(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(e) => {
                  setSupportEmail(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">
                Temporarily block access for all organizations except super admins.
              </p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={(checked) => {
                setMaintenanceMode(checked);
                setSaved(false);
              }}
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSave}>
              <Save className="size-4" /> Save Settings
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">API Keys</CardTitle>
          <CardDescription>Credentials used by integrations to access the platform API.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{key.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{key.maskedValue}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(key.createdDate)} · Last used {formatDate(key.lastUsedDate)}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => regenerate(key.id)}>
                <RefreshCw className="size-3.5" /> Regenerate
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
