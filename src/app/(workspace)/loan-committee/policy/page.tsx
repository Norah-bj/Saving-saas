"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpen } from "lucide-react";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";

export default function LoanCommitteePolicyPage() {
  const policies = useDataStore((s) => s.policies);

  const relevant = policies
    .filter((p) => p.category === "loan" || p.category === "guarantor")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Loan Policy</h1>
        <p className="text-sm text-muted-foreground">
          Reference rules governing loan eligibility, guarantor requirements, and committee decisions.
        </p>
      </div>

      {relevant.length === 0 ? (
        <EmptyState icon={BookOpen} title="No loan policies on file" />
      ) : (
        <div className="flex flex-col gap-4">
          {relevant.map((policy) => (
            <Card key={policy.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">{policy.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">{policy.category}</Badge>
                </div>
                <CardDescription>{policy.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {policy.body.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Last updated {formatDate(policy.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
