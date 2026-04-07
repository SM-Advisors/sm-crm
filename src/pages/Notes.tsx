import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, Send, Loader2, CheckCircle, AlertCircle,
  FileText, Save, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

const EDGE_FUNCTION_URL =
  "https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/process-otter-transcript";
const WEBHOOK_SECRET =
  "a9a773ce652936c18e5e099625d4b27ced8a9b43ed90d6250aa56389a137c0e2";

type NoteType = "engagement" | "contact" | "company";
type ProcessingState = "idle" | "saving" | "processing" | "success" | "not_a_deal" | "error";

interface SavedNote {
  id: string;
  note_type: NoteType;
  title: string | null;
  content: string;
  status: string;
  created_at: string;
  processing_result: Record<string, unknown> | null;
  deal_id: string | null;
  error_message: string | null;
}

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  engagement: "New Engagement",
  contact: "Contact Notes",
  company: "Company Notes",
};

const NOTE_TYPE_DESCRIPTIONS: Record<NoteType, string> = {
  engagement:
    "Dictate or paste your notes about a prospective engagement. AI will extract the deal details, create the deal in your pipeline, and notify Jamie with a draft engagement letter.",
  contact:
    "Record notes from a call, meeting, or interaction with a contact. Notes are saved and can be reviewed later.",
  company:
    "Capture notes about a company — research findings, strategy thoughts, or general observations.",
};

