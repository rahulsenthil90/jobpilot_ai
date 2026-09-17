"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout, { Notice, WorkspaceHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BriefcaseBusiness, CalendarDays, MapPin, Plus, Search, SlidersHorizontal, Trash2, Zap, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp, where, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Progress } from "@/components/ui/progress";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Applied");

  // JD Analyzer state
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [activeAppForJd, setActiveAppForJd] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState("");

  const ping = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2200);
  };

  const fetchApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "applications"),
        where("userId", "==", user.uid),
        orderBy("dateApplied", "desc")
      );
      const querySnapshot = await getDocs(q);
      const appsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(appsData);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const saveApplication = async () => {
    if (!user || !companyName.trim() || !position.trim()) {
      ping("Please fill in the required fields");
      return;
    }
    
    try {
      await addDoc(collection(db, "applications"), {
        userId: user.uid,
        companyName,
        position,
        location,
        status,
        dateApplied: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      setOpen(false);
      ping("Application added to your tracker");
      setCompanyName("");
      setPosition("");
      setLocation("");
      setStatus("Applied");
      fetchApplications();
    } catch (error) {
      console.error("Error adding application", error);
      ping("Failed to add application");
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      await deleteDoc(doc(db, "applications", id));
      ping("Application deleted");
      fetchApplications();
    } catch (error) {
      console.error("Error deleting application", error);
      ping("Failed to delete application");
    }
  };

  const analyzeJobDescription = async () => {
    if (!jobDescription.trim() || !activeAppForJd) {
      ping("Please paste the job description first.");
      return;
    }
    
    setAnalyzingJd(true);
    try {
      const res = await fetch('/api/analyze/jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          applicationId: activeAppForJd.id,
          jobDescription: jobDescription
        })
      });
      
      const data = await res.json();
      if (data.success) {
        ping("Analysis complete!");
        // Update local state to show results immediately
        setApplications(apps => apps.map(app => 
          app.id === activeAppForJd.id 
            ? { ...app, matchAnalysis: data.analysis, jobDescription: jobDescription }
            : app
        ));
        setActiveAppForJd({ ...activeAppForJd, matchAnalysis: data.analysis, jobDescription: jobDescription });
      } else {
        ping(data.error || "Failed to analyze Job Description");
      }
    } catch (error) {
      console.error("Error running JD analysis:", error);
      ping("An error occurred during analysis.");
    } finally {
      setAnalyzingJd(false);
    }
  };

  const filtered = useMemo(() => {
    return applications.filter((app) => 
      (statusFilter === "all" || app.status === statusFilter) && 
      `${app.companyName} ${app.position}`.toLowerCase().includes(queryText.toLowerCase())
    );
  }, [queryText, statusFilter, applications]);

  const activeApps = applications.length;
  const inReviewApps = applications.filter(a => a.status === "Under review" || a.status === "Screening").length;
  const interviewingApps = applications.filter(a => a.status === "Interviewing").length;

  const formatAge = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return dateStr;
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader 
        title="Applications" 
        description="Track every opportunity from first click to final decision." 
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add application</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add an application</DialogTitle>
                <DialogDescription>Capture the essentials now. You can add more details later.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="company">Company <span className="text-red-500">*</span></Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
                  <Input id="role" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Job title" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote, New York, NY" />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Applied">Applied</SelectItem>
                      <SelectItem value="Screening">Screening</SelectItem>
                      <SelectItem value="Under review">Under review</SelectItem>
                      <SelectItem value="Interviewing">Interview</SelectItem>
                      <SelectItem value="Offer">Offer</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={saveApplication}>Add application</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        } 
      />
      
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          [activeApps.toString(), "Total tracked"],
          [inReviewApps.toString(), "In review"],
          [interviewingApps.toString(), "Interviews"]
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      
      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/>
            <Input className="pl-9" value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Search company or role" aria-label="Search applications" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SlidersHorizontal className="mr-2 size-4"/>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
              <SelectItem value="Screening">Screening</SelectItem>
              <SelectItem value="Under review">Under review</SelectItem>
              <SelectItem value="Interviewing">Interview</SelectItem>
              <SelectItem value="Offer">Offer</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="divide-y divide-border">
          {loading ? (
             <div className="p-12 text-center text-muted-foreground">Loading applications...</div>
          ) : (
            <>
              {filtered.map((row) => (
                <div key={row.id} className="grid gap-4 p-4 transition-colors hover:bg-muted/60 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:p-5">
                  <div className="grid size-11 place-items-center rounded-md bg-secondary text-xs font-bold uppercase text-secondary-foreground">
                    {row.companyName.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-semibold">{row.position}</h2>
                      {row.matchAnalysis && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${row.matchAnalysis.matchPercentage >= 75 ? 'bg-green-100 text-green-700' : row.matchAnalysis.matchPercentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {row.matchAnalysis.matchPercentage}% Match
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{row.companyName}</span>
                      {row.location && <span className="flex items-center gap-1"><MapPin className="size-3"/>{row.location}</span>}
                      <span className="flex items-center gap-1"><CalendarDays className="size-3"/>Applied {formatAge(row.dateApplied)}</span>
                    </p>
                  </div>
                  <span className="w-fit rounded-sm bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                    {row.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <Dialog open={activeAppForJd?.id === row.id} onOpenChange={(isOpen) => {
                      if (isOpen) {
                        setActiveAppForJd(row);
                        setJobDescription(row.jobDescription || "");
                      } else {
                        setActiveAppForJd(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                          <Zap className="mr-2 size-3 text-amber-500" />
                          {row.matchAnalysis ? "View Analysis" : "Analyze JD"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-display flex items-center gap-2">
                            <Zap className="size-5 text-amber-500" />
                            Resume vs Job Description Match
                          </DialogTitle>
                          <DialogDescription>
                            Compare your resume against the JD for {row.position} at {row.companyName}.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {!row.matchAnalysis ? (
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="jd">Paste the full Job Description here</Label>
                              <Textarea 
                                id="jd" 
                                value={jobDescription} 
                                onChange={(e) => setJobDescription(e.target.value)} 
                                placeholder="Paste job description..." 
                                className="min-h-[200px]"
                              />
                            </div>
                            <Button onClick={analyzeJobDescription} disabled={analyzingJd} className="w-full">
                              {analyzingJd ? "Analyzing with Gemini..." : "Generate AI Analysis"}
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-6 py-4">
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground">Match Score</h4>
                                <p className="text-3xl font-display font-bold mt-1">{row.matchAnalysis.matchPercentage}%</p>
                              </div>
                              <Progress value={row.matchAnalysis.matchPercentage} className="w-1/2 h-3" />
                            </div>
                            
                            {row.matchAnalysis.missingSkills && row.matchAnalysis.missingSkills.length > 0 && (
                              <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2 text-red-600">
                                  <AlertCircle className="size-4" /> Missing Keywords / Skills
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {row.matchAnalysis.missingSkills.map((skill: string, i: number) => (
                                    <span key={i} className="bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-md border border-red-200">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="font-semibold flex items-center gap-2 mb-2 text-primary">
                                <Check className="size-4" /> ATS Optimization
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {row.matchAnalysis.atsAnalysis}
                              </p>
                            </div>

                            <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-lg">
                              <h4 className="font-semibold text-amber-900 mb-2">Strategic Recommendation</h4>
                              <p className="text-sm text-amber-800 leading-relaxed">
                                {row.matchAnalysis.recommendation}
                              </p>
                            </div>
                            
                            <Button variant="outline" onClick={() => {
                              // Allow re-analyzing by clearing the analysis locally
                              const confirmReanalyze = confirm("Do you want to re-analyze with a different Job Description?");
                              if (confirmReanalyze) {
                                setActiveAppForJd({...row, matchAnalysis: null});
                                setApplications(apps => apps.map(app => 
                                  app.id === row.id ? { ...app, matchAnalysis: null } : app
                                ));
                              }
                            }} className="mt-2 text-xs h-8">
                              Re-analyze JD
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteApplication(row.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-12 text-center">
                  <BriefcaseBusiness className="mx-auto size-8 text-muted-foreground"/>
                  <p className="mt-3 font-semibold">No applications match your filters</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
