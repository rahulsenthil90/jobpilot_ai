"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

import { Check, FileCheck2, FileText, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export default function ResumeTab({ ping = (msg: string) => {} }: { ping?: (msg: string) => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resumes, setResumes] = useState<any[]>([]);

  useEffect(() => {
    async function fetchResumes() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "resumes"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const loadedResumes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side if index not ready
        loadedResumes.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setResumes(loadedResumes);
      } catch (err) {
        console.error("Failed to fetch resumes", err);
      }
    }
    fetchResumes();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".docx")) {
        setError("Only PDF and DOCX files are supported.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
      setSuccess("");
    }
  };

  const handleUpload = async (fileToUpload?: File) => {
    const targetFile = fileToUpload || file;
    if (!targetFile || !user) return;
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      // Simulate progress for UI
      const progressInterval = setInterval(() => {
        setProgress(p => (p < 90 ? p + 10 : p));
      }, 300);

      // Save resume metadata to Firestore (no fileUrl since it's memory-only)
      const docRef = await addDoc(collection(db, "resumes"), {
        userId: user.uid,
        fileName: targetFile.name,
        fileUrl: "", 
        uploadedAt: new Date().toISOString(),
        status: "pending_analysis",
        isPrimary: resumes.length === 0
      });

      setResumes([{ id: docRef.id, fileName: targetFile.name, fileUrl: "", uploadedAt: new Date().toISOString(), isPrimary: resumes.length === 0, status: "pending_analysis" }, ...resumes]);
      setSuccess("Resume uploaded! Analyzing with AI...");
      ping("Resume uploaded successfully! Analyzing...");

      // Prepare FormData
      const formData = new FormData();
      formData.append("userId", user.uid);
      formData.append("resumeId", docRef.id);
      formData.append("fileName", targetFile.name);
      formData.append("file", targetFile);

      // Call API route to parse it using Gemini directly
      const apiRes = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      setUploading(false);
      setFile(null);

      const data = await apiRes.json();
      if (data.success) {
        setSuccess("Resume successfully parsed and added to your profile!");
        ping("AI Analysis complete");
        setResumes(prev => prev.map(r => r.id === docRef.id ? { ...r, status: "analyzed", parsedData: data.parsedData, resumeScore: data.parsedData.resumeScore, scoreFeedback: data.parsedData.scoreFeedback } : r));
      } else {
        setError(data.error || "Failed to parse resume.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
      setUploading(false);
    }
  };

  const primaryResume = resumes.find(r => r.isPrimary) || resumes[0];

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6">
        
        {primaryResume ? (
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
              <FileText />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words font-display text-base font-semibold sm:text-lg truncate max-w-full">
                {primaryResume.fileName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Uploaded {new Date(primaryResume.uploadedAt).toLocaleDateString()}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  type="file"
                  id="resume-upload-replace"
                  className="hidden"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onClick={(e) => { (e.target as HTMLInputElement).value = "" }}
                  onChange={(e) => { 
                    handleFileChange(e); 
                  }}
                />
                <label htmlFor="resume-upload-replace">
                  <Button variant="outline" asChild onClick={() => ping("Choose a new resume file")}>
                    <span><Upload className="mr-2 h-4 w-4" /> {file ? "Change selected file" : "Replace file"}</span>
                  </Button>
                </label>
                {file && (
                  <Button onClick={() => handleUpload()} disabled={uploading}>
                    {uploading ? `Uploading & Analyzing ${progress}%` : `Upload & Analyze ${file.name}`}
                  </Button>
                )}
                {!file && primaryResume.fileUrl && (
                  <Button variant="secondary" onClick={() => { ping("Resume opened for review"); window.open(primaryResume.fileUrl, '_blank'); }}>
                    <FileCheck2 className="mr-2 h-4 w-4" /> Preview
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-10 text-center hover:bg-muted/50 transition-colors">
            <input
              type="file"
              id="resume-upload-new"
              className="hidden"
              accept=".pdf,.docx"
              onClick={(e) => { (e.target as HTMLInputElement).value = "" }}
              onChange={(e) => { handleFileChange(e); }}
            />
            <label htmlFor="resume-upload-new" className="cursor-pointer flex flex-col items-center justify-center">
              <Upload className="w-12 h-12 text-muted-foreground mb-4" />
              <span className="text-lg font-medium text-foreground">
                {file ? file.name : "Click to upload your resume"}
              </span>
              <span className="text-sm text-muted-foreground mt-1">PDF or DOCX (Max 5MB)</span>
            </label>
            {file && (
              <div className="mt-6">
                <Button onClick={() => handleUpload()} disabled={uploading}>
                  {uploading ? `Uploading ${progress}%` : "Upload Resume"}
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-4 text-sm font-medium text-destructive">{error}</div>}
        {success && <div className="mt-4 text-sm font-medium text-green-600">{success}</div>}

        <div className="my-6 border-t border-border" />
        
        <h3 className="font-display font-semibold">Resume summary</h3>
        <Textarea 
          className="mt-3 min-h-32" 
          readOnly
          value={primaryResume?.parsedData?.executiveSummary || (primaryResume?.status === 'analyzed' ? 'No summary generated.' : 'Awaiting AI analysis. Once your resume is analyzed, a summary of your professional profile will appear here.')} 
        />
        
        {resumes.length > 1 && (
          <div className="mt-8">
            <h3 className="font-display font-semibold mb-4 text-muted-foreground">Other uploaded resumes</h3>
            <div className="grid gap-3">
              {resumes.filter(r => r.id !== primaryResume?.id).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{r.fileName}</span>
                  </div>
                  {r.fileUrl && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(r.fileUrl, '_blank')}>View</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="rounded-lg border border-border bg-card p-6 h-fit">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold">Resume score</h2>
          <span className="font-display text-xl font-semibold text-primary">
            {primaryResume?.status === "analyzed" ? `${primaryResume?.resumeScore || 0}%` : "N/A"}
          </span>
        </div>
        <Progress value={primaryResume?.status === "analyzed" ? (primaryResume?.resumeScore || 0) : 0} className="mt-3" />
        
        <div className="mt-6 space-y-4">
          {(primaryResume?.scoreFeedback?.length > 0 
            ? primaryResume.scoreFeedback 
            : ["Clear impact metrics", "Strong action verbs", "Relevant design skills"]
          ).map((item: string, idx: number) => (
            <div key={idx} className="flex gap-2 text-sm text-muted-foreground">
              <span className={`grid size-5 shrink-0 place-items-center rounded-full ${primaryResume?.status === "analyzed" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Check className="size-3" />
              </span>
              {item}
            </div>
          ))}
        </div>
        <Button className="mt-6 w-full" disabled={!primaryResume} onClick={() => ping("AI resume review started")}>
          Review with AI
        </Button>
      </aside>
    </div>
  );
}
