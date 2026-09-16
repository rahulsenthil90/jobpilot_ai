import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApplicationData, ApplicationStatus } from "./ApplicationModal";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ApplicationListProps {
  applications: ApplicationData[];
  onEdit: (app: ApplicationData) => void;
  onDeleteSuccess: () => void;
}

export default function ApplicationList({ applications, onEdit, onDeleteSuccess }: ApplicationListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "applications", id));
      onDeleteSuccess();
    } catch (error) {
      console.error("Error deleting application:", error);
      alert("Failed to delete application.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "Wishlist":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">Wishlist</span>;
      case "Applied":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">Applied</span>;
      case "Interviewing":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">Interviewing</span>;
      case "Offer":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">Offer</span>;
      case "Rejected":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  if (applications.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No applications yet</h3>
        <p className="text-gray-500 mb-4">Keep track of your job search by adding your first application.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm">
              <th className="p-4 font-semibold text-gray-600">Company & Role</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Date Applied</th>
              <th className="p-4 font-semibold text-gray-600">Location</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{app.position}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{app.companyName}</span>
                      {app.jobUrl && (
                        <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap">
                  {getStatusBadge(app.status)}
                </td>
                <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(app.dateApplied)}
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {app.location || <span className="text-gray-400 italic">Not specified</span>}
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(app)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => app.id && handleDelete(app.id)}
                      disabled={deletingId === app.id}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      {deletingId === app.id ? (
                        <div className="w-4 h-4 rounded-full border-2 border-red-600 border-t-transparent animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
