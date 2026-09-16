import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { addDoc, collection, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export type ApplicationStatus = 'Wishlist' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';

export interface ApplicationData {
  id?: string;
  companyName: string;
  position: string;
  status: ApplicationStatus;
  dateApplied: any; // Firestore Timestamp or Date
  jobUrl?: string;
  location?: string;
  notes?: string;
}

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationToEdit?: ApplicationData | null;
  onSuccess: () => void;
}

export default function ApplicationModal({ isOpen, onClose, applicationToEdit, onSuccess }: ApplicationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    companyName: string;
    position: string;
    status: ApplicationStatus;
    dateApplied: string;
    jobUrl: string;
    location: string;
    notes: string;
  }>({
    companyName: "",
    position: "",
    status: "Applied",
    dateApplied: new Date().toISOString().split('T')[0],
    jobUrl: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (applicationToEdit) {
      let dateString = new Date().toISOString().split('T')[0];
      if (applicationToEdit.dateApplied) {
        const d = applicationToEdit.dateApplied.toDate ? applicationToEdit.dateApplied.toDate() : new Date(applicationToEdit.dateApplied);
        dateString = d.toISOString().split('T')[0];
      }

      setFormData({
        companyName: applicationToEdit.companyName,
        position: applicationToEdit.position,
        status: applicationToEdit.status,
        dateApplied: dateString,
        jobUrl: applicationToEdit.jobUrl || "",
        location: applicationToEdit.location || "",
        notes: applicationToEdit.notes || "",
      });
    } else {
      setFormData({
        companyName: "",
        position: "",
        status: "Applied",
        dateApplied: new Date().toISOString().split('T')[0],
        jobUrl: "",
        location: "",
        notes: "",
      });
    }
  }, [applicationToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const payload = {
        userId: user.uid,
        companyName: formData.companyName,
        position: formData.position,
        status: formData.status,
        dateApplied: Timestamp.fromDate(new Date(formData.dateApplied)),
        jobUrl: formData.jobUrl,
        location: formData.location,
        notes: formData.notes,
        updatedAt: Timestamp.now(),
      };

      if (applicationToEdit?.id) {
        // Update existing
        await updateDoc(doc(db, "applications", applicationToEdit.id), payload);
      } else {
        // Create new
        await addDoc(collection(db, "applications"), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving application:", error);
      alert("Failed to save application.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {applicationToEdit ? "Edit Application" : "Add Application"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Company Name *</label>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                placeholder="e.g. Google, Apple"
              />
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Position/Role *</label>
              <input
                type="text"
                name="position"
                required
                value={formData.position}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                placeholder="e.g. Frontend Developer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Status *</label>
              <select
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="Wishlist">Wishlist</option>
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Date Applied *</label>
              <input
                type="date"
                name="dateApplied"
                required
                value={formData.dateApplied}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Remote, San Francisco, CA"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Job URL</label>
              <input
                type="url"
                name="jobUrl"
                value={formData.jobUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Any additional notes about this application..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? "Saving..." : "Save Application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
