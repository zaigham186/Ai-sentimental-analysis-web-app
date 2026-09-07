import Link from 'next/link';

/**
 * Site Header Component
 */

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
          >
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-gray-900">
                Cyberbullying Research
              </div>
              <div className="text-xs text-gray-600">SBBWU</div>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-6">
            <Link
              href="/study"
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            >
              Study Info
            </Link>
            <Link
              href="/consent"
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            >
              Participate
            </Link>
            <Link
              href="/admin"
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
