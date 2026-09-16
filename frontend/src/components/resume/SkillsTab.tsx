"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Skill = {
  id: string;
  name: string;
  category: string;
  proficiency: string;
};

const CATEGORIES = ["Business Analysis", "Technical", "Tools", "Other"];
const PROFICIENCIES = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function SkillsTab() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [newSkill, setNewSkill] = useState({
    name: "",
    category: "Business Analysis",
    proficiency: "Intermediate"
  });

  useEffect(() => {
    async function fetchSkills() {
      if (!user) return;
      try {
        const q = query(collection(db, "skills"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const loadedSkills = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Skill));
        setSkills(loadedSkills);
      } catch (err) {
        console.error("Failed to fetch skills", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, [user]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSkill.name.trim()) return;
    setAdding(true);
    try {
      const docRef = await addDoc(collection(db, "skills"), {
        userId: user.uid,
        name: newSkill.name.trim(),
        category: newSkill.category,
        proficiency: newSkill.proficiency,
        createdAt: new Date().toISOString()
      });
      setSkills([...skills, { id: docRef.id, name: newSkill.name.trim(), category: newSkill.category, proficiency: newSkill.proficiency }]);
      setNewSkill({ name: "", category: "Business Analysis", proficiency: "Intermediate" });
    } catch (err) {
      console.error("Failed to add skill", err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSkill = async (id: string) => {
    try {
      await deleteDoc(doc(db, "skills", id));
      setSkills(skills.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to remove skill", err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading skills...</div>;
  }

  // Group skills by category
  const groupedSkills = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = skills.filter(s => s.category === cat);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Skills</h2>
        <p className="text-sm text-gray-500">Manage your skills and proficiency levels.</p>
      </div>

      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-8 max-w-4xl">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Skill</h3>
        <form onSubmit={handleAddSkill} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-700 mb-1">Skill Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Requirement Gathering"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={newSkill.category}
              onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs font-medium text-gray-700 mb-1">Proficiency</label>
            <select
              value={newSkill.proficiency}
              onChange={(e) => setNewSkill({ ...newSkill, proficiency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {PROFICIENCIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={adding} className="w-full md:w-auto">
            {adding ? "Adding..." : "Add"}
          </Button>
        </form>
      </div>

      <div className="space-y-8 max-w-4xl">
        {CATEGORIES.map(category => {
          const categorySkills = groupedSkills[category];
          if (categorySkills.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorySkills.map(skill => (
                  <div key={skill.id} className="border border-gray-200 rounded-md p-3 flex justify-between items-center bg-white shadow-sm hover:border-blue-300 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{skill.name}</p>
                      <p className="text-xs text-gray-500">{skill.proficiency}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove skill"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {skills.length === 0 && (
          <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No skills added yet. Use the form above to add your first skill.
          </div>
        )}
      </div>
    </div>
  );
}
