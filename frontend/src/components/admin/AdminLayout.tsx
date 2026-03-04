import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <AdminSidebar />
      {/* Main content - offset by collapsed sidebar width (68px) */}
      <div className="ml-[68px] flex min-h-screen flex-col">
        <AdminTopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
