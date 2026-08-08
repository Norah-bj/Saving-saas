"use client";

import * as React from "react";
import { FolderOpen, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";
import type { DocumentCategory, DocumentItem } from "@/lib/types";

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  constitution: "Constitution",
  policy: "Policy",
  report: "Report",
  minutes: "Minutes",
  form: "Form",
};

const CATEGORIES: DocumentCategory[] = ["constitution", "policy", "report", "minutes", "form"];

function formatSize(sizeKb: number) {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1)} MB`;
  return `${sizeKb} KB`;
}

function downloadDocument(doc: DocumentItem) {
  const blob = new Blob([`Demo placeholder for: ${doc.name}`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MemberDocumentsPage() {
  const documents = useDataStore((s) => s.documents);
  const [category, setCategory] = React.useState<DocumentCategory | "all">("all");

  const visible = documents.filter((d) => d.visibility === "all");
  const filtered = category === "all" ? visible : visible.filter((d) => d.category === category);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Constitution, policies, reports, minutes and forms shared with all members.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={category === "all" ? "default" : "outline"} size="sm" onClick={() => setCategory("all")}>
          All ({visible.length})
        </Button>
        {CATEGORIES.map((c) => {
          const count = visible.filter((d) => d.category === c).length;
          if (count === 0) return null;
          return (
            <Button
              key={c}
              variant={category === c ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABEL[c]} ({count})
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {category === "all" ? "All Documents" : CATEGORY_LABEL[category]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No documents in this category" />
          ) : (
            <DataTable
              columns={[
                { header: "Name", cell: (r) => r.name },
                { header: "Category", cell: (r) => <Badge variant="outline">{CATEGORY_LABEL[r.category]}</Badge> },
                { header: "Type", cell: (r) => <span className="uppercase text-muted-foreground">{r.fileType}</span> },
                { header: "Size", cell: (r) => formatSize(r.sizeKb) },
                { header: "Uploaded", cell: (r) => `${formatDate(r.uploadedDate)} · ${r.uploadedBy}` },
                {
                  header: "",
                  cell: (r) => (
                    <Button variant="ghost" size="sm" onClick={() => downloadDocument(r)}>
                      <Download className="size-3.5" /> Download
                    </Button>
                  ),
                },
              ]}
              rows={filtered}
              rowKey={(r) => r.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
