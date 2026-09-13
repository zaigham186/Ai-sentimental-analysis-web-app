import Link from 'next/link';

/**
 * Site Footer Component
 */

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container-custom py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-4">About the Study</h3>
            <p className="text-sm text-gray-400">
              Research investigating anonymity in cyberbullying perpetration and its psychological correlates.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/study" 
                  className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                >
                  Study Information
                </Link>
              </li>
              <li>
                <Link 
                  href="/consent" 
                  className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                >
                  Participate
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin" 
                  className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                >
                  Admin Access
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <p className="text-sm text-gray-400 mb-2">
              Shaheed Benazir Bhutto Women University
            </p>
            <p className="text-sm text-gray-400">
              Peshawar, Pakistan
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-gray-500">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p>
              © {currentYear} Online Behavior Experiment. All rights reserved.
            </p>
            <p className="mt-2 sm:mt-0">
              Research Platform v1.0
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
