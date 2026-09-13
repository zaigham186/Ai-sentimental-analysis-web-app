'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊', enabled: true },
    { label: 'Participants', href: '/admin/participants', icon: '👥', enabled: true },
    { label: 'Videos', href: '/admin/videos', icon: '🎥', enabled: true },
    { label: 'Responses', href: '/admin/responses', icon: '💬', enabled: true },
    { label: 'Coding', href: '/admin/coding', icon: '🏷️', enabled: true },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈', enabled: true },
    { label: 'Export', href: '/admin/export', icon: '📥', enabled: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 mr-3"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open menu</span>
                {/* Hamburger icon */}
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-base sm:text-xl font-bold text-gray-900">
                  <span className="hidden sm:inline">Online Behavior Experiment Admin</span>
                  <span className="sm:hidden">Admin</span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-700 hidden sm:block">
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

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
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

        {/* Mobile Slide-out Drawer */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:hidden
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ top: '4rem' }}
        >
          <nav className="px-3 py-4 space-y-1 h-full overflow-y-auto">
            {/* Mobile user info */}
            <div className="px-3 py-3 mb-4 bg-gray-50 rounded-md">
              <div className="text-sm font-medium text-gray-900">{admin.name}</div>
              <div className="text-xs text-gray-500">{admin.role}</div>
            </div>

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
                  onClick={() => setMobileMenuOpen(false)}
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
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
