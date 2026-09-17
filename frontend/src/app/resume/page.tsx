"use client";

import AppLayout, { WorkspaceHeader, Notice } from "@/components/layout/AppLayout";
import { useState } from "react";
import ResumeTab from "@/components/resume/ResumeTab";
import PersonalDetailsTab from "@/components/resume/PersonalDetailsTab";
import ProfessionalDetailsTab from "@/components/resume/ProfessionalDetailsTab";
import SkillsTab from "@/components/resume/SkillsTab";
import ExperienceTab from "@/components/resume/ExperienceTab";
import ProjectsTab from "@/components/resume/ProjectsTab";
import PreferencesTab from "@/components/resume/PreferencesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResumeDetailsPage() {
  const [notice, setNotice] = useState("");
  
  const ping = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2200);
  };

  return (
    <AppLayout>
      <Notice>{notice}</Notice>
      <WorkspaceHeader 
        title="Resume & details" 
        description="Keep one complete profile ready for every tailored application." 
        action={
          <Button onClick={() => ping("Profile changes saved")}>
            <Check className="mr-2 h-4 w-4" /> Save changes
          </Button>
        } 
      />
      
      <Tabs defaultValue="resume">
        <TabsList className="mb-5 h-auto w-full justify-start overflow-x-auto bg-transparent p-0">
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="personal">Personal details</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="resume" className="mt-0">
          <ResumeTab ping={ping} />
        </TabsContent>
        <TabsContent value="personal" className="mt-0">
          <PersonalDetailsTab />
        </TabsContent>
        <TabsContent value="professional" className="mt-0">
          <ProfessionalDetailsTab />
        </TabsContent>
        <TabsContent value="skills" className="mt-0">
          <SkillsTab />
        </TabsContent>
        <TabsContent value="experience" className="mt-0">
          <ExperienceTab />
        </TabsContent>
        <TabsContent value="projects" className="mt-0">
          <ProjectsTab />
        </TabsContent>
        <TabsContent value="preferences" className="mt-0">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
