"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

export default function ResumeTab() {
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

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const storageRef = ref(storage, `resumes/${user.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(progress);
        },
        (error) => {
          console.error("Upload failed", error);
          setError("Upload failed. Please try again.");
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save resume metadata to Firestore
          const docRef = await addDoc(collection(db, "resumes"), {
            userId: user.uid,
            fileName: file.name,
            fileUrl: downloadURL,
            uploadedAt: new Date().toISOString(),
            status: "pending_analysis",
            isPrimary: resumes.length === 0 // Make first uploaded primary
          });

          setResumes([{ id: docRef.id, fileName: file.name, fileUrl: downloadURL, uploadedAt: new Date().toISOString(), isPrimary: resumes.length === 0, status: "pending_analysis" }, ...resumes]);
          setSuccess("Resume uploaded! Analyzing with AI...");
          setUploading(false);
          setFile(null);
          setProgress(0);

          // Call API route to parse it using Gemini
          try {
            const apiRes = await fetch('/api/resume/parse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                resumeId: docRef.id,
                fileUrl: downloadURL
              })
            });
            const data = await apiRes.json();
            if (data.success) {
              setSuccess("Resume successfully parsed and added to your profile!");
              // update status in UI
              setResumes(prev => prev.map(r => r.id === docRef.id ? { ...r, status: "analyzed" } : r));
            } else {
              setError(data.error || "Failed to parse resume.");
            }
          } catch (e) {
            setError("Error communicating with AI parser.");
          }
        }
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Resume Management</h2>

      <div className="mb-8 border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors">
        <input
          type="file"
          id="resume-upload"
          className="hidden"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
        />
        <label
          htmlFor="resume-upload"
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-lg font-medium text-gray-900">
            {file ? file.name : "Click to upload your resume"}
          </span>
          <span className="text-sm text-gray-500 mt-1">PDF or DOCX (Max 5MB)</span>
        </label>
        
        {file && (
          <div className="mt-6">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? `Uploading ${progress}%` : "Upload Resume"}
            </Button>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm mb-4">{success}</div>}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Resumes</h3>
        {resumes.length === 0 ? (
          <div className="text-gray-500 text-sm py-4 border-t border-gray-100">
            You haven't uploaded any resumes yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumes.map(r => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:border-blue-300 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 truncate max-w-[200px]" title={r.fileName}>{r.fileName}</h4>
                    {r.isPrimary && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">Primary</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    Uploaded: {new Date(r.uploadedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Status: <span className={r.status === 'analyzed' ? 'text-green-600' : 'text-amber-600'}>{r.status === 'analyzed' ? '✓ Analyzed' : 'Pending'}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(r.fileUrl, '_blank')}>View</Button>
                  {!r.isPrimary && <Button variant="outline" size="sm" className="w-full">Make Primary</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
