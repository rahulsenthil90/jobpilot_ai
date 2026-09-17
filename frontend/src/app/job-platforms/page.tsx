"use client";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import AppLayout, { WorkspaceHeader, Notice } from "@/components/layout/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type PlatformName = "LinkedIn" | "Naukri" | "Indeed";
type Platform = { name: PlatformName; url: string; color: string; description: string };

const platforms: Platform[] = [
  { name: "LinkedIn", url: "https://www.linkedin.com/jobs/", color: "LI", description: "Discover professional roles and continue securely on LinkedIn." },
  { name: "Naukri", url: "https://www.naukri.com/", color: "NA", description: "Track India-focused opportunities and open each listing on Naukri." },
  { name: "Indeed", url: "https://www.indeed.com/", color: "IN", description: "Review broad job matches and complete applications on Indeed." },
];

const sampleMatches = [
  { role: "Senior Product Designer", company: "Atlassian", match: 94, location: "Bengaluru · Hybrid", source: "LinkedIn", url: "https://www.linkedin.com/jobs/" },
  { role: "Product Design Lead", company: "Razorpay", match: 89, location: "Bengaluru · Hybrid", source: "Naukri", url: "https://www.naukri.com/" },
  { role: "UX Designer II", company: "Microsoft", match: 86, location: "India · Remote", source: "Indeed", url: "https://www.indeed.com/" },
];

export default function JobPlatformsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ LinkedIn: true, Naukri: true, Indeed: true });
  const [automation, setAutomation] = useState(false);
  const [match, setMatch] = useState(85);
  const [location, setLocation] = useState("Bengaluru, Remote");
  const [workMode, setWorkMode] = useState("Remote, Hybrid");
  const [salary, setSalary] = useState("1200000");
  const [dailyLimit, setDailyLimit] = useState("5");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    
    const loadPreferences = async () => {
      try {
        const rulesDoc = await getDoc(doc(db, "application_rules", user.uid));
        if (rulesDoc.exists()) {
          const rules = rulesDoc.data();
          setAutomation(rules.enabled);
          setMatch(rules.minimum_match);
          setLocation((rules.preferred_locations || []).join(", "));
          setWorkMode((rules.work_modes || []).join(", "));
          setSalary(String(rules.minimum_salary || "1200000"));
          setDailyLimit(String(rules.daily_limit || "5"));
        }

        const prefsDoc = await getDoc(doc(db, "job_platform_preferences", user.uid));
        if (prefsDoc.exists()) {
          setEnabled(current => ({ ...current, ...prefsDoc.data() }));
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [user, authLoading]);

  const saveRules = async () => {
    if (!user) { setNotice("Sign in to save your approval rules"); return; }
    setSaving(true);
    
    const locations = location.split(",").map((item) => item.trim()).filter(Boolean);
    const modes = workMode.split(",").map((item) => item.trim()).filter(Boolean);
    
    try {
      await setDoc(doc(db, "application_rules", user.uid), {
        enabled: automation,
        minimum_match: match,
        preferred_locations: locations,
        work_modes: modes,
        minimum_salary: Math.max(0, Number(salary) || 0),
        daily_limit: Math.min(25, Math.max(1, Number(dailyLimit) || 1)),
        require_review: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, "job_platform_preferences", user.uid), {
        ...enabled,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setNotice("Approval rules saved securely");
    } catch (err) {
      console.error("Save error:", err);
      setNotice("Your rules could not be saved. Please try again.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(""), 2400);
    }
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader 
        title="Job platforms" 
        description="Bring matching roles into one review queue and stay in control of every application." 
        action={
          <Button onClick={saveRules} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 animate-spin size-4" /> : <Save className="mr-2 size-4" />} Save rules
          </Button>
        } 
      />

      <Alert className="mb-5"><Info className="size-4" /><AlertTitle>How auto-apply works</AlertTitle><AlertDescription>Matching roles are prepared for you in the Review Queue. Approve a batch with one tap: JobPilot sends every application it can on its own, and opens the rest on the official job site, which is the only way those sites allow outside applications.</AlertDescription></Alert>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
              <div>
                <h2 className="font-display text-lg font-semibold">Sources</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose where JobPilot should organize your job search.</p>
              </div>
              <span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">3 available</span>
            </div>
            <div className="divide-y divide-border">
              {platforms.map((platform) => (
                <div key={platform.name} className="grid gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
                  <div className="grid size-11 place-items-center rounded-md bg-secondary font-display text-xs font-bold text-secondary-foreground">{platform.color}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold">{platform.name}</h3>
                      <span className="rounded-sm bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">Official handoff</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{platform.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={enabled[platform.name] || false} onCheckedChange={(checked) => setEnabled((current) => ({ ...current, [platform.name]: checked }))} aria-label={`Track ${platform.name} jobs`} />
                    <Button variant="outline" size="icon" asChild>
                      <a href={platform.url} target="_blank" rel="noreferrer" aria-label={`Open ${platform.name}`}><ExternalLink className="size-4" /></a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <div className="mb-6 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <SlidersHorizontal className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">Approval rules</h2>
                <p className="mt-1 text-sm text-muted-foreground">Only roles that pass every enabled rule enter your review queue.</p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <Label htmlFor="match-score">Minimum resume match</Label>
                  <span className="font-display text-lg font-semibold text-primary">{match}%</span>
                </div>
                <Slider id="match-score" value={[match]} onValueChange={(value) => setMatch(value[0] ?? 85)} min={50} max={100} step={1} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="locations">Preferred locations</Label>
                <Input id="locations" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Bengaluru, Remote" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="work-mode">Work modes</Label>
                <Input id="work-mode" value={workMode} onChange={(event) => setWorkMode(event.target.value)} placeholder="Remote, Hybrid" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salary">Minimum annual salary (₹)</Label>
                <Input id="salary" inputMode="numeric" value={salary} onChange={(event) => setSalary(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="daily-limit">Daily review limit</Label>
                <Select value={dailyLimit} onValueChange={setDailyLimit}>
                  <SelectTrigger id="daily-limit"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3,5,10,15].map((value) => <SelectItem key={value} value={String(value)}>{value} applications</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-muted/40 p-4 sm:col-span-2">
                <span>
                  <span className="block font-semibold">Build my review queue</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Prepare tailored material only after all rules pass.</span>
                </span>
                <Switch checked={automation} onCheckedChange={setAutomation} aria-label="Build approval queue automatically" />
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg bg-primary p-6 text-primary-foreground">
            <div className="flex items-center gap-3"><Sparkles className="size-5" /><p className="text-xs font-semibold uppercase">AI matching</p></div>
            <h2 className="mt-5 font-display text-3xl font-semibold">3 strong fits</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">Ready for review based on your resume and current rules.</p>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4" /> Final submit stays with you</div>
          </section>
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-5"><h2 className="font-display font-semibold">Suggested today</h2></div>
            <div className="divide-y divide-border">
              {sampleMatches.map((job) => (
                <div key={job.company} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-semibold">{job.role}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{job.company}</p>
                    </div>
                    <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">{job.match}%</span>
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{job.location}</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                    <a href={job.url} target="_blank" rel="noreferrer">Review on {job.source}<ArrowUpRight className="ml-2 size-3" /></a>
                  </Button>
                </div>
              ))}
            </div>
          </section>
          <section className="flex items-start gap-3 rounded-lg border border-border bg-card p-5">
            <BriefcaseBusiness className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-sm font-semibold">How it works</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">JobPilot prepares your resume answers and cover letter. You review them, open the official job page, and submit there.</p>
            </div>
          </section>
        </aside>
      </div>
    </AppLayout>
  );
}
