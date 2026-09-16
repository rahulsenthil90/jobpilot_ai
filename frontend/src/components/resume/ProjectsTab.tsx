"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Project = {
  id: string;
  name: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  responsibilities: string;
  technologies: string;
  domain: string;
};

const EMPTY_FORM: Omit<Project, "id"> = {
  name: "",
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  description: "",
  responsibilities: "",
  technologies: "",
  domain: "",
};

export default function ProjectsTab() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Project, "id">>(EMPTY_FORM);

  useEffect(() => {
    async function fetchProjects() {
      if (!user) return;
      try {
        const q = query(collection(db, "projects"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const loadedProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        loadedProjects.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setProjects(loadedProjects);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenForm = (proj?: Project) => {
    if (proj) {
      setFormData(proj);
      setEditingId(proj.id);
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
        await updateDoc(doc(db, "projects", editingId), dataToSave);
        setProjects(projects.map(p => p.id === editingId ? { ...formData, id: editingId } as Project : p));
      } else {
        const docRef = await addDoc(collection(db, "projects"), dataToSave);
        setProjects([{ ...formData, id: docRef.id } as Project, ...projects].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      }
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save project", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteDoc(doc(db, "projects", id));
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Projects</h2>
          <p className="text-sm text-gray-500">Add notable projects you've worked on.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => handleOpenForm()}>+ Add Project</Button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Project" : "Add Project"}</h3>
            <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company / Organization</label>
                <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
                <input required type="text" name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (YYYY-MM)</label>
                <input required type="month" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (YYYY-MM)</label>
                <input type="month" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required name="description" rows={2} value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities / Contribution</label>
                <textarea name="responsibilities" rows={3} placeholder="Use bullet points or new lines" value={formData.responsibilities} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technologies/Tools used</label>
                <input type="text" name="technologies" placeholder="e.g. React, Node.js, AWS" value={formData.technologies} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input type="text" name="domain" placeholder="e.g. E-commerce" value={formData.domain} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Project"}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6 max-w-4xl relative">
        {projects.length > 0 && <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200 z-0"></div>}
        
        {projects.length === 0 && !isFormOpen && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No projects added yet.
          </div>
        )}

        {projects.map(proj => (
          <div key={proj.id} className="relative pl-10">
            <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 z-10"></div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{proj.name}</h3>
                  <div className="text-md text-blue-700 font-medium">{proj.role} {proj.company && <span className="text-gray-500 font-normal ml-1">at {proj.company}</span>}</div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {proj.startDate} - {proj.endDate || "Present"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenForm(proj)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(proj.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4">{proj.description}</p>
              
              {proj.responsibilities && (
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Responsibilities</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{proj.responsibilities}</p>
                </div>
              )}

              {(proj.technologies || proj.domain) && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {proj.domain && <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded text-xs font-medium border border-purple-200">Domain: {proj.domain}</span>}
                  {proj.technologies && proj.technologies.split(",").map((tech, i) => (
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
