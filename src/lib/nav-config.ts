import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PiggyBank,
  FileText,
  Landmark,
  HandCoins,
  ShieldCheck,
  CalendarDays,
  Megaphone,
  FolderOpen,
  BookOpen,
  UserCircle,
  Bell,
  Users,
  LogOut,
  UserX,
  Receipt,
  Upload,
  BarChart3,
  Download,
  ClipboardList,
  Gavel,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  Building2,
  CreditCard,
  Activity,
  ScrollText,
  DatabaseBackup,
  LifeBuoy,
  KeyRound,
  Wallet,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_CONFIG: Record<Role, NavGroup[]> = {
  member: [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/member/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Savings & Shares",
      items: [
        { title: "Savings", href: "/member/savings", icon: PiggyBank },
        { title: "Savings Statement", href: "/member/savings/statement", icon: FileText },
        { title: "Shares", href: "/member/shares", icon: Landmark },
      ],
    },
    {
      label: "Loans",
      items: [
        { title: "My Loans", href: "/member/loans", icon: HandCoins },
        { title: "Apply for Loan", href: "/member/loans/apply", icon: FileSpreadsheet },
        { title: "Guarantors", href: "/member/guarantors", icon: ShieldCheck },
      ],
    },
    {
      label: "Community",
      items: [
        { title: "Meetings", href: "/member/meetings", icon: CalendarDays },
        { title: "Announcements", href: "/member/announcements", icon: Megaphone },
        { title: "Documents", href: "/member/documents", icon: FolderOpen },
        { title: "Policies", href: "/member/policies", icon: BookOpen },
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Notifications", href: "/member/notifications", icon: Bell },
        { title: "Profile & Settings", href: "/member/profile", icon: UserCircle },
      ],
    },
  ],
  secretary: [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/secretary/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Membership",
      items: [
        { title: "Members", href: "/secretary/members", icon: Users },
        { title: "Exit Requests", href: "/secretary/exit-requests", icon: LogOut },
        { title: "Suspended Members", href: "/secretary/suspended", icon: UserX },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Meetings", href: "/secretary/meetings", icon: CalendarDays },
        { title: "Announcements", href: "/secretary/announcements", icon: Megaphone },
        { title: "Documents", href: "/secretary/documents", icon: FolderOpen },
      ],
    },
  ],
  accountant: [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/accountant/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Operations",
      items: [
        { title: "Transactions", href: "/accountant/transactions", icon: Receipt },
        { title: "Savings Statements", href: "/accountant/statements", icon: FileText },
        { title: "Loan Disbursement", href: "/accountant/disbursement", icon: HandCoins },
        { title: "Excel Import", href: "/accountant/import", icon: Upload },
        { title: "Exports", href: "/accountant/exports", icon: Download },
      ],
    },
    {
      label: "Insights",
      items: [{ title: "Reports", href: "/accountant/reports", icon: BarChart3 }],
    },
  ],
  "loan-committee": [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/loan-committee/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Reviews",
      items: [
        { title: "Pending Applications", href: "/loan-committee/pending", icon: ClipboardList },
        { title: "Approvals & Rejections", href: "/loan-committee/decisions", icon: Gavel },
      ],
    },
    {
      label: "Insights",
      items: [
        { title: "Reports & Statistics", href: "/loan-committee/reports", icon: TrendingUp },
        { title: "Loan Policy", href: "/loan-committee/policy", icon: BookOpen },
      ],
    },
  ],
  hr: [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/hr/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Payroll",
      items: [
        { title: "Deduction Upload", href: "/hr/upload", icon: Upload },
        { title: "Payroll Reports", href: "/hr/reports", icon: BarChart3 },
      ],
    },
  ],
  "org-admin": [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/org-admin/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Organization",
      items: [
        { title: "Users & Roles", href: "/org-admin/users", icon: Users },
        { title: "Suspend / Activate", href: "/org-admin/moderation", icon: UserX },
        { title: "Settings & Branding", href: "/org-admin/settings", icon: Settings },
        { title: "Backups", href: "/org-admin/backups", icon: DatabaseBackup },
      ],
    },
    {
      label: "Insights",
      items: [{ title: "Organization Reports", href: "/org-admin/reports", icon: BarChart3 }],
    },
  ],
  "super-admin": [
    {
      label: "Overview",
      items: [{ title: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Platform",
      items: [
        { title: "Organizations", href: "/super-admin/organizations", icon: Building2 },
        { title: "Subscriptions & Billing", href: "/super-admin/billing", icon: CreditCard },
        { title: "Analytics", href: "/super-admin/analytics", icon: Activity },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Audit Logs", href: "/super-admin/audit-logs", icon: ScrollText },
        { title: "Global Backups", href: "/super-admin/backups", icon: DatabaseBackup },
        { title: "Support Center", href: "/super-admin/support", icon: LifeBuoy },
        { title: "System Monitoring", href: "/super-admin/monitoring", icon: Wallet },
        { title: "Settings & API Keys", href: "/super-admin/settings", icon: KeyRound },
      ],
    },
  ],
};

export const HOME_PAGE: Record<Role, string> = {
  member: "/member/dashboard",
  secretary: "/secretary/dashboard",
  accountant: "/accountant/dashboard",
  "loan-committee": "/loan-committee/dashboard",
  hr: "/hr/dashboard",
  "org-admin": "/org-admin/dashboard",
  "super-admin": "/super-admin/dashboard",
};
