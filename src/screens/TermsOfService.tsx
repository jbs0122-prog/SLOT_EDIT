import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last Updated: February 10, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using Slot Edit (the "Service"), operated by NEWACTS, you accept and agree to be bound
              by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed">
              Slot Edit provides AI-powered outfit recommendations based on user preferences, body type, weather conditions,
              and style preferences. Our Service includes product recommendations and may contain affiliate links to
              third-party retailers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-medium text-gray-800 mb-3">3.1 Registration</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              To access certain features, you may need to create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be responsible for all activities under your account</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">3.2 Account Termination</h3>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or
              for any other reason at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Conduct</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful code or malware</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with other users' use of the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Misrepresent your affiliation with any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
            <h3 className="text-xl font-medium text-gray-800 mb-3">5.1 Our Content</h3>
            <p className="text-gray-700 leading-relaxed">
              All content on the Service, including text, graphics, logos, images, and software, is the property of
              NEWACTS or its licensors and is protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">5.2 License to Use</h3>
            <p className="text-gray-700 leading-relaxed">
              We grant you a limited, non-exclusive, non-transferable license to access and use the Service for personal,
              non-commercial purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Affiliate Relationships</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service contains affiliate links to third-party retailers. We may earn a commission from purchases
              made through these links at no additional cost to you. See our Affiliate Disclosure for more information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service may integrate with or link to third-party services. We are not responsible for the content,
              privacy practices, or terms of service of these third parties. Your interactions with third-party services
              are solely between you and the third party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-gray-700 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
              IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE MAKE NO
              WARRANTIES REGARDING THE ACCURACY OR RELIABILITY OF ANY RECOMMENDATIONS OR CONTENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEWACTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
              INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify and hold harmless NEWACTS and its officers, directors, employees, and agents from
              any claims, damages, losses, liabilities, and expenses arising out of your use of the Service or violation
              of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Modifications to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by
              posting the updated Terms on this page. Your continued use of the Service after such changes constitutes
              acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States and the
              state in which NEWACTS is registered, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-700 mt-4">
              <strong>Email:</strong> <a href="mailto:jbs0122@gmail.com" className="text-blue-600 hover:underline">jbs0122@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
