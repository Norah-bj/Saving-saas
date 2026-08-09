import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, FileSpreadsheet, File, Upload, Lock, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/shared/data-table";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";
import type { DocumentCategory } from "@/lib/types";

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  constitution: "Constitution",
  policy: "Policy",
  report: "Report",
  minutes: "Minutes",
  form: "Form",
};

const FILE_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: File,
  xlsx: FileSpreadsheet,
};

const schema = z.object({
  name: z.string().min(3, "Document name is required"),
  category: z.enum(["constitution", "policy", "report", "minutes", "form"]),
  fileType: z.enum(["pdf", "docx", "xlsx"]),
  visibility: z.enum(["all", "admins"]),
  sizeKb: z.number().min(1, "File size is required"),
});
type FormValues = z.infer<typeof schema>;

export default function SecretaryDocumentsPage() {
  const { user } = useCurrentUser();
  const documents = useDataStore((s) => s.documents);
  const addDocument = useDataStore((s) => s.addDocument);

  const [open, setOpen] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", category: "policy", fileType: "pdf", visibility: "all", sizeKb: 250 },
  });

  if (!user) return null;

  const sorted = [...documents].sort(
    (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()
  );

  function onSubmit(values: FormValues) {
    addDocument(values, user!.fullName);
    form.reset({ name: "", category: "policy", fileType: "pdf", visibility: "all", sizeKb: 250 });
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            All organization documents, including admin-only files, are visible to the Secretary.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Upload className="size-4" /> Upload Document
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Documents ({sorted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                header: "Name",
                cell: (r) => {
                  const Icon = FILE_ICON[r.fileType] ?? File;
                  return (
                    <span className="inline-flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" /> {r.name}
                    </span>
                  );
                },
              },
              { header: "Category", cell: (r) => <Badge variant="outline">{CATEGORY_LABEL[r.category]}</Badge> },
              { header: "Type", cell: (r) => <span className="uppercase text-xs text-muted-foreground">{r.fileType}</span> },
              { header: "Size", cell: (r) => `${(r.sizeKb / 1024).toFixed(1)} MB` },
              {
                header: "Visibility",
                cell: (r) => (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {r.visibility === "all" ? <Globe className="size-3" /> : <Lock className="size-3" />}
                    {r.visibility === "all" ? "Everyone" : "Admins Only"}
                  </span>
                ),
              },
              { header: "Uploaded", cell: (r) => formatDate(r.uploadedDate) },
              { header: "By", cell: (r) => r.uploadedBy },
            ]}
            rows={sorted}
            rowKey={(r) => r.id}
            emptyMessage="No documents uploaded yet."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a new document to the shared organization library.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Annual General Meeting Minutes 2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "policy")}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fileType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File type</FormLabel>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "pdf")}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select file type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="docx">DOCX</SelectItem>
                          <SelectItem value="xlsx">XLSX</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "all")}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="admins">Admins Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sizeKb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File size (KB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={10}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Upload</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
