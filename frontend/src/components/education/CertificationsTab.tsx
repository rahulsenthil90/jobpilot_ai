"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
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

export default function CertificationsTab() {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Certification, "id">>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFile(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      let finalFileUrl = formData.fileUrl;
      let finalFileName = formData.fileName;

      // Handle file upload if present
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
      } else {
        const docRef = await addDoc(collection(db, "certifications"), dataToSave);
        setCertifications([{ ...dataToSave, id: docRef.id } as Certification, ...certifications].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
      }
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save certification", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this certification?")) return;
    try {
      await deleteDoc(doc(db, "certifications", id));
      setCertifications(certifications.filter(e => e.id !== id));
    } catch (err) {
      console.error("Failed to delete certification", err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading certifications...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Certifications</h2>
          <p className="text-sm text-gray-500">Add your professional certifications and licenses.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => handleOpenForm()}>+ Add Certification</Button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Certification" : "Add Certification"}</h3>
            <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certification Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization</label>
                <input required type="text" name="organization" value={formData.organization} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date (YYYY-MM)</label>
                <input required type="month" name="issueDate" value={formData.issueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date (Optional)</label>
                <input type="month" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
                <input type="text" name="credentialId" value={formData.credentialId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credential URL</label>
                <input type="url" name="credentialUrl" placeholder="https://..." value={formData.credentialUrl} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea name="description" rows={2} value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate File (PDF, JPG, PNG)</label>
                <input 
                  type="file" 
                  accept=".pdf,image/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" 
                />
                {(formData.fileName || file) && (
                  <p className="text-xs text-gray-500 mt-1">Current file: {file?.name || formData.fileName}</p>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Certification"}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {certifications.length === 0 && !isFormOpen && (
          <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No certifications added yet.
          </div>
        )}

        {certifications.map(cert => (
          <div key={cert.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-900">{cert.name}</h3>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => handleOpenForm(cert)} className="text-gray-400 hover:text-blue-600 p-1" title="Edit">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(cert.id)} className="text-gray-400 hover:text-red-600 p-1" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div className="text-md text-blue-700 font-medium mb-4">{cert.organization}</div>
              
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p><span className="text-gray-500 w-16 inline-block">Issued:</span> {cert.issueDate}</p>
                {cert.expirationDate && <p><span className="text-gray-500 w-16 inline-block">Expires:</span> {cert.expirationDate}</p>}
                {cert.credentialId && <p><span className="text-gray-500 w-16 inline-block">ID:</span> {cert.credentialId}</p>}
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              {cert.credentialUrl && (
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => window.open(cert.credentialUrl, "_blank")}>
                  View Credential
                </Button>
              )}
              {cert.fileUrl && (
                <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => window.open(cert.fileUrl, "_blank")}>
                  View File
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
