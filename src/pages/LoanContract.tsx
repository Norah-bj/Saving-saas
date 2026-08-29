import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useLoanDetail, useLoanContractPdf } from "@/lib/api/loans";
import { ApiError } from "@/lib/api/client";

/**
 * Embeds the real backend-generated PDF (GET /loans/{id}/contract) instead
 * of re-rendering the contract from data — LoanContractPdfGenerator ports
 * this page's old bespoke HTML article-for-article, so the content is
 * identical; only the source of truth changed. See docs/DECISIONS.md.
 */
export default function LoanContractPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: loan, isLoading: loanLoading, isError: loanError } = useLoanDetail(id);
  const { url, error: pdfError, isLoading: pdfLoading } = useLoanContractPdf(id);

  if (loanLoading || pdfLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loanError || !loan || pdfError) {
    return (
      <EmptyState
        icon={SearchX}
        title="Loan contract not found"
        description={
          pdfError instanceof ApiError
            ? pdfError.message
            : "This loan application doesn't exist, or you don't have access to its contract."
        }
        action={
          <Button size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4">
      <div className="print-hidden flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <Button size="sm" render={<a href={url ?? undefined} download={`${loan.contractNumber}.pdf`} />}>
          <Download className="size-3.5" /> Download PDF
        </Button>
      </div>

      <div className="min-h-[70vh] flex-1 overflow-hidden rounded-xl border bg-card shadow-soft">
        {url && (
          <iframe title={`Loan contract ${loan.contractNumber}`} src={url} className="size-full min-h-[70vh]" />
        )}
      </div>
    </div>
  );
}
