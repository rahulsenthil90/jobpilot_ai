"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PreferencesTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const [formData, setFormData] = useState({
    targetRoles: [] as string[],
    preferredLocations: [] as string[],
    workMode: [] as string[],
    minSalary: "",
    maxSalary: "",
    experienceRange: "",
    preferredIndustries: [] as string[],
  });

  const [newRole, setNewRole] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newIndustry, setNewIndustry] = useState("");

  useEffect(() => {
    async function fetchPreferences() {
      if (!user) return;
      try {
        const docRef = doc(db, "job_preferences", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            targetRoles: data.targetRoles || [],
            preferredLocations: data.preferredLocations || [],
            workMode: data.workMode || [],
            minSalary: data.minSalary || "",
            maxSalary: data.maxSalary || "",
            experienceRange: data.experienceRange || "",
            preferredIndustries: data.preferredIndustries || [],
          });
        }
      } catch (e) {
        console.error("Error fetching job preferences", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData(prev => ({ ...prev, workMode: [...prev.workMode, value] }));
    } else {
      setFormData(prev => ({ ...prev, workMode: prev.workMode.filter(m => m !== value) }));
    }
  };

  const handleAddItem = (type: 'roles' | 'locations' | 'industries', value: string, setter: (v: string) => void) => {
    const val = value.trim();
    if (!val) return;
    
    if (type === 'roles' && !formData.targetRoles.includes(val)) {
      setFormData(prev => ({ ...prev, targetRoles: [...prev.targetRoles, val] }));
    } else if (type === 'locations' && !formData.preferredLocations.includes(val)) {
      setFormData(prev => ({ ...prev, preferredLocations: [...prev.preferredLocations, val] }));
    } else if (type === 'industries' && !formData.preferredIndustries.includes(val)) {
      setFormData(prev => ({ ...prev, preferredIndustries: [...prev.preferredIndustries, val] }));
    }
    setter("");
  };

  const handleRemoveItem = (type: 'roles' | 'locations' | 'industries', val: string) => {
    if (type === 'roles') {
      setFormData(prev => ({ ...prev, targetRoles: prev.targetRoles.filter(v => v !== val) }));
    } else if (type === 'locations') {
      setFormData(prev => ({ ...prev, preferredLocations: prev.preferredLocations.filter(v => v !== val) }));
    } else if (type === 'industries') {
      setFormData(prev => ({ ...prev, preferredIndustries: prev.preferredIndustries.filter(v => v !== val) }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      await setDoc(doc(db, "job_preferences", user.uid), formData, { merge: true });
      setMessage({ text: "Job preferences saved successfully!", type: "success" });
    } catch (error) {
      console.error("Error saving job preferences", error);
      setMessage({ text: "Failed to save preferences. Please try again.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading job preferences...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Job Preferences</h2>
        <p className="text-sm text-gray-500">Let AI know exactly what kind of jobs you're looking for.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Business Analyst"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('roles', newRole, setNewRole))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="button" onClick={() => handleAddItem('roles', newRole, setNewRole)} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.targetRoles.map(role => (
                <span key={role} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {role} <button type="button" onClick={() => handleRemoveItem('roles', role)} className="text-blue-500 hover:text-blue-800">&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Locations</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Chennai, Remote"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('locations', newLocation, setNewLocation))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="button" onClick={() => handleAddItem('locations', newLocation, setNewLocation)} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.preferredLocations.map(loc => (
                <span key={loc} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  {loc} <button type="button" onClick={() => handleRemoveItem('locations', loc)} className="text-green-500 hover:text-green-800">&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Mode</label>
            <div className="flex gap-6">
              {['Remote', 'Hybrid', 'On-site'].map((mode) => (
                <label key={mode} className="flex items-center">
                  <input
                    type="checkbox"
                    value={mode}
                    checked={formData.workMode.includes(mode)}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{mode}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Salary</label>
            <input
              type="text"
              name="minSalary"
              placeholder="e.g. $80,000 or ₹15,00,000"
              value={formData.minSalary}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Salary (Optional)</label>
            <input
              type="text"
              name="maxSalary"
              placeholder="e.g. $120,000"
              value={formData.maxSalary}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level Required</label>
            <select
              name="experienceRange"
              value={formData.experienceRange}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Level</option>
              <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
              <option value="Mid Level (3-5 years)">Mid Level (3-5 years)</option>
              <option value="Senior Level (6-10 years)">Senior Level (6-10 years)</option>
              <option value="Director/Lead (10+ years)">Director/Lead (10+ years)</option>
            </select>
          </div>

          <div className="md:col-span-2 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Industries</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. FinTech, Healthcare"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('industries', newIndustry, setNewIndustry))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="button" onClick={() => handleAddItem('industries', newIndustry, setNewIndustry)} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.preferredIndustries.map(ind => (
                <span key={ind} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {ind} <button type="button" onClick={() => handleRemoveItem('industries', ind)} className="text-purple-500 hover:text-purple-800">&times;</button>
                </span>
              ))}
            </div>
          </div>

        </div>

        {message.text && (
          <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </div>
  );
}
