"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Experience = {
  id: string;
  company: string;
  jobTitle: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  location: string;
  description: string;
  responsibilities: string;
  achievements: string;
  technologies: string;
  domain: string;
};

const EMPTY_FORM: Omit<Experience, "id"> = {
  company: "",
  jobTitle: "",
  employmentType: "Full-time",
  startDate: "",
  endDate: "",
  isCurrent: false,
  location: "",
  description: "",
  responsibilities: "",
  achievements: "",
  technologies: "",
  domain: "",
};

export default function ExperienceTab() {
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Experience, "id">>(EMPTY_FORM);

  useEffect(() => {
    async function fetchExperiences() {
      if (!user) return;
      try {
        const q = query(collection(db, "experiences"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const loadedExp = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Experience));
        // Sort client-side by start date descending
        loadedExp.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setExperiences(loadedExp);
      } catch (err) {
        console.error("Failed to fetch experiences", err);
      } finally {
        setLoading(false);
      }
    }
    fetchExperiences();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked, ...(checked && name === "isCurrent" ? { endDate: "" } : {}) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenForm = (exp?: Experience) => {
    if (exp) {
      setFormData(exp);
      setEditingId(exp.id);
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
        await updateDoc(doc(db, "experiences", editingId), dataToSave);
        setExperiences(experiences.map(exp => exp.id === editingId ? { ...formData, id: editingId } as Experience : exp));
      } else {
        const docRef = await addDoc(collection(db, "experiences"), dataToSave);
        setExperiences([{ ...formData, id: docRef.id } as Experience, ...experiences].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      }
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save experience", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience record?")) return;
    try {
      await deleteDoc(doc(db, "experiences", id));
      setExperiences(experiences.filter(e => e.id !== id));
    } catch (err) {
      console.error("Failed to delete experience", err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading experience history...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Experience</h2>
          <p className="text-sm text-gray-500">Add your chronological work history.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => handleOpenForm()}>+ Add Experience</Button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Experience" : "Add Experience"}</h3>
            <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input required type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input required type="text" name="company" value={formData.company} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (YYYY-MM)</label>
                <input required type="month" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (YYYY-MM)</label>
                <input type="month" name="endDate" value={formData.endDate} onChange={handleChange} disabled={formData.isCurrent} className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100" />
                <div className="mt-2 flex items-center">
                  <input type="checkbox" id="isCurrent" name="isCurrent" checked={formData.isCurrent} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="isCurrent" className="ml-2 block text-sm text-gray-900">I currently work here</label>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" rows={2} value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                <textarea name="responsibilities" rows={3} placeholder="Use bullet points or new lines" value={formData.responsibilities} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Achievements</label>
                <textarea name="achievements" rows={2} placeholder="Metrics and quantifiable results" value={formData.achievements} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technologies/Tools</label>
                <input type="text" name="technologies" placeholder="e.g. SQL, JIRA, Python" value={formData.technologies} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input type="text" name="domain" placeholder="e.g. FinTech, Healthcare" value={formData.domain} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Experience"}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6 max-w-4xl relative">
        {/* Timeline line */}
        {experiences.length > 0 && <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200 z-0"></div>}
        
        {experiences.length === 0 && !isFormOpen && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No experience added yet. Add your professional history.
          </div>
        )}

        {experiences.map(exp => (
          <div key={exp.id} className="relative pl-10">
            {/* Timeline dot */}
            <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 z-10"></div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{exp.jobTitle}</h3>
                  <div className="text-md text-blue-700 font-medium">{exp.company} <span className="text-gray-400 font-normal ml-1">• {exp.employmentType}</span></div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate}
                    <span className="text-gray-300">|</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {exp.location}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenForm(exp)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {exp.description && <p className="text-sm text-gray-700 mb-4">{exp.description}</p>}
              
              {exp.responsibilities && (
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Responsibilities</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{exp.responsibilities}</p>
                </div>
              )}
              
              {exp.achievements && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Key Achievements</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{exp.achievements}</p>
                </div>
              )}

              {(exp.technologies || exp.domain) && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {exp.domain && <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded text-xs font-medium border border-purple-200">Domain: {exp.domain}</span>}
                  {exp.technologies && exp.technologies.split(",").map((tech, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded text-xs font-medium border border-gray-200">{tech.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
