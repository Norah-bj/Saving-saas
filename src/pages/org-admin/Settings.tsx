import * as React from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";

export default function OrgAdminSettingsPage() {
  const { user } = useCurrentUser();
  const organization = useDataStore((s) => s.organization);
  const updateOrganization = useDataStore((s) => s.updateOrganization);

  const [form, setForm] = React.useState({
    name: organization.name,
    shortName: organization.shortName,
    district: organization.district,
    sector: organization.sector,
    address: organization.address,
    contactEmail: organization.contactEmail,
    contactPhone: organization.contactPhone,
    logoInitials: organization.logoInitials,
    brandColor: organization.brandColor,
    stampLabel: organization.stampLabel,
  });
  const [saved, setSaved] = React.useState(false);

  const actorName = user?.fullName ?? "Organization Admin";

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    updateOrganization(form, actorName);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings & Branding</h1>
        <p className="text-sm text-muted-foreground">
          Update your organization&apos;s profile, contact details and brand identity.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Organization Profile</CardTitle>
            <CardDescription>These details appear on statements, contracts and reports.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Organization Name</Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shortName">Short Name</Label>
                <Input id="shortName" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="district">District</Label>
                <Input id="district" value={form.district} onChange={(e) => set("district", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sector">Sector</Label>
                <Input id="sector" value={form.sector} onChange={(e) => set("sector", e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="logoInitials">Logo Initials</Label>
                <Input
                  id="logoInitials"
                  maxLength={3}
                  value={form.logoInitials}
                  onChange={(e) => set("logoInitials", e.target.value.toUpperCase())}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.brandColor}
                    onChange={(e) => set("brandColor", e.target.value)}
                    className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                    aria-label="Brand color"
                  />
                  <Input value={form.brandColor} onChange={(e) => set("brandColor", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stampLabel">Stamp Label</Label>
                <Input id="stampLabel" value={form.stampLabel} onChange={(e) => set("stampLabel", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave}>
                <Save className="size-4" /> Save Changes
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
            <CardTitle className="text-sm font-medium">Brand Preview</CardTitle>
            <CardDescription>How your organization appears across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <div
              className="flex size-20 items-center justify-center rounded-2xl text-2xl font-semibold text-white shadow-sm"
              style={{ backgroundColor: form.brandColor }}
            >
              {form.logoInitials || "??"}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{form.name}</p>
              <p className="text-xs text-muted-foreground">
                {form.sector}, {form.district}
              </p>
            </div>
            <div className="w-full rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
              {form.stampLabel}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
