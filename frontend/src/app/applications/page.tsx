"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ApplicationList from "@/components/applications/ApplicationList";
import ApplicationModal, { ApplicationData } from "@/components/applications/ApplicationModal";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<ApplicationData | null>(null);

  const fetchApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "applications"),
        where("userId", "==", user.uid),
        orderBy("dateApplied", "desc")
      );
      const querySnapshot = await getDocs(q);
      const appsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ApplicationData[];
      
      setApplications(appsData);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const handleAddNew = () => {
    setEditingApplication(null);
    setIsModalOpen(true);
  };

  const handleEdit = (app: ApplicationData) => {
    setEditingApplication(app);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingApplication(null), 200); // Wait for transition
  };

  const handleSuccess = () => {
    fetchApplications();
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Job Applications
            </h1>
            <p className="mt-1 text-gray-600">
              Track and manage all your job applications in one place.
            </p>
          </div>
          <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Application
          </Button>
        </div>

        {/* Stats / Filters can go here in the future */}
        
        {/* Applications List */}
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <ApplicationList 
            applications={applications} 
            onEdit={handleEdit} 
            onDeleteSuccess={handleSuccess} 
          />
        )}
        
      </div>

      <ApplicationModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        applicationToEdit={editingApplication}
        onSuccess={handleSuccess}
      />
    </AppLayout>
  );
}
