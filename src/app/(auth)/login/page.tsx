"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Landmark,
  Users,
  Calculator,
  Gavel,
  Briefcase,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSessionStore } from "@/lib/store/session-store";
import { MEMBERS } from "@/lib/mock-data";
import { HOME_PAGE } from "@/lib/nav-config";
import { ROLE_LABEL, type Role } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

interface Persona {
  userId: string;
  role: Role;
  blurb: string;
  icon: LucideIcon;
}

const PERSONAS: Persona[] = [
  { userId: "u-nkurunziza", role: "member", blurb: "Head Teacher — savings, shares & loans", icon: Landmark },
  { userId: "u-habimana", role: "secretary", blurb: "Cooperative Secretary — membership & operations", icon: Users },
  { userId: "u-uwase", role: "accountant", blurb: "Chief Accountant — finance & disbursement", icon: Calculator },
  { userId: "u-nsengimana", role: "loan-committee", blurb: "Loan Committee Chair — reviews & approvals", icon: Gavel },
  { userId: "u-byiringiro", role: "hr", blurb: "HR Officer — payroll deductions", icon: Briefcase },
  { userId: "u-ingabire", role: "org-admin", blurb: "Organization Admin — full org management", icon: ShieldCheck },
  { userId: "u-twagirayezu", role: "super-admin", blurb: "Platform Super Admin — all organizations", icon: Crown },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useSessionStore((s) => s.login);

  function handleLogin(persona: Persona) {
    login(persona.userId, persona.role);
    router.push(HOME_PAGE[persona.role]);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            IK
          </div>
          <span className="text-lg font-semibold">IkiminaConnect</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This is a demo environment. Choose a persona below to sign in and explore
          that role&apos;s workspace — every admin role is also a member and can
          switch workspaces from the sidebar.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {PERSONAS.map((persona) => {
          const member = MEMBERS.find((m) => m.id === persona.userId)!;
          const Icon = persona.icon;
          return (
            <Card
              key={persona.userId}
              role="button"
              tabIndex={0}
              onClick={() => handleLogin(persona)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin(persona)}
              className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{member.fullName}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {ROLE_LABEL[persona.role]}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{persona.blurb}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        New organization?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Register your cooperative
        </Link>{" "}
        ·{" "}
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgot password
        </Link>{" "}
        ·{" "}
        <Link href="/" className="font-medium text-primary hover:underline">
          Back to homepage
        </Link>
      </p>
    </div>
  );
}
