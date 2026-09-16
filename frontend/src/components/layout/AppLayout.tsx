"use client";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  GraduationCap, 
  Sparkles, 
  Settings, 
  LogOut,
  Menu,
  Bell
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Applications", href: "/applications", icon: Briefcase },
    { name: "Resume & Details", href: "/resume", icon: FileText },
    { name: "Education & Certifications", href: "/education-certifications", icon: GraduationCap },
    { name: "Assistance", href: "/assistance", icon: Sparkles },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <div className="text-xl font-bold text-gray-900">JobPilot AI</div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-gray-600">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Sidebar */}
        <div className={`
          ${mobileMenuOpen ? 'block' : 'hidden'} 
          md:block w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0
          absolute md:relative z-10 h-full md:min-h-screen
        `}>
          <div className="h-full flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="hidden md:flex items-center px-6 mb-8">
              <span className="text-2xl font-bold text-gray-900 tracking-tight">JobPilot AI</span>
            </div>
            <nav className="mt-2 flex-1 px-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 mt-auto">
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="group flex w-full items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-red-700" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header (Desktop only) */}
          <header className="hidden md:flex bg-white shadow-sm border-b border-gray-200 h-16 items-center justify-between px-8">
            <div className="text-gray-900 font-medium truncate">
              {/* Could put breadcrumbs or current section name here */}
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-500 hover:text-gray-700 relative">
                <Bell className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden lg:block">
                  {user?.displayName || user?.email}
                </span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
