'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { Admin } from '@/types';

interface AdminLayoutProps {
  children: ReactNode;
  admin: Admin;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export function AdminLayout({ children, admin, onLogout }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊', enabled: true },
    { label: 'Participants', href: '/admin/participants', icon: '👥', enabled: true },
    { label: 'Videos', href: '/admin/videos', icon: '🎥', enabled: true },
    { label: 'Responses', href: '/admin/responses', icon: '💬', enabled: true },
    { label: 'Coding', href: '/admin/coding', icon: '🏷️', enabled: true },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈', enabled: true },
    { label: 'Export', href: '/admin/export', icon: '📥', enabled: true },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: '📜', enabled: false, comingSoon: true },
    { label: 'Settings', href: '/admin/settings', icon: '⚙️', enabled: false, comingSoon: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  SBBWU Research Admin
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{admin.name}</span>
                <span className="text-gray-500 ml-2">({admin.role})</span>
              </div>
              <Button variant="outline" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              
              if (!item.enabled) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center px-3 py-2 text-sm text-gray-400 rounded-md cursor-not-allowed"
                    title="Coming in later phase"
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                    {item.comingSoon && (
                      <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded">
                        Soon
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
