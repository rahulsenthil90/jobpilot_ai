"use client";

import { BookOpen, Calendar, GraduationCap, MapPin, Pencil, Plus, Trash } from "lucide-react";
import { useState, useEffect } from "react";
import AppLayout, { WorkspaceHeader, Notice } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Education = {
  id: string;
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
  location: string;
  description: string;
};

const EMPTY_FORM: Omit<Education, "id"> = {
  degree: "",
  institution: "",
  startYear: "",
  endYear: "",
  location: "",
  description: "",
};

export default function EducationPage() {
  const { user } = useAuth();
  const [educationList, setEducationList] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Education, "id">>(EMPTY_FORM);

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(""), 2000); };

  useEffect(() => {
    async function fetchEducation() {
      if (!user) return;
      try {
        const q = query(collection(db, "education"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const loaded = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Education));
        loaded.sort((a, b) => parseInt(b.endYear || b.startYear) - parseInt(a.endYear || a.startYear));
        setEducationList(loaded);
      } catch (err) {
        console.error("Failed to fetch education", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEducation();
  }, [user]);

  const handleOpenForm = (edu?: Education) => {
    if (edu) {
      setFormData(edu);
      setEditingId(edu.id);
    } else {
      setFormData(EMPTY_FORM);
      setEditingId(null);
    }
    setOpen(true);
  };

  const handleCloseForm = () => {
    setOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, "education", editingId), dataToSave);
        setEducationList(educationList.map(edu => edu.id === editingId ? { ...formData, id: editingId } as Education : edu));
        flash("Education updated");
      } else {
        const docRef = await addDoc(collection(db, "education"), dataToSave);
        setEducationList([{ ...formData, id: docRef.id } as Education, ...educationList].sort((a, b) => parseInt(b.endYear || b.startYear) - parseInt(a.endYear || a.startYear)));
        flash("Education added");
      }
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save education", err);
      flash("Error saving education");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this education?")) return;
    try {
      await deleteDoc(doc(db, "education", id));
      setEducationList(educationList.filter(e => e.id !== id));
      flash("Education removed");
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader 
        title="Education" 
        description="Show the academic background that supports your next move." 
        action={
          <Button onClick={() => handleOpenForm()} disabled={loading}>
            <Plus className="mr-2 size-4"/>Add education
          </Button>
        } 
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Edit education" : "Add education"}</DialogTitle>
            <DialogDescription>Add a degree, course, or academic program.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>School or university</Label>
              <Input placeholder="Institution name" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Degree</Label>
              <Input placeholder="Degree and field" value={formData.degree} onChange={(e) => setFormData({...formData, degree: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input placeholder="City, Country" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Start year</Label>
                <Input placeholder="YYYY" value={formData.startYear} onChange={(e) => setFormData({...formData, startYear: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>End year</Label>
                <Input placeholder="YYYY (or expected)" value={formData.endYear} onChange={(e) => setFormData({...formData, endYear: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea placeholder="Specialization, achievements, etc." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save education"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {educationList.length === 0 && !loading && (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
              No education history added yet.
            </div>
          )}
          
          {educationList.map(edu => (
            <section key={edu.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-start gap-4 p-6">
                <div className="grid size-12 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <GraduationCap />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold">{edu.degree}</h2>
                      <p className="mt-1 font-medium">{edu.institution}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" aria-label="Edit education" onClick={() => handleOpenForm(edu)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete education" onClick={() => handleDelete(edu.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {(edu.startYear || edu.endYear) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-4"/>{edu.startYear}–{edu.endYear || "Present"}
                      </span>
                    )}
                    {edu.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-4"/>{edu.location}
                      </span>
                    )}
                  </p>
                  {edu.description && (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{edu.description}</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        <aside className="rounded-lg border border-primary/25 bg-accent/60 p-6 h-fit">
          <BookOpen className="size-6 text-primary"/>
          <h2 className="mt-4 font-display font-semibold">Profile impact</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Your education section is complete and adds context to your experience.</p>
          <div className="mt-5 font-display text-3xl font-semibold">
            {educationList.length > 0 ? "100%" : "0%"}
          </div>
          <p className="text-xs font-semibold uppercase text-primary">
            {educationList.length > 0 ? "Complete" : "Incomplete"}
          </p>
        </aside>
      </div>
    </AppLayout>
  );
}
