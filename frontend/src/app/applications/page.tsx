"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout, { Notice, WorkspaceHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BriefcaseBusiness, CalendarDays, MapPin, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
                    <h2 className="font-display font-semibold">{row.position}</h2>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{row.companyName}</span>
                      {row.location && <span className="flex items-center gap-1"><MapPin className="size-3"/>{row.location}</span>}
                      <span className="flex items-center gap-1"><CalendarDays className="size-3"/>Applied {formatAge(row.dateApplied)}</span>
                    </p>
                  </div>
                  <span className="w-fit rounded-sm bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                    {row.status}
                  </span>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteApplication(row.id)}>
                    <Trash2 className="size-4" />
                  </Button>
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
