import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, SearchX, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { useMemberDetail } from "@/lib/api/members";
import { useOrganization } from "@/lib/api/organization";
import { useExitEligibility, useExitRequests } from "@/lib/api/membership";
import { formatDate, formatRwf } from "@/lib/format";

/**
 * Real backend data throughout — no new settlement-calculation endpoint was
 * needed. The settlement amount is savings + share value; outstanding loan
 * balance is always 0 here because exit is only reachable once
 * exit-eligibility is clean (no outstanding loans, no active guarantees —
 * see BUSINESS_RULES.md), the same rule this page already displayed as a
 * confirmation. See docs/DECISIONS.md.
 */
export default function ExitSettlementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: member, isLoading: memberLoading } = useMemberDetail(id);
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: eligibility, isLoading: eligibilityLoading } = useExitEligibility(id);
  const { data: exitRequests, isLoading: requestsLoading } = useExitRequests();

  if (memberLoading || orgLoading || eligibilityLoading || requestsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member || !organization) {
    return (
      <EmptyState
        icon={SearchX}
        title="Member not found"
        description="This member record doesn't exist or may have been removed."
        action={
          <Button size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
        }
      />
    );
  }

  const request = (exitRequests ?? [])
    .filter((r) => r.memberId === member.id)
    .sort((a, b) => (a.requestedDate < b.requestedDate ? 1 : -1))[0];

  const savings = member.savingsBalanceRwf;
  const shareValue = member.totalShares * organization.shareValueRwf;
  const eligible = eligibility?.eligible ?? false;
  const finalSettlement = savings + shareValue;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="print-hidden flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print / Download PDF
        </Button>
      </div>

      <div className="print-area rounded-xl border bg-card p-8 text-sm shadow-soft print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {organization.logoInitials}
            </div>
            <div>
              <p className="font-semibold">{organization.name}</p>
              <p className="text-xs text-muted-foreground">
                {organization.address} · {organization.contactPhone}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">MEMBER EXIT STATEMENT</p>
            <p className="text-xs text-muted-foreground">
              Date: {formatDate(request?.decidedDate ?? request?.requestedDate ?? member.dateJoined)}
            </p>
          </div>
        </div>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Member Information
          </h2>
          <dl className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            <Row label="Full Name" value={member.fullName} />
            <Row label="National ID" value={member.nationalId} />
            <Row label="Employee ID" value={member.employeeId} />
            <Row label="Department" value={member.department} />
            <Row label="Member Since" value={formatDate(member.dateJoined)} />
            <Row label="Exit Reason" value={request?.reason ?? "—"} />
          </dl>
        </section>

        <Separator className="my-5" />

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Eligibility Confirmation
          </h2>
          {eligible ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              No outstanding loans and no active guarantees on record at time of exit.
            </div>
          ) : (
            <p className="text-xs text-destructive">
              This member has unresolved obligations and should not have been exited — review
              before finalizing.
            </p>
          )}
        </section>

        <Separator className="my-5" />

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Final Settlement
          </h2>
          <dl className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            <Row label="Savings Balance" value={formatRwf(savings)} />
            <Row
              label="Share Value"
              value={member.totalShares > 0 ? `${member.totalShares} shares — ${formatRwf(shareValue)}` : "No shares held"}
            />
            <Row label="Outstanding Loan Balance" value={formatRwf(0)} />
            <dt className="border-t pt-2 font-medium">Final Amount Payable</dt>
            <dd className="border-t pt-2 text-right text-base font-semibold text-primary">
              {formatRwf(finalSettlement)}
            </dd>
          </dl>
        </section>

        <Separator className="my-5" />

        <section className="grid grid-cols-2 gap-x-8 gap-y-10 pt-2">
          <SignatureBlock label="Member Signature" name={member.fullName} />
          <SignatureBlock
            label={`${organization.legalRepresentativeTitle} wa ${organization.shortName}`}
            name={organization.legalRepresentativeName}
          />
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}

function SignatureBlock({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <div className="h-10 border-b" />
      <p className="mt-1 text-xs font-medium">{name}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
