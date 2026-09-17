"use client";

import Link from "next/link";
import AppLayout, { WorkspaceHeader, Notice } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BriefcaseBusiness, Check, ChevronRight, FileText, Plus, Sparkles, WandSparkles } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [customName, setCustomName] = useState("");
  const [notice, setNotice] = useState("");
  const [recentApps, setRecentApps] = useState<any[]>([]);
  
  // Extract first name or fallback to email prefix
  const displayName = customName || (user?.displayName 
    ? user.displayName.split(" ")[0] 
    : user?.email?.split("@")[0] || "there");

  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    savedJobs: 0,
    profileCompletion: 0,
  });

  const [completionSteps, setCompletionSteps] = useState([
    { name: "Personal Details", done: false },
    { name: "Resume", done: false },
    { name: "Experience", done: false },
    { name: "Education", done: false },
    { name: "Certifications", done: false },
    { name: "Preferences", done: false },
  ]);

  const ping = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2200);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      try {
        // Fetch profile to calculate completion
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        const resumeDocs = await getDocs(query(collection(db, "resumes"), where("userId", "==", user.uid)));
        const hasResume = !resumeDocs.empty;

        const profileData = profileDoc.exists() ? profileDoc.data() : {};
        
        if (profileData.name) {
          setCustomName(profileData.name.split(" ")[0]);
        }
        
        const steps = [
          { name: "Personal Details", done: !!profileData.name && !!profileData.email },
          { name: "Resume", done: hasResume },
          { name: "Experience", done: !!profileData.experience },
          { name: "Education", done: false },
          { name: "Certifications", done: false },
          { name: "Preferences", done: !!profileData.targetRoles && !!profileData.preferredLocations },
        ];

        const completedCount = steps.filter(s => s.done).length;
        const completionPercentage = Math.round((completedCount / steps.length) * 100);

        setCompletionSteps(steps);

        // Fetch application stats
        const appDocs = await getDocs(query(collection(db, "applications"), where("userId", "==", user.uid)));
        
        let appCount = 0;
        let interviewCount = 0;
        let apps: any[] = [];

        appDocs.forEach(doc => {
          appCount++;
          const data = doc.data();
          if (data.status === "Interviewing") {
            interviewCount++;
          }
          apps.push({ id: doc.id, ...data });
        });

        // Sort apps by date
        apps.sort((a, b) => b.dateApplied.toMillis() - a.dateApplied.toMillis());
        setRecentApps(apps.slice(0, 3));

        setStats(prev => ({
          ...prev,
          applications: appCount,
          interviews: interviewCount,
          profileCompletion: completionPercentage,
        }));
        
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      }
    }
    fetchDashboardData();
  }, [user]);

  const formatAge = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (days === 0) return "Applied today";
    if (days === 1) return "Applied 1d ago";
    return `Applied ${days}d ago`;
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader 
        title={`Good morning, ${displayName}.`} 
        description={stats.interviews > 0 ? `You have ${stats.interviews} interviews in your pipeline.` : "Track applications and prepare for interviews."} 
      />
      
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <section className="dashboard-enter col-span-12 flex min-h-70 flex-col justify-between rounded-lg bg-primary p-6 text-primary-foreground lg:col-span-8 lg:p-8">
          <div>
            <span className="inline-flex rounded-sm bg-primary-foreground/15 px-2 py-1 text-xs font-semibold uppercase">Priority task</span>
            <h2 className="mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight sm:text-3xl">Complete your profile</h2>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/80 sm:text-base">A complete profile allows our AI to tailor your resumes and cover letters perfectly to each job description.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="default" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
              <Link href="/resume">Update profile <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" className="border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground" onClick={() => ping("Feature coming soon")}>View recommendations</Button>
          </div>
        </section>

        <section className="dashboard-enter col-span-12 flex flex-col rounded-lg border border-border bg-card p-6 lg:col-span-4">
          <h2 className="font-display text-lg font-semibold">Profile strength</h2>
          <div className="mx-auto mt-6 grid size-32 place-items-center rounded-full border-8 border-secondary shadow-[inset_0_0_0_4px_var(--primary)]">
            <span className="font-display text-2xl font-semibold">{stats.profileCompletion}%</span>
          </div>
          <div className="mt-6 flex justify-between text-xs font-semibold">
            <span>Certifications</span>
            <span className="text-primary">Add +15%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${stats.profileCompletion}%` }} />
          </div>
          <Button variant="secondary" className="mt-6 w-full" asChild>
            <Link href="/resume">Complete profile</Link>
          </Button>
        </section>

        <section className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Active apps</div>
            <div className="mt-1 font-display text-3xl font-semibold">{stats.applications}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Interviews</div>
            <div className="mt-1 font-display text-3xl font-semibold">{stats.interviews}</div>
          </div>
        </section>

        <section className="col-span-12 row-span-2 rounded-lg border border-border bg-card p-5 sm:p-6 lg:col-span-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Recent applications</h2>
            <Button variant="link" asChild className="px-0">
              <Link href="/applications">View all activity</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentApps.length > 0 ? recentApps.map(app => (
              <Button key={app.id} variant="outline" asChild className="h-auto w-full justify-start whitespace-normal p-0 hover:bg-muted/50">
                <Link href="/applications" className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 p-3 text-left sm:gap-4 sm:p-4">
                  <div className="grid size-10 place-items-center rounded-sm bg-secondary text-[10px] font-bold text-secondary-foreground uppercase">
                    {app.companyName.substring(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold sm:text-base">{app.position}</div>
                    <div className="truncate text-xs text-muted-foreground">{app.companyName} {app.location ? `· ${app.location}` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="rounded-sm bg-accent px-2 py-1 text-[10px] font-bold uppercase text-accent-foreground inline-block">
                      {app.status}
                    </div>
                    <div className="mt-1 hidden text-xs text-muted-foreground sm:block">
                      {formatAge(app.dateApplied)}
                    </div>
                  </div>
                </Link>
              </Button>
            )) : (
              <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                No applications yet. Start tracking your job search!
              </div>
            )}
          </div>
        </section>

        <section className="col-span-12 rounded-lg border border-border bg-card p-6 lg:col-span-4">
          <h2 className="mb-5 font-display text-lg font-semibold">Quick actions</h2>
          <div className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link href="/applications"><Plus className="mr-2 h-4 w-4" />Track new application</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/resume"><WandSparkles className="mr-2 h-4 w-4" />AI resume analysis</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => ping("Cover letter generator coming soon!")}>
              <FileText className="mr-2 h-4 w-4" />Generate cover letter
            </Button>
          </div>
        </section>

        <section className="col-span-12 rounded-lg border border-primary/25 bg-accent/60 p-5 lg:col-span-4">
          <div className="flex gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold">AI insight</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your tailored resumes receive 32% more responses.</p>
            </div>
          </div>
        </section>

        <section className="col-span-12 rounded-lg border border-border bg-card p-5 lg:col-span-8">
          <div className="grid gap-3 sm:grid-cols-3">
            {completionSteps.filter(s => s.done).slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-medium">
                <span className="grid size-5 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <Check className="size-3" />
                </span>
                {item.name} completed
              </div>
            ))}
            {completionSteps.filter(s => s.done).length === 0 && (
              <div className="col-span-3 text-sm text-muted-foreground italic">
                Complete your profile sections to see them checked off here.
              </div>
            )}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
