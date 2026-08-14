// src/app/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
//import { RoleBasedGuard } from '@/components/auth/RoleBasedGuard';
//import { DashboardInitializer } from '@/components/dashboard/DashboardInitializer';

interface DashboardData {
  user: any;
  permissions: any;
  dashboard: any;
  initialization: {
    timestamp: string;
    status: string;
    role: string;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (status !== 'authenticated' || !session) return;

      try {
        setLoading(true);
        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${session?.user?.id}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load dashboard');
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    // <RoleBasedGuard 
    //   permissions={dashboardData.permissions}
    //   fallback={<div>You don't have permission to access this page.</div>}
    // >
    //   <div className="min-h-screen bg-gray-50">
    //     <DashboardInitializer data={dashboardData} />
    //     {/* Your dashboard content here */}
    //   </div>
    // </RoleBasedGuard>
  );
}