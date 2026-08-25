import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useSessionStore } from "@/lib/store/session-store";
import { useOrganization } from "@/lib/api/organization";
import { HOME_PAGE } from "@/lib/nav-config";
import { ROLE_LABEL, type Role } from "@/lib/types";

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  member: "Savings, shares & loans",
  secretary: "Membership & operations",
  accountant: "Finance & disbursement",
  "loan-committee": "Loan reviews & approvals",
  hr: "Payroll deductions",
  "org-admin": "Organization management",
  "super-admin": "Platform administration",
};

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { user, activeRole } = useCurrentUser();
  const switchRole = useSessionStore((s) => s.switchRole);
  const { data: organization } = useOrganization();

  if (!user || !activeRole) return null;

  const isSuperAdmin = user.roles.includes("super-admin");
  const orgLabel = isSuperAdmin ? "IkiminaConnect Platform" : (organization?.shortName ?? "…");
  const orgInitials = isSuperAdmin ? "IK" : (organization?.logoInitials ?? "…");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              {orgInitials}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{orgLabel}</span>
              <span className="truncate text-xs text-muted-foreground">
                {ROLE_LABEL[activeRole]} workspace
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.roles.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => {
                    switchRole(role);
                    navigate(HOME_PAGE[role]);
                  }}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{ROLE_LABEL[role]}</span>
                    <span className="text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </div>
                  {role === activeRole && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
