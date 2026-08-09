import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate, formatRwf } from "@/lib/format";

export default function LoanContractPage() {
  const { id } = useParams<{ id: string }>();
  const loans = useDataStore((s) => s.loans);
  const members = useDataStore((s) => s.members);
  const organization = useDataStore((s) => s.organization);
  const savingsBalance = useDataStore((s) => s.savingsBalance);
  const shareHoldings = useDataStore((s) => s.shareHoldings);

  const loan = loans.find((l) => l.id === id);

  if (!loan) {
    return (
      <EmptyState
        icon={SearchX}
        title="Loan not found"
        description="This loan application doesn't exist or may have been removed."
        action={
          <Button size="sm" render={<Link to="/member/loans" />}>
            Back to my loans
          </Button>
        }
      />
    );
  }

  const member = members.find((m) => m.id === loan.memberId)!;
  const guarantors = members.filter((m) => loan.guarantorIds.includes(m.id));
  const savings = savingsBalance(member.id);
  const shares = shareHoldings[member.id];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="print-hidden flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link to={`/member/loans/${loan.id}`} />}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print / Download PDF
        </Button>
      </div>

      <div className="print-area rounded-xl border bg-card p-8 text-sm shadow-sm print:rounded-none print:border-0 print:shadow-none">
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
            <p className="font-semibold">LOAN AGREEMENT</p>
            <p className="text-xs text-muted-foreground">Contract No. {loan.contractNumber}</p>
            <p className="text-xs text-muted-foreground">Date: {formatDate(loan.approvedDate ?? loan.appliedDate)}</p>
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
            <Row label="Position" value={member.position} />
            <Row label="Monthly Salary" value={formatRwf(member.monthlySalary)} />
            <Row label="Savings Balance" value={formatRwf(savings)} />
            <Row label="Share Balance" value={shares ? `${shares.totalShares} shares (${formatRwf(shares.totalShares * shares.shareValue)})` : "—"} />
          </dl>
        </section>

        <Separator className="my-5" />

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Loan Terms
          </h2>
          <dl className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            <Row label="Loan Purpose" value={loan.purpose} />
            <Row label="Principal Amount" value={formatRwf(loan.amount)} />
            <Row label="Interest Rate" value={`${loan.interestRate}% (flat)`} />
            <Row
              label="Insurance Fee"
              value={loan.insuranceRequired ? `${formatRwf(loan.insuranceFee)} (1% — guaranteed loan)` : "Not applicable"}
            />
            <Row label="Total Payable" value={formatRwf(loan.totalPayable)} />
            <Row label="Repayment Period" value={`${loan.periodMonths} months`} />
            <Row label="Monthly Installment" value={formatRwf(loan.monthlyInstallment)} />
            <Row label="Disbursement Date" value={loan.disbursedDate ? formatDate(loan.disbursedDate) : "Pending"} />
          </dl>
        </section>

        <Separator className="my-5" />

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            HR Salary Deduction Authorization
          </h2>
          <p className="text-sm">
            I authorize the District HR Office to deduct{" "}
            <strong>{formatRwf(loan.monthlyInstallment)}</strong> from my monthly salary,
            beginning the month following disbursement, until this loan and all associated
            interest and fees are fully repaid.
          </p>
        </section>

        {guarantors.length > 0 && (
          <>
            <Separator className="my-5" />
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Guarantor(s)
              </h2>
              <dl className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                {guarantors.map((g) => (
                  <Row key={g.id} label={g.fullName} value={`${g.nationalId} · ${g.department}`} />
                ))}
              </dl>
            </section>
          </>
        )}

        <Separator className="my-5" />

        <section className="grid grid-cols-2 gap-x-8 gap-y-10 pt-2">
          <SignatureBlock label="Member Signature" name={member.fullName} />
          <SignatureBlock label="Guarantor Signature" name={guarantors[0]?.fullName ?? "N/A"} />
          <SignatureBlock label="Loan Committee Signature" name="Emmanuel Nsengimana" />
          <SignatureBlock label="Accountant Signature" name="Marie Claire Uwase" />
        </section>

        <div className="mt-10 flex items-center justify-end">
          <div className="flex size-24 rotate-[-8deg] items-center justify-center rounded-full border-2 border-dashed border-primary/50 text-center text-[9px] font-semibold uppercase leading-tight text-primary/70">
            {organization.stampLabel}
          </div>
        </div>
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
