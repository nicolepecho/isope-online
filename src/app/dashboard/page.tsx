"use client";

import OrgsDashboard from '@/app/ui/snippets/dashboard';
import NotificationSidebar from '../ui/notifbar';

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      {/* Main Dashboard */}
      <div className="flex-1 w-full sm:w-auto max-w-md sm:max-w-5xl mx-auto px-4 pt-6">
        <OrgsDashboard />
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden lg:block w-72 border-l border-gray-200">
        <NotificationSidebar />
      </div>

      {/* Sidebar and overlay for mobile */}
      <div className="lg:hidden">
        <NotificationSidebar />
      </div>
    </div>
  );
}