export default function NotesPage() {
  const navigate = useNavigate();
  const [noteType, setNoteType] = useState<NoteType>("engagement");
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [dealTitle, setDealTitle] = useState("");
  const [recentNotes, setRecentNotes] = useState<SavedNote[]>([]);

  // Load recent notes
  useEffect(() => {
    loadRecentNotes();
  }, []);

  async function loadRecentNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentNotes(data as unknown as SavedNote[]);
    }
  }

  // Save note to DB first — always before processing
  async function saveNote(): Promise<string | null> {
    setState("saving");

    const payload: Record<string, unknown> = {
      note_type: noteType,
      title: title.trim() || null,
      content: transcript.trim(),
      status: "draft",
    };

    if (savedNoteId) {
      // Update existing draft
      const { error } = await supabase
        .from("notes")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", savedNoteId);

      if (error) {
        toast.error("Failed to save note.");
        setState("error");
        setErrorMessage(error.message);
        return null;
      }
      toast.success("Note saved.");
      loadRecentNotes();
      return savedNoteId;
    } else {
      // Insert new note
      const { data, error } = await supabase
        .from("notes")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Failed to save note.");
        setState("error");
        setErrorMessage(error?.message || "Unknown error");
        return null;
      }
      setSavedNoteId((data as { id: string }).id);
      toast.success("Note saved.");
      loadRecentNotes();
      return (data as { id: string }).id;
    }
  }

  // Save only (no processing)
  async function handleSave() {
    if (!transcript.trim()) {
      toast.error("Please enter some content before saving.");
      return;
    }
    const noteId = await saveNote();
    if (noteId) {
      setState("idle");
    }
  }

  // Process engagement notes through the edge function
  async function handleProcess(e: React.FormEvent) {
    e.preventDefault();

    if (!transcript.trim()) {
      toast.error("Please enter content before submitting.");
      return;
    }

    // Step 1: Save to DB first
    const noteId = await saveNote();
    if (!noteId) return;

    // Step 2: For non-engagement notes, just save — no processing needed
    if (noteType !== "engagement") {
      setState("idle");
      toast.success("Note saved successfully.");
      return;
    }

    // Step 3: Mark as processing
    setState("processing");
    await supabase
      .from("notes")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", noteId);

    // Step 4: Call edge function
    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          transcript_text: transcript.trim(),
          title: title.trim() || undefined,
          date: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      if (data.is_deal === false) {
        await supabase
          .from("notes")
          .update({
            status: "processed",
            processing_result: data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId);

        setState("not_a_deal");
      } else {
        await supabase
          .from("notes")
          .update({
            status: "processed",
            deal_id: data.deal_id,
            processing_result: data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId);

        setState("success");
        setDealTitle(data.deal_title);
        toast.success(`Deal "${data.deal_title}" created in Proposal stage.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      await supabase
        .from("notes")
        .update({
          status: "error",
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId);

      setState("error");
      setErrorMessage(msg);
      toast.error("Failed to process transcript.");
    }

    loadRecentNotes();
  }

  function handleReset() {
    setTranscript("");
    setTitle("");
    setState("idle");
    setSavedNoteId(null);
    setDealTitle("");
    setErrorMessage("");
  }

  function loadNote(note: SavedNote) {
    setTranscript(note.content);
    setTitle(note.title || "");
    setNoteType(note.note_type as NoteType);
    setSavedNoteId(note.id);
    setState("idle");
    setErrorMessage("");
    setDealTitle("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {NOTE_TYPE_DESCRIPTIONS[noteType]}
          </p>
        </div>
      </div>

      {/* Success state */}
      {state === "success" && (
        <Card className="border-green-600/30 bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-500 mt-0.5 shrink-0" size={20} />
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-foreground">
                    Deal created: {dealTitle}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The deal has been added to your Proposal pipeline. Jamie will
                    receive an email with the deal summary, your transcript, and a
                    draft engagement letter.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate("/sales-pipeline")}>
                    View Pipeline
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    New Note
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not a deal state */}
      {state === "not_a_deal" && (
        <Card className="border-yellow-600/30 bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-500 mt-0.5 shrink-0" size={20} />
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-foreground">
                    Not a prospective engagement
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The AI reviewed your transcript and determined it isn't about a
                    specific prospective client engagement. No deal was created. Your
                    note has been saved.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleReset}>
                  New Note
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {state === "error" && (
        <Card className="border-red-600/30 bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-foreground">Something went wrong</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMessage}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your note has been saved and can be retried.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setState("idle")}>
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {(state === "idle" || state === "saving" || state === "processing") && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-foreground">
              <Mic size={18} />
              <span className="font-semibold">
                {NOTE_TYPE_LABELS[noteType]}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProcess} className="space-y-4">
              {/* Note type selector */}
              <div className="space-y-2">
                <Label htmlFor="noteType">Note Type</Label>
                <Select
                  value={noteType}
                  onValueChange={(v) => setNoteType(v as NoteType)}
                  disabled={state === "processing"}
                >
                  <SelectTrigger id="noteType" className="w-full sm:w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">New Engagement</SelectItem>
                    <SelectItem value="contact">Contact Notes</SelectItem>
                    <SelectItem value="company">Company Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder={
                    noteType === "engagement"
                      ? "e.g., Grove Bank initial call"
                      : noteType === "contact"
                        ? "e.g., Follow-up with Karen Rohling"
                        : "e.g., South State Bank research"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={state === "processing"}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="transcript">
                  {noteType === "engagement" ? "Transcript" : "Notes"}
                </Label>
                <Textarea
                  id="transcript"
                  placeholder={
                    noteType === "engagement"
                      ? "Paste or dictate your transcript here..."
                      : "Type your notes here..."
                  }
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={state === "processing"}
                  className="min-h-[240px] resize-y"
                />
                {noteType === "engagement" && (
                  <p className="text-xs text-muted-foreground">
                    Mention the company, contact name, service type, and estimated
                    value for best results.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Save button — always available */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={
                    state === "processing" ||
                    state === "saving" ||
                    !transcript.trim()
                  }
                >
                  {state === "saving" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save{savedNoteId ? " (Update)" : ""}
                    </>
                  )}
                </Button>

                {/* Process button — only for engagement notes */}
                {noteType === "engagement" && (
                  <Button
                    type="submit"
                    disabled={
                      state === "processing" ||
                      state === "saving" ||
                      !transcript.trim()
                    }
                  >
                    {state === "processing" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing transcript and creating deal...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Save &amp; Process Engagement
                      </>
                    )}
                  </Button>
                )}

                {/* Submit for contact/company notes */}
                {noteType !== "engagement" && (
                  <Button
                    type="submit"
                    disabled={
                      state === "processing" ||
                      state === "saving" ||
                      !transcript.trim()
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Note
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-foreground">
              <FileText size={18} />
              <span className="font-semibold">Recent Notes</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => loadNote(note)}
                  className="w-full text-left px-3 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {NOTE_TYPE_LABELS[note.note_type as NoteType] || note.note_type}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {note.title || note.content.slice(0, 60)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <StatusBadge status={note.status} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-500/20 text-slate-400",
    processing: "bg-blue-500/20 text-blue-400",
    processed: "bg-green-500/20 text-green-400",
    error: "bg-red-500/20 text-red-400",
  };
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ${styles[status] || styles.draft}`}
    >
      {status}
    </span>
  );
}
