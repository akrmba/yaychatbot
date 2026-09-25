"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type QuestionType = "multiple_choice" | "yes_no" | "free_text";

type PlaybookStep = {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  required: boolean;
};

const QUESTION_TYPES: { value: QuestionType; label: string; description: string }[] = [
  { value: "multiple_choice", label: "Multiple choice", description: "Visitor picks from options" },
  { value: "yes_no", label: "Yes / No", description: "Simple binary question" },
  { value: "free_text", label: "Free text", description: "Open-ended answer" },
];

const defaultSteps: PlaybookStep[] = [
  { id: "1", type: "multiple_choice", question: "What's your monthly budget?", options: ["Under $500", "$500–$2k", "$2k–$10k", "$10k+"], required: true },
  { id: "2", type: "yes_no", question: "Are you the decision maker?", required: true },
  { id: "3", type: "multiple_choice", question: "When are you looking to start?", options: ["ASAP", "1–3 months", "3–6 months", "Just exploring"], required: false },
];

export default function PlaybookEditorPage({ params }: { params: { id: string } }) {
  const [steps, setSteps] = useState<PlaybookStep[]>(defaultSteps);
  const [saved, setSaved] = useState(false);

  function addStep() {
    setSteps([...steps, {
      id: crypto.randomUUID(),
      type: "free_text",
      question: "",
      required: false,
    }]);
  }

  function removeStep(id: string) {
    setSteps(steps.filter((s) => s.id !== id));
  }

  function updateStep(id: string, patch: Partial<PlaybookStep>) {
    setSteps(steps.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  function moveStep(id: string, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx + dir < 0 || idx + dir >= steps.length) return;
    const next = [...steps];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    setSteps(next);
  }

  function addOption(stepId: string) {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;
    updateStep(stepId, { options: [...(step.options ?? []), ""] });
  }

  function updateOption(stepId: string, optIdx: number, value: string) {
    const step = steps.find((s) => s.id === stepId);
    if (!step?.options) return;
    const opts = [...step.options];
    opts[optIdx] = value;
    updateStep(stepId, { options: opts });
  }

  function removeOption(stepId: string, optIdx: number) {
    const step = steps.find((s) => s.id === stepId);
    if (!step?.options) return;
    updateStep(stepId, { options: step.options.filter((_, i) => i !== optIdx) });
  }

  function handleSave() {
    // In production: Server Action to persist playbook
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/widgets/${params.id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Widget settings
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Playbook editor</h1>
        </div>
        <Button onClick={handleSave}>{saved ? "Saved!" : "Save playbook"}</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Build the qualification flow your bot will follow. Steps run in order — drag to reorder.
      </p>

      <div className="space-y-4">
        {steps.map((step, idx) => (
          <Card key={step.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveStep(step.id, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <button onClick={() => moveStep(step.id, 1)} disabled={idx === steps.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">Step {idx + 1}</Badge>
                    {/* Type selector */}
                    <div className="flex gap-1">
                      {QUESTION_TYPES.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => updateStep(step.id, { type: value, options: value === "multiple_choice" ? ["Option A", "Option B"] : undefined })}
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium border transition-colors",
                            step.type === value ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={step.required}
                          onChange={(e) => updateStep(step.id, { required: e.target.checked })}
                          className="rounded"
                        />
                        Required
                      </label>
                      <button onClick={() => removeStep(step.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Input
                    placeholder="Enter your question..."
                    value={step.question}
                    onChange={(e) => updateStep(step.id, { question: e.target.value })}
                    className="font-medium"
                  />
                </div>
              </div>
            </CardHeader>

            {step.type === "multiple_choice" && (
              <CardContent className="pt-0 pl-14">
                <div className="space-y-2">
                  {(step.options ?? []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(step.id, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="h-8 text-sm"
                      />
                      <button onClick={() => removeOption(step.id, optIdx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addOption(step.id)} className="text-xs h-7 px-2">
                    <Plus className="h-3 w-3 mr-1" />
                    Add option
                  </Button>
                </div>
              </CardContent>
            )}

            {step.type === "yes_no" && (
              <CardContent className="pt-0 pl-14">
                <div className="flex gap-2">
                  {["Yes", "No"].map((opt) => (
                    <div key={opt} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground" />
                      {opt}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}

            {step.type === "free_text" && (
              <CardContent className="pt-0 pl-14">
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground italic">
                  Visitor types a free-form answer here…
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addStep} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" />
        Add step
      </Button>
    </div>
  );
}
