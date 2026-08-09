import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";

export default function MemberPoliciesPage() {
  const policies = useDataStore((s) => s.policies);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Policies</h1>
        <p className="text-sm text-muted-foreground">
          The rules that govern membership, savings, shares, loans, guarantors and exits.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {policies.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-medium">{p.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{p.summary}</p>
              </div>
              <Badge variant="outline" className="shrink-0 capitalize">
                {p.category}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                {p.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Last updated {formatDate(p.updatedAt)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
