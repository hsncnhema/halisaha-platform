'use client';

import { useState, type ReactNode } from 'react';
import AppNavbar from '@/components/AppNavbar';
import Sidebar from '@/components/Sidebar';

export default function LayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col md:pl-56">
        <AppNavbar onToggle={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
