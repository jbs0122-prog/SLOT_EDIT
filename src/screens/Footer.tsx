import { Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          <div className="col-span-2 md:col-span-1 space-y-3 md:space-y-4">
            <h3 className="text-white font-semibold text-base md:text-lg">NEWACTS</h3>
            <p className="text-xs md:text-sm leading-relaxed">
              AI-powered outfit recommendations tailored to your style, body type, and weather conditions.
            </p>
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <Mail className="w-3 h-3 md:w-4 md:h-4" />
              <a href="mailto:jbs0122@gmail.com" className="hover:text-white transition-colors">
                jbs0122@gmail.com
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 md:mb-4 text-sm md:text-base">Legal</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
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
            <h4 className="text-white font-semibold mb-3 md:mb-4 text-sm md:text-base">Policies</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
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

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-white font-semibold mb-3 md:mb-4 text-sm md:text-base">Disclosure</h4>
            <p className="text-xs md:text-sm leading-relaxed">
              As an Amazon Associate and affiliate partner, we may earn a commission from qualifying purchases made through links on this site.
            </p>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-gray-800 text-center text-xs md:text-sm">
          <p>&copy; {currentYear} Slot Edit. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
