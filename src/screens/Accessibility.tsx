import { ArrowLeft } from 'lucide-react';

export default function Accessibility() {
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

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Accessibility Statement</h1>
        <p className="text-gray-600 mb-8">Last Updated: February 10, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-gray-700 leading-relaxed">
              NEWACTS is committed to ensuring digital accessibility for people with disabilities. We are continually
              improving the user experience for everyone and applying the relevant accessibility standards to ensure
              Slot Edit is accessible to all users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Conformance Status</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA standards. These
              guidelines explain how to make web content more accessible for people with disabilities, and user-friendly
              for everyone.
            </p>
            <p className="text-gray-700 leading-relaxed">
              While we strive to adhere to the accepted guidelines and standards for accessibility and usability, it is
              not always possible to do so in all areas of the website. We are continuously seeking solutions to bring
              all areas of the site up to the same level of overall accessibility.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Accessibility Features</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our website includes the following accessibility features:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Semantic HTML structure for proper screen reader navigation</li>
              <li>Keyboard navigation support throughout the site</li>
              <li>Alternative text for images</li>
              <li>Sufficient color contrast for text readability</li>
              <li>Responsive design for various screen sizes and devices</li>
              <li>Clear and consistent navigation</li>
              <li>Descriptive links and buttons</li>
              <li>Form labels and error messages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Assistive Technologies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Slot Edit is designed to be compatible with the following assistive technologies:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Screen readers (JAWS, NVDA, VoiceOver, TalkBack)</li>
              <li>Screen magnification software</li>
              <li>Speech recognition software</li>
              <li>Keyboard-only navigation</li>
              <li>Browser text size adjustments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Known Limitations</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Despite our best efforts to ensure accessibility, there may be some limitations. We are aware of the
              following potential issues:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Some AI-generated content may not have optimal alternative text</li>
              <li>Third-party content and links may not meet our accessibility standards</li>
              <li>Complex interactive features may require additional assistive technology support</li>
              <li>Some dynamic content updates may not be immediately announced to screen readers</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We are actively working to address these limitations and improve accessibility across our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Feedback and Contact</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We welcome your feedback on the accessibility of Slot Edit. If you encounter any accessibility barriers
              or have suggestions for improvement, please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>Email:</strong> <a href="mailto:jbs0122@gmail.com" className="text-blue-600 hover:underline">jbs0122@gmail.com</a>
              </p>
              <p className="text-gray-700 text-sm">
                Please include "Accessibility" in the subject line and provide:
              </p>
              <ul className="list-disc pl-6 text-gray-700 text-sm space-y-1 mt-2">
                <li>A description of the accessibility issue</li>
                <li>The page URL where you encountered the issue</li>
                <li>Your browser and assistive technology information</li>
                <li>Any other relevant details</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Response Time</h2>
            <p className="text-gray-700 leading-relaxed">
              We will respond to accessibility feedback within 5 business days. We will work with you to provide the
              information, item, or service you are seeking through an alternate communication method or arrangement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technical Specifications</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Slot Edit relies on the following technologies to work with the particular combination of web browser
              and assistive technologies or plugins installed on your computer:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>HTML5</li>
              <li>CSS3</li>
              <li>JavaScript</li>
              <li>WAI-ARIA (Accessible Rich Internet Applications)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              These technologies are relied upon for conformance with the accessibility standards used.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Browser Compatibility</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Slot Edit is designed to work with recent versions of the following browsers:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Google Chrome</li>
              <li>Mozilla Firefox</li>
              <li>Apple Safari</li>
              <li>Microsoft Edge</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              For the best accessibility experience, we recommend keeping your browser updated to the latest version.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Ongoing Improvements</h2>
            <p className="text-gray-700 leading-relaxed">
              Accessibility is an ongoing effort. We regularly review our website and make improvements to ensure it
              remains accessible to all users. We conduct periodic accessibility audits and user testing with people
              who use assistive technologies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Content</h2>
            <p className="text-gray-700 leading-relaxed">
              Our website may include content from third parties, such as product images and affiliate links. While
              we strive to ensure all content meets accessibility standards, we cannot guarantee the accessibility of
              third-party websites or content. We encourage our partners to maintain accessible content and will work
              with them when accessibility issues are identified.
            </p>
          </section>

          <section className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Formal Approval</h2>
            <p className="text-gray-700 leading-relaxed">
              This accessibility statement was approved by NEWACTS management on February 10, 2026, and is reviewed
              annually to ensure it remains accurate and current.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
