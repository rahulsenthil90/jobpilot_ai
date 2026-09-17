"use client";

import { ArrowRight, BriefcaseBusiness, FileSearch, FileText, Mic2, Send, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import AppLayout, { WorkspaceHeader } from "@/components/layout/AppLayout";
import { Notice } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const tools = [
  { title: "Review my resume", text: "Get focused suggestions on clarity, impact, and job fit.", icon: FileSearch },
  { title: "Write a cover letter", text: "Draft a tailored letter from a role description.", icon: FileText },
  { title: "Prepare for an interview", text: "Practice questions and sharpen your stories.", icon: Mic2 },
  { title: "Check my job fit", text: "Compare your experience with a new opportunity.", icon: BriefcaseBusiness }
];

export default function AIAssistancePage() {
  const [selected, setSelected] = useState("Review my resume");
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState("");
  
  const run = () => {
    setNotice(prompt.trim() ? "Your AI workspace is preparing a response" : "Add a few details to continue");
    window.setTimeout(() => setNotice(""), 2200);
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader title="AI assistance" description="Move from opportunity to polished application with focused support."/>
      
      <section className="mb-5 overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary-foreground/15">
            <Sparkles/>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-primary-foreground/75">Recommended next step</p>
            <h2 className="mt-2 max-w-2xl font-display text-xl font-semibold sm:text-2xl">Tailor your resume for the Linear interview</h2>
            <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80">Focus your recent work on systems thinking, collaboration, and measurable product outcomes.</p>
            <Button variant="secondary" className="mt-5 text-primary" onClick={() => setSelected("Review my resume")}>
              Start tailored review <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 font-display font-semibold">Choose a tool</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {tools.map(({ title, text, icon: Icon }) => (
              <Button 
                key={title} 
                variant="outline" 
                onClick={() => setSelected(title)} 
                className={`h-auto min-h-24 w-full items-start justify-start whitespace-normal p-4 text-left ${selected === title ? "border-primary bg-accent" : ""}`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon/>
                </span>
                <span className="ml-3">
                  <span className="block font-display font-semibold text-foreground">{title}</span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{text}</span>
                </span>
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <WandSparkles/>
            </span>
            <div>
              <h2 className="font-display font-semibold">{selected}</h2>
              <p className="text-xs text-muted-foreground">Your details stay within this workspace.</p>
            </div>
          </div>
          
          <div className="py-6">
            <label htmlFor="ai-prompt" className="text-sm font-semibold">What would you like help with?</label>
            <Textarea 
              id="ai-prompt" 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              className="mt-3 min-h-[11rem] resize-none" 
              placeholder="Paste a job description or tell JobPilot what you want to improve..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {["Make it concise", "Highlight impact", "Match this role"].map(item => (
                <Button key={item} variant="secondary" size="sm" onClick={() => setPrompt(item)}>
                  {item}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={run}>Generate <Send className="ml-2 size-4" /></Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
