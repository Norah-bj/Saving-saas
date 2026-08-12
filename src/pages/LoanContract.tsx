import type * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf } from "@/lib/format";
import { periodWordsRw, monthYearRw, formatDateRw } from "@/lib/kinyarwanda";

interface Article {
  title: string;
  body: React.ReactNode;
}

export default function LoanContractPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loans = useDataStore((s) => s.loans);
  const members = useDataStore((s) => s.members);
  const organization = useDataStore((s) => s.organization);
  const savingsBalance = useDataStore((s) => s.savingsBalance);
  const guarantees = useDataStore((s) => s.guarantees);

  const loan = loans.find((l) => l.id === id);

  if (!loan) {
    return (
      <EmptyState
        icon={SearchX}
        title="Loan not found"
        description="This loan application doesn't exist or may have been removed."
        action={
          <Button size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
        }
      />
    );
  }

  const member = members.find((m) => m.id === loan.memberId)!;
  const savings = savingsBalance(member.id);
  const loanGuarantees = guarantees.filter((g) => g.loanId === loan.id);
  const guarantors = loanGuarantees
    .map((g) => ({ guarantee: g, member: members.find((m) => m.id === g.guarantorId) }))
    .filter((g): g is { guarantee: typeof loanGuarantees[number]; member: NonNullable<(typeof members)[number]> } => !!g.member);

  const contractDate = formatDateRw(loan.approvedDate ?? loan.appliedDate);
  const startMonth = monthYearRw(loan.disbursedDate ?? loan.approvedDate ?? loan.appliedDate);
  const endDate = new Date(loan.disbursedDate ?? loan.approvedDate ?? loan.appliedDate);
  endDate.setMonth(endDate.getMonth() + loan.periodMonths - 1);
  const endMonth = monthYearRw(endDate.toISOString());

  const bankLine =
    member.bankName && member.bankAccountNumber
      ? `anyujijwe kuri Konti ye N°${member.bankAccountNumber} iri muri ${member.bankName}`
      : "azahabwa mu buryo bwemejwe na Komite y'Inguzanyo";

  const articles: Article[] = [
    {
      title: "AMAFARANGA AGURIJWE",
      body: (
        <p>
          {organization.shortName} igurije {member.fullName} amafaranga ({formatRwf(loan.amount)}
          ), {bankLine}.
        </p>
      ),
    },
    {
      title: "INYUNGU KU NGUZANYO",
      body: (
        <p>
          Uhawe inguzanyo yemeye kwishyura inyungu ingana na {loan.interestRate}% ku mwaka
          ihwanye na ({formatRwf(Math.round((loan.amount * loan.interestRate) / 100))}) akurwa
          mbere ku nguzanyo ahawe.
        </p>
      ),
    },
  ];

  if (loan.insuranceRequired) {
    articles.push({
      title: "UBWISHINGIZI",
      body: (
        <p>
          Uhawe inguzanyo irengeje ubwizigame afitemo yemeye gukatwa {organization.loanInsuranceRate}%
          by&apos;inguzanyo yose ahawe nk&apos;ubwishingizi buhwanye na ({formatRwf(loan.insuranceFee)}
          ) ayo mafaranga akazajya aguma mu isanduku ya {organization.shortName} akazishingira
          ibiteganwa n&apos;amategeko ngengamikorere.
        </p>
      ),
    });
  }

  articles.push(
    {
      title: "IGIHE CYO KWISHYURA UMWENDA",
      body: (
        <p>
          Umunyamuryango uhawe iyi nguzanyo azishyura mu gihe kitarenze amezi{" "}
          {periodWordsRw(loan.periodMonths)} ({loan.periodMonths}).
        </p>
      ),
    },
    {
      title: "AMAFARANGA AZISHYURWA BURI KWEZI",
      body: (
        <p>
          {member.fullName} yemeye kujya akurwa ku mushahara we amafaranga (
          {formatRwf(loan.monthlyInstallment)}) buri kwezi, yo kwishyura umwenda afashe muri{" "}
          {organization.shortName} kuva mu kwezi kwa {startMonth} kugeza mu kwezi kwa {endMonth}.
          Igihe habayeho kudakatwa umunyamuryango afite inshingano zo gushyira kuri konti ya{" "}
          {organization.shortName} amafaranga atakaswe kandi agahita abimenyesha ubuyobozi bwa{" "}
          {organization.shortName}.
        </p>
      ),
    },
    {
      title: "UBWIZIGAME",
      body: (
        <p>
          {member.fullName} yizigamiye muri {organization.shortName} amafaranga ({formatRwf(savings)}
          ) kugeza kuri uyu munsi.
        </p>
      ),
    }
  );

  if (loan.insuranceRequired) {
    articles.push({
      title: "UMWISHINGIZI",
      body: (
        <div className="flex flex-col gap-2">
          {guarantors.map(({ guarantee, member: g }) => (
            <p key={guarantee.id}>
              {g.fullName}, ufite ID:{g.nationalId} Telephone:{g.phone} Umunyamuryango wa{" "}
              {organization.shortName} yemeye kwishingira uhawe inguzanyo ariwe {member.fullName}{" "}
              ID:{member.nationalId}. Yishingiye ko naramuka atishyuye inguzanyo ahawe ingana
              n&apos;amafaranga ({formatRwf(loan.amount)}), ariwe uzayishyura bahereye ku
              bwizigame afite muri {organization.shortName} bungana na{" "}
              {formatRwf(guarantee.amountGuaranteed)}.
            </p>
          ))}
        </div>
      ),
    });
    articles.push({
      title: "KUREKA KUBA UMUNYAMURYANGO KU MWISHINGIZI",
      body: (
        <p>
          Nta mwishingizi wemerewe kureka kuba umunyamuryango mu gihe uwo wishingiye
          atararangiza kwishyura inguzanyo yahawe.
        </p>
      ),
    });
  }

  articles.push(
    {
      title: "IMPAKA ZAVUKA",
      body: (
        <div className="flex flex-col gap-1">
          <p>Impaka zose zavuka hagati y&apos;umunyamuryango, umwishingizi zakemurwa n&apos;inzego:</p>
          <p>1. Ubuyobozi bwa {organization.shortName}.</p>
          <p>2. Komite Nkemurampaka.</p>
          <p>3. Inteko Rusange ya {organization.shortName}.</p>
        </div>
      ),
    },
    {
      title: "INGINGO ZISOZA",
      body: (
        <p>
          {member.fullName} yemeye ko mu gihe atakiri umunyamuryango wa {organization.shortName},
          kandi agifite umwenda agomba kuwishyura mu gihe cyagenwe, bitaba ibyo hagafatirwa
          imigabane ye{loan.insuranceRequired ? " ndetse n'umwishingizi we" : ""}.
        </p>
      ),
    }
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="print-hidden flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print / Download PDF
        </Button>
      </div>

      <div className="print-area rounded-xl border bg-card p-8 text-sm shadow-soft print:rounded-none print:border-0 print:shadow-none">
        <div className="border-b pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {organization.name}
          </p>
          <h1 className="mt-2 text-base font-bold uppercase">
            Amasezerano y&apos;Inguzanyo Ihabwa Umunyamuryango{" "}
            {loan.insuranceRequired ? "Wishingiwe" : "— Isanzwe"}
          </h1>
        </div>

        <p className="mt-4">
          Aya masezerano y&apos;inguzanyo akozwe hagati ya {member.fullName} ufite ID:
          {member.nationalId}, UMUNYAMURYANGO wa {organization.name} na &quot;{organization.shortName}
          &quot; ihagarariwe na {organization.legalRepresentativeTitle}{" "}
          {organization.legalRepresentativeName}.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {articles.map((article, i) => (
            <section key={article.title}>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide">
                Ingingo ya {i === 0 ? "Mbere" : i + 1}: {article.title}
              </h2>
              <div className="text-sm leading-relaxed">{article.body}</div>
            </section>
          ))}
        </div>

        <Separator className="my-5" />
        <p className="text-xs text-muted-foreground">
          Bikorewe {organization.district}, {contractDate}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-10">
          <SignatureBlock
            label="Izina n'Umukono by'Umunyamuryango Ugurijwe"
            name={member.fullName}
          />
          {guarantors.map(({ guarantee, member: g }) => (
            <SignatureBlock key={guarantee.id} label="Izina n'Umukono by'Umwishingizi" name={g.fullName} />
          ))}
          <SignatureBlock
            label={`Umukono w'Uhagarariye ${organization.shortName}`}
            name={`${organization.legalRepresentativeTitle} wa ${organization.shortName}: ${organization.legalRepresentativeName}`}
          />
        </div>

        <div className="mt-10 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Contract No. {loan.contractNumber}</span>
          <div className="flex size-20 shrink-0 rotate-[-8deg] items-center justify-center rounded-full border-2 border-dashed border-primary/50 text-center text-[8px] font-semibold uppercase leading-tight text-primary/70">
            {organization.stampLabel}
          </div>
        </div>
      </div>
    </div>
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
