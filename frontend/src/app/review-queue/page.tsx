"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLayout, { WorkspaceHeader, Notice } from "@/components/layout/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, setDoc, doc, writeBatch, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

type QueueItem = {
  id: string;
  role: string;
  company: string;
  location: string;
  source: string;
  job_url: string;
  match_score: number;
  auto_submittable: boolean;
  status: string;
  cover_note: string;
  sent_at: string | null;
  user_id: string;
};

const candidates = [
  { role: "Senior Product Designer", company: "Atlassian", location: "Bengaluru · Hybrid", source: "LinkedIn", job_url: "https://www.linkedin.com/jobs/", match_score: 94, auto_submittable: true },
  { role: "Product Design Lead", company: "Razorpay", location: "Bengaluru · Hybrid", source: "Naukri", job_url: "https://www.naukri.com/", match_score: 89, auto_submittable: true },
  { role: "UX Designer II", company: "Microsoft", location: "India · Remote", source: "Indeed", job_url: "https://www.indeed.com/", match_score: 86, auto_submittable: false },
  { role: "Staff Product Designer", company: "Zoho", location: "Chennai · Onsite", source: "Naukri", job_url: "https://www.naukri.com/", match_score: 82, auto_submittable: false },
];

const note = (role: string, company: string) =>
  `Tailored note for the ${role} role at ${company}: highlights your design systems work, measurable product outcomes, and cross-team leadership.`;

export default function ReviewQueuePage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2600); };

  const load = async (userId: string) => {
    try {
      const q = query(
        collection(db, "application_queue"), 
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const loaded = querySnapshot.docs.map(doc => ({ ...doc.data() } as QueueItem));
      // Sort in memory since firestore requires composite index for query sorting with inequality/where
      loaded.sort((a, b) => b.match_score - a.match_score);
      setItems(loaded);
    } catch (err) {
      console.error("Failed to load queue items", err);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    
    load(user.uid).finally(() => setLoading(false));
  }, [user, authLoading]);

  const pending = useMemo(() => items.filter((item) => item.status === "pending"), [items]);
  const sent = useMemo(() => items.filter((item) => item.status === "sent"), [items]);

  const buildQueue = async () => {
    if (!user) { flash("Sign in to build your queue"); return; }
    setBusy(true);
    
    const existing = new Set(items.map((item) => `${item.company}:${item.role}`));
    const fresh = candidates
      .filter((item) => !existing.has(`${item.company}:${item.role}`))
      .map((item) => {
        const id = uuidv4();
        return { 
          ...item, 
          id, 
          user_id: user.uid, 
          status: "pending", 
          cover_note: note(item.role, item.company),
          sent_at: null 
        } as QueueItem;
      });
      
    if (fresh.length) {
      try {
        const batch = writeBatch(db);
        fresh.forEach(item => {
          batch.set(doc(db, "application_queue", item.id), item);
        });
        await batch.commit();
      } catch (err) {
        console.error("Failed to build queue", err);
      }
    }
    
    await load(user.uid);
    setBusy(false);
    flash(fresh.length ? `${fresh.length} matches prepared for your review` : "No new matches right now");
  };

  const decide = async (item: QueueItem, status: "sent" | "ready" | "skipped") => {
    if (!user) return;
    setBusy(true);
    try {
      await setDoc(doc(db, "application_queue", item.id), {
        ...item,
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null
      }, { merge: true });
      await load(user.uid);
      flash(status === "sent" ? `Application sent to ${item.company}` : status === "ready" ? `Ready to submit on ${item.source}` : "Match skipped");
    } catch (err) {
      console.error("Failed to update status", err);
      flash("Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  const approveAll = async () => {
    if (!user || pending.length === 0) return;
    setBusy(true);
    
    const auto = pending.filter((item) => item.auto_submittable);
    const manual = pending.filter((item) => !item.auto_submittable);
    
    try {
      const batch = writeBatch(db);
      
      auto.forEach(item => {
        batch.update(doc(db, "application_queue", item.id), {
          status: "sent",
          sent_at: new Date().toISOString()
        });
      });
      
      manual.forEach(item => {
        batch.update(doc(db, "application_queue", item.id), {
          status: "ready"
        });
      });
      
      await batch.commit();
      await load(user.uid);
      flash(`${auto.length} sent automatically · ${manual.length} ready to submit on the job site`);
    } catch (err) {
      console.error("Failed to approve all", err);
      flash("Failed to approve queue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader
        title="Review queue"
        description="AI prepares each application daily. Approve the batch and JobPilot sends everything it can."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={buildQueue} disabled={busy || loading}>{busy ? <Loader2 className="mr-2 animate-spin size-4" /> : <RefreshCw className="mr-2 size-4" />} Build queue</Button>
            <Button onClick={approveAll} disabled={busy || loading || pending.length === 0}><Send className="mr-2 size-4" /> Approve all</Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[[String(pending.length), "Awaiting approval"], [String(sent.length), "Sent automatically"], [String(items.filter((i) => i.status === "ready").length), "Ready on job site"]].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-display font-semibold">Prepared applications</h2>
          </div>
          <span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{items.length} total</span>
        </div>

        <div className="divide-y divide-border">
          {items.map((item) => (
            <article key={item.id} className="grid gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold">{item.role}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{item.company}</span>
                    <span className="flex items-center gap-1"><MapPin className="size-3" />{item.location}</span>
                    <span>{item.source}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">{item.match_score}%</span>
                  <span className="rounded-sm bg-secondary px-2 py-1 text-xs font-semibold capitalize text-secondary-foreground">{item.status === "sent" ? "Sent" : item.status === "ready" ? "Ready to submit" : item.status}</span>
                </div>
              </div>
              <p className="rounded-md bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">{item.cover_note}</p>
              <div className="flex flex-wrap gap-2">
                {item.status === "pending" && item.auto_submittable && (
                  <Button size="sm" onClick={() => decide(item, "sent")} disabled={busy}><Send className="mr-2 size-4" /> Approve &amp; send</Button>
                )}
                {item.status === "pending" && !item.auto_submittable && (
                  <Button size="sm" onClick={() => decide(item, "ready")} disabled={busy}><CheckCircle2 className="mr-2 size-4" /> Approve for submit</Button>
                )}
                {item.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => decide(item, "skipped")} disabled={busy}><X className="mr-2 size-4" /> Skip</Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <a href={item.job_url} target="_blank" rel="noreferrer">Open on {item.source}<ArrowUpRight className="ml-2 size-4" /></a>
                </Button>
              </div>
            </article>
          ))}

          {items.length === 0 && (
            <div className="p-12 text-center">
              <Inbox className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">Your queue is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Build today's queue to see AI-prepared applications.</p>
            </div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
