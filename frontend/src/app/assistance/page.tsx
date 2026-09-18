"use client";

import { ArrowRight, BriefcaseBusiness, FileSearch, FileText, Mic2, Send, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
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
  const { user } = useAuth();
  const [selected, setSelected] = useState("Check my job fit");
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState("");
  
  const run = () => {
    setNotice(prompt.trim() ? "Your AI workspace is preparing a response" : "Add a few details to continue");
    window.setTimeout(() => setNotice(""), 2200);
  };

  const analyzeJob = async () => {
    if (!prompt.trim()) {
      setError("Please paste a job description first.");
      return;
    }
    if (!user) {
      setError("Please sign in first.");
      return;
    }
    
    setAnalyzing(true);
    setError("");
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/assistance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, jobDescription: prompt })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze job");
      }
      setAnalysisResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
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

        <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4 sm:p-5">
            <h2 className="font-display font-semibold">Workspace</h2>
            {selected === "Check my job fit" ? (
              <p className="mt-1 text-sm text-muted-foreground">Paste a job description below and our AI will analyze your match score and missing skills.</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Add details below to guide the AI.</p>
            )}
          </div>
          
          <div className="flex-1 p-4 sm:p-5">
            {selected === "Check my job fit" ? (
              <>
                <Textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Paste the full job description here..." 
                  className="h-[250px] resize-none border-0 bg-secondary/50 p-4 focus-visible:ring-1" 
                />
                
                {error && <div className="mt-4 p-3 bg-red-500/10 text-red-500 text-sm rounded">{error}</div>}
                
                {analysisResult && (
                  <div className="mt-6 space-y-4 rounded-lg bg-secondary/30 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                        {analysisResult.matchScore}%
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Match Score</h3>
                        <p className="text-sm text-muted-foreground">Based on your resume and skills</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.requiredSkills?.map((skill: string, i: number) => (
                          <span key={i} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {analysisResult.missingSkills?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-destructive">Missing Skills to Learn</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.missingSkills.map((skill: string, i: number) => (
                            <span key={i} className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive border border-destructive/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., I'm applying for a Senior Frontend role at Stripe. Help me focus my experience on performance and component architecture." 
                className="h-full min-h-[250px] resize-none border-0 bg-secondary/50 p-4 focus-visible:ring-1" 
              />
            )}
          </div>
          
          <div className="border-t border-border p-4 sm:p-5">
            {selected === "Check my job fit" ? (
               <Button className="w-full sm:w-auto" onClick={analyzeJob} disabled={analyzing}>
                 {analyzing ? <span className="animate-pulse">Analyzing...</span> : <><WandSparkles className="mr-2 size-4" /> Analyze Job Fit</>}
               </Button>
            ) : (
               <Button className="w-full sm:w-auto" onClick={run}>
                 <Send className="mr-2 size-4" /> Run AI tool
               </Button>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
