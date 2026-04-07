import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EDGE_FUNCTION_URL =
  "https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/process-otter-transcript";
const WEBHOOK_SECRET =
  "a9a773ce652936c18e5e099625d4b27ced8a9b43ed90d6250aa56389a137c0e2";

type ProcessingState = "idle" | "processing" | "success" | "not_a_deal" | "error";

interface SuccessResult {
  deal_id: string;
  deal_title: string;
}

export default function NewEngagement() {
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transcript.trim()) {
      toast.error("Please enter a transcript before submitting.");
      return;
    }

    setState("processing");
    setResult(null);
    setErrorMessage("");

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
        setState("not_a_deal");
      } else {
        setState("success");
        setResult({ deal_id: data.deal_id, deal_title: data.deal_title });
        toast.success(`Deal "${data.deal_title}" created in Proposal stage.`);
      }
    } catch (err: any) {
      setState("error");
      setErrorMessage(err.message || "Something went wrong.");
      toast.error("Failed to process transcript.");
    }
  };

  const handleReset = () => {
    setTranscript("");
    setTitle("");
    setState("idle");
    setResult(null);
    setErrorMessage("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Engagement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dictate or paste your notes about a prospective engagement. AI will
          extract the deal details, create the deal in your pipeline, and notify
          Jamie with a draft engagement letter.
        </p>
      </div>

      {/* Success state */}
      {state === "success" && result && (
        <Card className="border-green-600/30 bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-500 mt-0.5 shrink-0" size={20} />
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-foreground">
                    Deal created: {result.deal_title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The deal has been added to your Proposal pipeline. Jamie will
                    receive an email with the deal summary, your transcript, and
                    a draft engagement letter.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate("/sales-pipeline")}
                  >
                    View Pipeline
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    Submit Another
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
                    The AI reviewed your transcript and determined it isn't about
                    a specific prospective client engagement. No deal was created.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleReset}>
                  Try Again
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
                  <p className="font-semibold text-foreground">
                    Something went wrong
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMessage}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleReset}>
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {(state === "idle" || state === "processing") && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-foreground">
              <Mic size={18} />
              <span className="font-semibold">Engagement Transcript</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g., Grove Bank initial call"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={state === "processing"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript</Label>
                <Textarea
                  id="transcript"
                  placeholder="Paste or dictate your transcript here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={state === "processing"}
                  className="min-h-[240px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Mention the company, contact name, service type, and estimated
                  value for best results.
                </p>
              </div>

              <Button
                type="submit"
                disabled={state === "processing" || !transcript.trim()}
                className="w-full sm:w-auto"
              >
                {state === "processing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing transcript and creating deal...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Process Engagement
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
