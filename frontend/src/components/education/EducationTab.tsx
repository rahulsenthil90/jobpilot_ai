"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Education = {
  id: string;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  university: string;
  startYear: string;
  endYear: string;
  grade: string;
  location: string;
  description: string;
};

const EMPTY_FORM: Omit<Education, "id"> = {
  degree: "",
  fieldOfStudy: "",
  institution: "",
  university: "",
  startYear: "",
  endYear: "",
  grade: "",
  location: "",
  description: "",
};

export default function EducationTab() {
  const { user } = useAuth();
  const [educationList, setEducationList] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Education, "id">>(EMPTY_FORM);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenForm = (edu?: Education) => {
    if (edu) {
      setFormData(edu);
      setEditingId(edu.id);
    } else {
      setFormData(EMPTY_FORM);
      setEditingId(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      } else {
        const docRef = await addDoc(collection(db, "education"), dataToSave);
        setEducationList([{ ...formData, id: docRef.id } as Education, ...educationList].sort((a, b) => parseInt(b.endYear || b.startYear) - parseInt(a.endYear || a.startYear)));
      }
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save education", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this education record?")) return;
    try {
      await deleteDoc(doc(db, "education", id));
      setEducationList(educationList.filter(e => e.id !== id));
    } catch (err) {
      console.error("Failed to delete education", err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading education history...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Education</h2>
          <p className="text-sm text-gray-500">Add your degrees and academic qualifications.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => handleOpenForm()}>+ Add Education</Button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Education" : "Add Education"}</h3>
            <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                <input required type="text" name="degree" placeholder="e.g. Master of Computer Applications" value={formData.degree} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                <input required type="text" name="fieldOfStudy" placeholder="e.g. Computer Science" value={formData.fieldOfStudy} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                <input required type="text" name="institution" placeholder="e.g. Bishop Heber College" value={formData.institution} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                <input type="text" name="university" placeholder="e.g. Bharathidasan University" value={formData.university} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
                <input required type="number" name="startYear" placeholder="YYYY" value={formData.startYear} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Year</label>
                <input type="number" name="endYear" placeholder="YYYY (or expected)" value={formData.endYear} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade / CGPA</label>
                <input type="text" name="grade" placeholder="e.g. 8.5/10" value={formData.grade} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" name="location" placeholder="e.g. Trichy, TN" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea name="description" rows={3} placeholder="Key subjects, thesis, achievements..." value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Education"}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6 max-w-4xl relative">
        {educationList.length > 0 && <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200 z-0"></div>}
        
        {educationList.length === 0 && !isFormOpen && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No education records added yet.
          </div>
        )}

        {educationList.map(edu => (
          <div key={edu.id} className="relative pl-10">
            <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 z-10"></div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{edu.degree}</h3>
                  <div className="text-md text-blue-700 font-medium">{edu.institution} {edu.university && <span className="text-gray-500 font-normal ml-1">• {edu.university}</span>}</div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {edu.startYear} - {edu.endYear || "Present"}
                    {edu.grade && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="font-medium text-gray-700">Grade: {edu.grade}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenForm(edu)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(edu.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {edu.description && <p className="text-sm text-gray-700">{edu.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
