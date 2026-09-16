"use client";

import AppLayout from "@/components/layout/AppLayout";
import { useState } from "react";
import EducationTab from "@/components/education/EducationTab";
import CertificationsTab from "@/components/education/CertificationsTab";

const tabs = [
  { id: "education", name: "Education" },
  { id: "certifications", name: "Certifications" },
];

export default function EducationCertificationsPage() {
  const [activeTab, setActiveTab] = useState("education");

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Education & Certifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your academic history and professional certifications.
          </p>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Tabs Select */}
        <div className="md:hidden mb-6">
          <label htmlFor="tabs" className="sr-only">Select a tab</label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.name}</option>
            ))}
          </select>
        </div>

        {/* Tab Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === "education" && <EducationTab />}
          {activeTab === "certifications" && <CertificationsTab />}
        </div>
      </div>
    </AppLayout>
  );
}
