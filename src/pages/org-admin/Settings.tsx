import * as React from "react";
import { Save, CheckCircle2, ImageUp, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LOGO_MAX_BYTES,
  LOGO_TYPES,
  organizationLogoUrl,
  useOrganization,
  useRemoveOrganizationLogo,
  useUpdateOrganizationProfile,
  useUploadOrganizationLogo,
  type UpdateOrganizationProfileInput,
} from "@/lib/api/organization";
import { OrgLogo } from "@/components/shared/org-logo";
import { ApiError } from "@/lib/api/client";
import { z } from "zod";
import { emailSchema, hexColorSchema, phoneSchema, requiredText } from "@/lib/validation";

const profileSchema = z.object({
  name: requiredText("Organization name", 2, 120),
  shortName: requiredText("Short name", 2, 40),
  district: requiredText("District", 1, 60),
  sector: requiredText("Sector", 1, 60),
  address: requiredText("Address", 1, 200),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  logoInitials: requiredText("Logo initials", 1, 3),
  brandColor: hexColorSchema,
  stampLabel: requiredText("Stamp label", 1, 80),
});
type FieldErrors = Partial<Record<keyof UpdateOrganizationProfileInput, string>>;

function FieldError({ message, id }: { message?: string; id: string }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

export default function OrgAdminSettingsPage() {
  const { data: organization } = useOrganization();
  const updateProfile = useUpdateOrganizationProfile();
  const uploadLogo = useUploadOrganizationLogo();
  const removeLogo = useRemoveOrganizationLogo();
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  function handleLogoFile(file: File | undefined) {
    setLogoError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError("Choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("The logo must be 1 MB or smaller.");
      return;
    }
    uploadLogo.mutate(file, {
      onError: (err) => setLogoError(err instanceof ApiError ? err.message : "Couldn't upload the logo. Try again."),
    });
  }

  const [form, setForm] = React.useState<UpdateOrganizationProfileInput | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const active = form ?? (organization
    ? {
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
      }
    : null);

  function set<K extends keyof UpdateOrganizationProfileInput>(key: K, value: UpdateOrganizationProfileInput[K]) {
    if (!active) return;
    setForm({ ...active, [key]: value });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    updateProfile.reset();
  }

  function handleSave() {
    if (!active) return;
    const parsed = profileSchema.safeParse(active);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof UpdateOrganizationProfileInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    updateProfile.mutate(parsed.data, {
      onSuccess: () => setForm(null),
      onError: (err) => {
        if (err instanceof ApiError && err.details) setErrors(err.details as FieldErrors);
      },
    });
  }

  if (!active) return null;

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
                <Input id="name" value={active.name} onChange={(e) => set("name", e.target.value)} />
                <FieldError id="name-error" message={errors.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shortName">Short Name</Label>
                <Input id="shortName" value={active.shortName} onChange={(e) => set("shortName", e.target.value)} />
                <FieldError id="shortName-error" message={errors.shortName} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="district">District</Label>
                <Input id="district" value={active.district} onChange={(e) => set("district", e.target.value)} />
                <FieldError id="district-error" message={errors.district} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sector">Sector</Label>
                <Input id="sector" value={active.sector} onChange={(e) => set("sector", e.target.value)} />
                <FieldError id="sector-error" message={errors.sector} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={active.address} onChange={(e) => set("address", e.target.value)} />
                <FieldError id="address-error" message={errors.address} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={active.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                />
                <FieldError id="contactEmail-error" message={errors.contactEmail} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={active.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                />
                <FieldError id="contactPhone-error" message={errors.contactPhone} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="logoInitials">Initials (shown without a logo)</Label>
                <Input
                  id="logoInitials"
                  maxLength={3}
                  value={active.logoInitials}
                  onChange={(e) => set("logoInitials", e.target.value.toUpperCase())}
                />
                <FieldError id="logoInitials-error" message={errors.logoInitials} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={active.brandColor}
                    onChange={(e) => set("brandColor", e.target.value)}
                    className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                    aria-label="Brand color"
                  />
                  <Input aria-label="Brand color hex value" value={active.brandColor} onChange={(e) => set("brandColor", e.target.value)} />
                </div>
                <FieldError id="brandColor-error" message={errors.brandColor} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stampLabel">Stamp Label</Label>
                <Input id="stampLabel" value={active.stampLabel} onChange={(e) => set("stampLabel", e.target.value)} />
                <FieldError id="stampLabel-error" message={errors.stampLabel} />
              </div>
            </div>
            {updateProfile.isError && (
              <p className="text-sm text-destructive">
                {updateProfile.error instanceof ApiError ? updateProfile.error.message : "Something went wrong."}
              </p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                <Save className="size-4" /> Save Changes
              </Button>
              {updateProfile.isSuccess && (
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
            <OrgLogo
              src={organizationLogoUrl(organization?.id, organization?.logoUpdatedAt)}
              initials={active.logoInitials || "??"}
              name={active.name}
              className="size-20 rounded-2xl text-2xl shadow-sm"
              initialsClassName="text-white"
              style={{ backgroundColor: active.brandColor }}
            />
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInput}
                id="logo-file"
                type="file"
                accept={LOGO_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => {
                  handleLogoFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadLogo.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  <ImageUp className="size-3.5" />
                  {uploadLogo.isPending ? "Uploading…" : organization?.logoUpdatedAt ? "Change logo" : "Upload logo"}
                </Button>
                {organization?.logoUpdatedAt && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={removeLogo.isPending}
                    onClick={() => {
                      setLogoError(null);
                      removeLogo.mutate();
                    }}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                PNG, JPG or WebP, up to 1 MB. Square images look best.
                {organization?.logoUpdatedAt ? "" : " Until you add one, your initials are shown."}
              </p>
              {logoError && <p className="text-center text-xs text-destructive">{logoError}</p>}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{active.name}</p>
              <p className="text-xs text-muted-foreground">
                {active.sector}, {active.district}
              </p>
            </div>
            <div className="w-full rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
              {active.stampLabel}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
