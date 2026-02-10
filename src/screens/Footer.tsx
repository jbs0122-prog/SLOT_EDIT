import { Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">NEWACTS</h3>
            <p className="text-sm leading-relaxed">
              AI-powered outfit recommendations tailored to your style, body type, and weather conditions.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              <a href="mailto:jbs0122@gmail.com" className="hover:text-white transition-colors">
                jbs0122@gmail.com
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms-of-service" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#affiliate-disclosure" className="hover:text-white transition-colors">
                  Affiliate Disclosure
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Policies</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#dmca-policy" className="hover:text-white transition-colors">
                  DMCA Policy
                </a>
              </li>
              <li>
                <a href="#accessibility" className="hover:text-white transition-colors">
                  Accessibility
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Disclosure</h4>
            <p className="text-sm leading-relaxed">
              As an Amazon Associate and affiliate partner, we may earn a commission from qualifying purchases made through links on this site.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-center text-sm">
          <p>&copy; {currentYear} Slot Edit. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
