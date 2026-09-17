"use client";

import { Award, Calendar, CheckCircle2, ExternalLink, Plus, Pencil, Trash, Link as LinkIcon, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import AppLayout, { WorkspaceHeader, Notice } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

type Certification = {
  id: string;
  name: string;
  organization: string;
  issueDate: string;
  expirationDate: string;
  credentialId: string;
  credentialUrl: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
};

const EMPTY_FORM: Omit<Certification, "id"> = {
  name: "",
  organization: "",
  issueDate: "",
  expirationDate: "",
  credentialId: "",
  credentialUrl: "",
  description: "",
};

export default function CertificationsPage() {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Certification, "id">>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const ping = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 2100); };

  useEffect(() => {
    async function fetchCerts() {
      if (!user) return;
      try {
        const q = query(collection(db, "certifications"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const loaded = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certification));
        loaded.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        setCertifications(loaded);
      } catch (err) {
        console.error("Failed to fetch certifications", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCerts();
  }, [user]);

  const handleOpenForm = (cert?: Certification) => {
    if (cert) {
      setFormData(cert);
      setEditingId(cert.id);
    } else {
      setFormData(EMPTY_FORM);
      setEditingId(null);
    }
    setFile(null);
    setUploadProgress(0);
    setOpen(true);
  };

  const handleCloseForm = () => {
    setOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFile(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      let finalFileUrl = formData.fileUrl;
      let finalFileName = formData.fileName;

      if (file) {
        const storageRef = ref(storage, `certifications/${user.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
            },
            reject,
            async () => {
              finalFileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              finalFileName = file.name;
              resolve();
            }
          );
        });
      }

      const dataToSave = {
        ...formData,
        userId: user.uid,
        fileUrl: finalFileUrl || null,
        fileName: finalFileName || null,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, "certifications", editingId), dataToSave);
        setCertifications(certifications.map(c => c.id === editingId ? { ...dataToSave, id: editingId } as Certification : c));
        ping("Certification updated");
      } else {
        const docRef = await addDoc(collection(db, "certifications"), dataToSave);
        setCertifications([{ ...dataToSave, id: docRef.id } as Certification, ...certifications].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
        ping("Certification added");
      }
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save certification", err);
      ping("Failed to save certification");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this certification?")) return;
    try {
      await deleteDoc(doc(db, "certifications", id));
      setCertifications(certifications.filter(e => e.id !== id));
      ping("Certification removed");
    } catch (err) {
      console.error("Failed to delete certification", err);
    }
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader 
        title="Certifications" 
        description="Keep trusted credentials visible and ready for recruiters." 
        action={
          <Button onClick={() => handleOpenForm()} disabled={loading}>
            <Plus className="mr-2 size-4" />Add certification
          </Button>
        } 
      />

      <Dialog open={open} onOpenChange={(val) => { if (!val) handleCloseForm(); else setOpen(val); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Edit certification" : "Add certification"}</DialogTitle>
            <DialogDescription>Add a credential that supports your expertise.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Certification name</Label>
              <Input placeholder="e.g. Google UX Design" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Issuing organization</Label>
              <Input placeholder="Organization" value={formData.organization} onChange={(e) => setFormData({...formData, organization: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Issue Date</Label>
                <Input type="month" value={formData.issueDate} onChange={(e) => setFormData({...formData, issueDate: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>Expiration Date</Label>
                <Input type="month" value={formData.expirationDate} onChange={(e) => setFormData({...formData, expirationDate: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Credential ID</Label>
              <Input placeholder="ID..." value={formData.credentialId} onChange={(e) => setFormData({...formData, credentialId: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Credential URL</Label>
              <Input placeholder="https://" value={formData.credentialUrl} onChange={(e) => setFormData({...formData, credentialUrl: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Certificate File</Label>
              <Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {(formData.fileName || file) && (
                <p className="text-xs text-muted-foreground mt-1">Current file: {file?.name || formData.fileName}</p>
              )}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save certification"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {certifications.length === 0 && !loading && (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
            No certifications added yet.
          </div>
        )}

        {certifications.map((cert, index) => (
          <section key={cert.id} className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <div className={`grid size-12 place-items-center rounded-md ${index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              <Award />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold truncate">{cert.name}</h2>
                <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="Verified" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground truncate">{cert.organization}</p>
              <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {cert.issueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />Issued {cert.issueDate}
                  </span>
                )}
                {cert.credentialId && (
                  <span>Credential {cert.credentialId}</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 shrink-0 mr-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenForm(cert)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(cert.id)}>
                  <Trash className="size-4" />
                </Button>
              </div>
              {cert.credentialUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={cert.credentialUrl} target="_blank" rel="noreferrer">Link <LinkIcon className="ml-2 size-3"/></a>
                </Button>
              )}
              {cert.fileUrl && (
                <Button variant="secondary" size="sm" asChild>
                  <a href={cert.fileUrl} target="_blank" rel="noreferrer">File <FileText className="ml-2 size-3"/></a>
                </Button>
              )}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}
