import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  Send,
  Copy,
  Check,
  Search,
  AlertTriangle,
  RotateCcw,
  Users,
  FileText,
  Eye,
  CheckSquare,
  Square,
  AlertCircle,
  Save,
} from "lucide-react";

export type PendingFaculty = {
  faculty_name: string;
  email: string | null;
  count: number;
  overdue: boolean;
  oldestActivityId?: string;
};

interface BulkEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facultyList: PendingFaculty[];
  preselectedNames?: string[];
  onSuccess?: () => void;
}

export const DEFAULT_EMAIL_SUBJECT =
  "Reminder: Pending Post-Activity Report (PA Report) Submission";

export const DEFAULT_EMAIL_BODY = `Dear {faculty_name},

This is a friendly reminder from the Administrative Office regarding your Post-Activity Report(s) (PA Report) for completed activities that are currently pending submission ({pending_count} pending report(s)).

Prompt submission of PA reports is required for official documentation, certificate issuance, and institutional compliance.

Please submit your pending report(s) at your earliest convenience through the official submission channel.

If you have already submitted your report recently, please disregard this notice.

Thank you for your cooperation!

Best regards,
Administrative Office / TAAS 2025`;

export function BulkEmailModal({
  open,
  onOpenChange,
  facultyList,
  preselectedNames,
  onSuccess,
}: BulkEmailModalProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"recipients" | "template" | "preview">("recipients");
  const [search, setSearch] = useState("");
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bulk_email_subject");
      if (saved) return saved;
    }
    return DEFAULT_EMAIL_SUBJECT;
  });
  const [body, setBody] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bulk_email_body");
      if (saved) return saved;
    }
    return DEFAULT_EMAIL_BODY;
  });
  const [copied, setCopied] = useState(false);

  const handleSaveTemplate = () => {
    localStorage.setItem("bulk_email_subject", subject);
    localStorage.setItem("bulk_email_body", body);
    toast.success("Default email template saved successfully!");
  };
  const [previewFacultyName, setPreviewFacultyName] = useState<string>("");

  // Initialize selected names when modal opens or preselectedNames change
  useEffect(() => {
    if (open) {
      if (preselectedNames && preselectedNames.length > 0) {
        setSelectedNames(new Set(preselectedNames));
      } else {
        // By default select all faculty with pending reports
        setSelectedNames(new Set(facultyList.map((f) => f.faculty_name)));
      }
      if (facultyList.length > 0 && !previewFacultyName) {
        setPreviewFacultyName(facultyList[0].faculty_name);
      }
    }
  }, [open, preselectedNames, facultyList]);

  // Filtered recipient list based on search query
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facultyList;
    return facultyList.filter(
      (f) =>
        f.faculty_name.toLowerCase().includes(q) || (f.email && f.email.toLowerCase().includes(q)),
    );
  }, [facultyList, search]);

  const selectedFacultyObjects = useMemo(() => {
    return facultyList.filter((f) => selectedNames.has(f.faculty_name));
  }, [facultyList, selectedNames]);

  const validEmailRecipients = useMemo(() => {
    return selectedFacultyObjects.filter((f) => f.email && f.email.trim() !== "");
  }, [selectedFacultyObjects]);

  const missingEmailCount = selectedFacultyObjects.length - validEmailRecipients.length;

  const totalPendingSelected = useMemo(() => {
    return selectedFacultyObjects.reduce((acc, f) => acc + f.count, 0);
  }, [selectedFacultyObjects]);

  // Handle Select All / Deselect All / Filters
  const handleSelectAll = () => {
    setSelectedNames(new Set(facultyList.map((f) => f.faculty_name)));
  };

  const handleDeselectAll = () => {
    setSelectedNames(new Set());
  };

  const handleSelectOverdueOnly = () => {
    setSelectedNames(new Set(facultyList.filter((f) => f.overdue).map((f) => f.faculty_name)));
  };

  const handleSelectWithEmailOnly = () => {
    setSelectedNames(
      new Set(
        facultyList.filter((f) => f.email && f.email.trim() !== "").map((f) => f.faculty_name),
      ),
    );
  };

  const toggleFaculty = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Preview formatting
  const previewItem = useMemo(() => {
    return (
      facultyList.find((f) => f.faculty_name === previewFacultyName) ||
      selectedFacultyObjects[0] ||
      facultyList[0]
    );
  }, [facultyList, previewFacultyName, selectedFacultyObjects]);

  const renderedPreviewBody = useMemo(() => {
    if (!previewItem) return body;
    return body
      .replace(/{faculty_name}/g, previewItem.faculty_name)
      .replace(/{pending_count}/g, String(previewItem.count));
  }, [body, previewItem]);

  // Mutation to log reminders to Supabase database
  const logBulkReminders = useMutation({
    mutationFn: async ({ method }: { method: "mailto" | "log_only" }) => {
      if (selectedFacultyObjects.length === 0) {
        throw new Error("No faculty members selected");
      }

      const { data: user } = await supabase.auth.getUser();
      const currentUserId = user.user?.id;

      const records = selectedFacultyObjects.map((f) => ({
        activity_id: f.oldestActivityId || null,
        faculty_name: f.faculty_name,
        email: f.email || null,
        message: `[Bulk Email] ${subject} (${f.count} pending PARs)`,
        channel: "email",
        status: f.email ? "sent" : "failed",
        sent_by: currentUserId || null,
      }));

      const { error } = await supabase.from("reminder_logs").insert(records);
      if (error) throw error;
      return method;
    },
    onSuccess: (method) => {
      qc.invalidateQueries({ queryKey: ["reminder-logs"] });
      if (method === "mailto") {
        toast.success(
          `Opened mail client and recorded ${selectedFacultyObjects.length} bulk reminder logs!`,
        );
      } else {
        toast.success(`Logged ${selectedFacultyObjects.length} bulk reminder entries!`);
      }
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to record bulk reminder logs");
    },
  });

  // Action 1: Open default mail app with BCC
  const handleOpenMailClient = () => {
    if (validEmailRecipients.length === 0) {
      toast.error("No valid email addresses found among selected faculty members.");
      return;
    }

    const bccEmails = validEmailRecipients.map((f) => f.email!.trim()).join(",");
    const genericBody = body
      .replace(/{faculty_name}/g, "Faculty Member")
      .replace(/{pending_count}/g, "pending");

    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(genericBody)}`;

    // Open mailto link
    window.location.href = mailtoUrl;

    // Log the action
    logBulkReminders.mutate({ method: "mailto" });
  };

  // Action 2: Copy emails to clipboard
  const handleCopyEmails = () => {
    if (validEmailRecipients.length === 0) {
      toast.error("No valid email addresses to copy.");
      return;
    }
    const emailsList = validEmailRecipients.map((f) => f.email!.trim()).join(", ");
    navigator.clipboard.writeText(emailsList);
    setCopied(true);
    toast.success(`Copied ${validEmailRecipients.length} email addresses to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

  // Action 3: Log reminders only
  const handleLogOnly = () => {
    logBulkReminders.mutate({ method: "log_only" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 text-primary">
            <Mail className="h-5 w-5" />
            <DialogTitle className="font-display text-xl font-semibold">
              Bulk Email Reminders
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Send a default or customized email reminder to professors who have not submitted their
            Post-Activity Reports.
          </DialogDescription>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "recipients" | "template" | "preview")}
            className="mt-4 w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1">
              <TabsTrigger value="recipients" className="text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Recipients ({selectedNames.size}/{facultyList.length})
              </TabsTrigger>
              <TabsTrigger value="template" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Email Template
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview & Send
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: RECIPIENTS */}
          {activeTab === "recipients" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by faculty name or email..."
                    className="pl-8 text-xs h-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs h-8 px-2.5 gap-1"
                  >
                    <CheckSquare className="h-3.5 w-3.5" /> Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="text-xs h-8 px-2.5 gap-1"
                  >
                    <Square className="h-3.5 w-3.5" /> Deselect All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectWithEmailOnly}
                    className="text-xs h-8 px-2.5"
                  >
                    With Email Only
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectOverdueOnly}
                    className="text-xs h-8 px-2.5 text-destructive"
                  >
                    Overdue Only
                  </Button>
                </div>
              </div>

              {/* Status Summary Banner */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Selected: {selectedNames.size} of {facultyList.length} faculty
                  </span>
                  <Badge variant="secondary" className="text-[11px]">
                    {totalPendingSelected} total pending PARs
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-success font-medium flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> {validEmailRecipients.length} with email
                  </span>
                  {missingEmailCount > 0 && (
                    <span className="text-warning-foreground font-medium flex items-center gap-1 bg-warning/20 px-2 py-0.5 rounded">
                      <AlertTriangle className="h-3.5 w-3.5" /> {missingEmailCount} missing email
                    </span>
                  )}
                </div>
              </div>

              {/* Recipient List */}
              <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-[320px] overflow-y-auto">
                {filteredList.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">
                    No faculty match your search.
                  </p>
                ) : (
                  filteredList.map((f) => {
                    const isSelected = selectedNames.has(f.faculty_name);
                    const hasEmail = f.email && f.email.trim() !== "";
                    return (
                      <div
                        key={f.faculty_name}
                        onClick={() => toggleFaculty(f.faculty_name)}
                        className={`flex items-center justify-between p-3 text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleFaculty(f.faculty_name)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{f.faculty_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {hasEmail ? (
                                <span className="text-muted-foreground">{f.email}</span>
                              ) : (
                                <span className="italic text-warning-foreground">
                                  No email on file — set in Faculty page
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[11px] font-medium">
                            {f.count} pending
                          </Badge>
                          {f.overdue && (
                            <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0">
                              <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL TEMPLATE */}
          {activeTab === "template" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Email Subject</label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveTemplate}
                    className="text-xs h-7 gap-1 text-primary hover:text-primary-foreground hover:bg-primary"
                  >
                    <Save className="h-3 w-3" /> Save Template
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSubject(DEFAULT_EMAIL_SUBJECT);
                      setBody(DEFAULT_EMAIL_BODY);
                      toast.info("Reset to default system template. Click 'Save Template' if you want to make this permanent.");
                    }}
                    className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset to Default
                  </Button>
                </div>
              </div>

              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="text-xs"
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Message Body</label>
                  <span className="text-[11px] text-muted-foreground">
                    Available variables:{" "}
                    <code className="bg-muted px-1 rounded">{`{faculty_name}`}</code>,{" "}
                    <code className="bg-muted px-1 rounded">{`{pending_count}`}</code>
                  </span>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder="Enter reminder email message..."
                  className="text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Dynamic Placeholders:</span>
                  <p className="mt-0.5">
                    When sending or previewing emails,{" "}
                    <code className="text-primary">{`{faculty_name}`}</code> will automatically be
                    replaced with the professor's full name, and{" "}
                    <code className="text-primary">{`{pending_count}`}</code> with their total
                    unsubmitted PAR count.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREVIEW & SEND */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Live Message Preview:</span>
                {facultyList.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Preview for:</span>
                    <select
                      value={previewFacultyName}
                      onChange={(e) => setPreviewFacultyName(e.target.value)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs outline-none"
                    >
                      {facultyList.map((f) => (
                        <option key={f.faculty_name} value={f.faculty_name}>
                          {f.faculty_name} ({f.count} pending)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Email Preview Box */}
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="border-b border-border bg-muted/40 p-3 text-xs space-y-1">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-14 font-medium">To:</span>
                    <span className="font-medium text-foreground">
                      {previewItem?.faculty_name || "Faculty Member"} &lt;
                      {previewItem?.email || "no-email-on-file@domain.edu"}&gt;
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-14 font-medium">Subject:</span>
                    <span className="font-semibold text-foreground">{subject}</span>
                  </div>
                </div>
                <div className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground bg-background/50 max-h-[220px] overflow-y-auto">
                  {renderedPreviewBody}
                </div>
              </div>

              {/* Summary before sending */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between font-medium text-foreground">
                  <span>Selected Recipients Summary:</span>
                  <span>{validEmailRecipients.length} valid email recipients</span>
                </div>

                {missingEmailCount > 0 && (
                  <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {missingEmailCount} selected faculty member(s) have no email address on file and
                    will be skipped in mail client dispatch, but can still be logged.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyEmails}
              disabled={validEmailRecipients.length === 0}
              className="text-xs h-9 gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied Emails!" : "Copy Emails (BCC)"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogOnly}
              disabled={selectedFacultyObjects.length === 0 || logBulkReminders.isPending}
              className="text-xs h-9 gap-1 text-muted-foreground hover:text-foreground"
            >
              Log Reminders Only
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenMailClient}
              disabled={selectedFacultyObjects.length === 0 || logBulkReminders.isPending}
              className="text-xs h-9 px-4 gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />
              Open Mail Client & Log ({validEmailRecipients.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
