"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ProfessionalDetailsTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const [formData, setFormData] = useState({
    currentJobTitle: "",
    targetRoles: [] as string[],
    totalExperience: "",
    relevantExperience: "",
    currentCompany: "",
    previousCompany: "",
    noticePeriod: "",
    currentCTC: "",
    expectedCTC: "",
  });

  const [newTargetRole, setNewTargetRole] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            currentJobTitle: data.currentJobTitle || "",
            targetRoles: Array.isArray(data.targetRoles) ? data.targetRoles : (data.targetRoles ? data.targetRoles.split(",").map((s: string) => s.trim()) : []),
            totalExperience: data.totalExperience || data.experience || "",
            relevantExperience: data.relevantExperience || "",
            currentCompany: data.currentCompany || "",
            previousCompany: data.previousCompany || "",
            noticePeriod: data.noticePeriod || "",
            currentCTC: data.currentCTC || "",
            expectedCTC: data.expectedCTC || "",
          });
        }
      } catch (e) {
        console.error("Error fetching professional details", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTargetRole = () => {
    if (newTargetRole.trim() && !formData.targetRoles.includes(newTargetRole.trim())) {
      setFormData(prev => ({
        ...prev,
        targetRoles: [...prev.targetRoles, newTargetRole.trim()]
      }));
      setNewTargetRole("");
    }
  };

  const handleRemoveTargetRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.filter(r => r !== role)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      await setDoc(doc(db, "profiles", user.uid), formData, { merge: true });
      setMessage({ text: "Professional details saved successfully!", type: "success" });
    } catch (error) {
      console.error("Error saving professional details", error);
      setMessage({ text: "Failed to save changes. Please try again.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    }
  };

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading professional details...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Professional Details</h2>
        <p className="text-sm text-gray-500">Add your current employment details and career goals.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Job Title</label>
            <input
              type="text"
              name="currentJobTitle"
              placeholder="e.g. Business Analyst"
              value={formData.currentJobTitle}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
            <select
              name="noticePeriod"
              value={formData.noticePeriod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Notice Period</option>
              <option value="Immediate">Immediate / Serving Notice</option>
              <option value="15 Days">15 Days</option>
              <option value="1 Month">1 Month</option>
              <option value="2 Months">2 Months</option>
              <option value="3 Months">3 Months</option>
              <option value="More than 3 Months">More than 3 Months</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Product Analyst"
                value={newTargetRole}
                onChange={(e) => setNewTargetRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTargetRole())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="button" onClick={handleAddTargetRole} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.targetRoles.map(role => (
                <span key={role} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {role}
                  <button type="button" onClick={() => handleRemoveTargetRole(role)} className="text-blue-500 hover:text-blue-800">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Experience (Years)</label>
            <input
              type="number"
              name="totalExperience"
              step="0.1"
              value={formData.totalExperience}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relevant Experience (Years)</label>
            <input
              type="number"
              name="relevantExperience"
              step="0.1"
              value={formData.relevantExperience}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
            <input
              type="text"
              name="currentCompany"
              value={formData.currentCompany}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Previous Company</label>
            <input
              type="text"
              name="previousCompany"
              value={formData.previousCompany}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current CTC</label>
            <input
              type="text"
              name="currentCTC"
              placeholder="e.g. $80,000"
              value={formData.currentCTC}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected CTC</label>
            <input
              type="text"
              name="expectedCTC"
              placeholder="e.g. $100,000"
              value={formData.expectedCTC}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {message.text && (
          <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
