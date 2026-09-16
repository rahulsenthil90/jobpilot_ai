"use client";

import AppLayout from "@/components/layout/AppLayout";
import { useState } from "react";
import ResumeTab from "@/components/resume/ResumeTab";
import PersonalDetailsTab from "@/components/resume/PersonalDetailsTab";
import ProfessionalDetailsTab from "@/components/resume/ProfessionalDetailsTab";
import SkillsTab from "@/components/resume/SkillsTab";
import ExperienceTab from "@/components/resume/ExperienceTab";
import ProjectsTab from "@/components/resume/ProjectsTab";
import PreferencesTab from "@/components/resume/PreferencesTab";

const tabs = [
  { id: "resume", name: "Resume" },
  { id: "personal", name: "Personal Details" },
  { id: "professional", name: "Professional Details" },
  { id: "skills", name: "Skills" },
  { id: "experience", name: "Experience" },
  { id: "projects", name: "Projects" },
  { id: "preferences", name: "Preferences" },
];

export default function ResumeDetailsPage() {
  const [activeTab, setActiveTab] = useState("resume");

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Resume & Details</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your resume, skills, and professional experience here.
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
          {activeTab === "resume" && <ResumeTab />}
          {activeTab === "personal" && <PersonalDetailsTab />}
          {activeTab === "professional" && <ProfessionalDetailsTab />}
          {activeTab === "skills" && <SkillsTab />}
          {activeTab === "experience" && <ExperienceTab />}
          {activeTab === "projects" && <ProjectsTab />}
          {activeTab === "preferences" && <PreferencesTab />}
        </div>
      </div>
    </AppLayout>
  );
}
