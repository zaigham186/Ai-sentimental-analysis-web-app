'use client';

import AdminLoginPage from './login/page';

/**
 * Admin Root Page (/admin)
 * Immediately displays the Admin Login Form.
 * NO automatic loading of the Admin Dashboard.
 */
export default function AdminRootPage() {
  return <AdminLoginPage />;
}
