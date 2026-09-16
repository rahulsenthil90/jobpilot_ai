"use client";

import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Extract first name or fallback to email prefix
  const displayName = user?.displayName 
    ? user.displayName.split(" ")[0] 
    : user?.email?.split("@")[0] || "there";

  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    savedJobs: 0,
    profileCompletion: 0,
  });

  const [completionSteps, setCompletionSteps] = useState([
    { name: "Personal Details", done: false },
    { name: "Resume", done: false },
    { name: "Experience", done: false },
    { name: "Education", done: false },
    { name: "Certifications", done: false },
    { name: "Preferences", done: false },
  ]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      try {
        // Fetch profile to calculate completion
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        const resumeDocs = await getDocs(query(collection(db, "resumes"), where("userId", "==", user.uid)));
        const hasResume = !resumeDocs.empty;

        const profileData = profileDoc.exists() ? profileDoc.data() : {};
        
        const steps = [
          { name: "Personal Details", done: !!profileData.name && !!profileData.email },
          { name: "Resume", done: hasResume },
          { name: "Experience", done: !!profileData.experience },
          { name: "Education", done: false }, // to be implemented with subcollections later
          { name: "Certifications", done: false }, // to be implemented
          { name: "Preferences", done: !!profileData.targetRoles && !!profileData.preferredLocations },
        ];

        const completedCount = steps.filter(s => s.done).length;
        const completionPercentage = Math.round((completedCount / steps.length) * 100);

        setCompletionSteps(steps);
        setStats(prev => ({
          ...prev,
          profileCompletion: completionPercentage,
        }));

        // Fetch application stats
        const appDocs = await getDocs(query(collection(db, "applications"), where("userId", "==", user.uid)));
        
        let appCount = 0;
        let interviewCount = 0;

        appDocs.forEach(doc => {
          appCount++;
          const data = doc.data();
          if (data.status === "Interviewing") {
            interviewCount++;
          }
        });

        setStats(prev => ({
          ...prev,
          applications: appCount,
          interviews: interviewCount,
          profileCompletion: completionPercentage,
        }));
        
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      }
    }
    fetchDashboardData();
  }, [user]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        
        {/* Header section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Good evening, {displayName} 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's your application profile at a glance.
          </p>
        </div>

        {/* Profile Completion Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Profile Completion</h2>
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {stats.profileCompletion}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${stats.profileCompletion}%` }}
            ></div>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            {stats.profileCompletion === 100 
              ? "Your profile is fully complete! You're ready to start applying." 
              : "You're almost ready to start applying."}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {completionSteps.map((step) => (
              <div key={step.name} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                )}
                <span className={step.done ? "text-gray-900" : "text-gray-500"}>{step.name}</span>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full sm:w-auto">Complete Profile</Button>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Applications</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.applications}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Interviews</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.interviews}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Saved Jobs</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.savedJobs}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Profile</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.profileCompletion}%</p>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
          </div>
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>You haven't added any applications yet.</p>
          </div>
          <div className="bg-gray-50 p-4 border-t border-gray-200 text-center">
            <Button variant="link" className="text-blue-600">View All Applications</Button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
