import { ArrowLeft } from 'lucide-react';

export default function DMCAPolicy() {
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

        <h1 className="text-4xl font-bold text-gray-900 mb-4">DMCA Policy</h1>
        <p className="text-gray-600 mb-8">Last Updated: February 10, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Copyright Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              NEWACTS respects the intellectual property rights of others and expects users of Slot Edit to do the
              same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond promptly
              to claims of copyright infringement on our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Notification of Copyright Infringement</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you believe that your copyrighted work has been copied in a way that constitutes copyright
              infringement and is accessible on our website, please notify our copyright agent as set forth below.
              For your complaint to be valid under the DMCA, you must provide the following information in writing:
            </p>
            <ol className="list-decimal pl-6 text-gray-700 space-y-3">
              <li>
                <strong>Identification of the copyrighted work:</strong> A description of the copyrighted work that
                you claim has been infringed, or if multiple copyrighted works are covered by a single notification,
                a representative list of such works.
              </li>
              <li>
                <strong>Identification of the infringing material:</strong> A description of where the material that
                you claim is infringing is located on our website, with sufficient detail that we can find it (e.g.,
                the URL).
              </li>
              <li>
                <strong>Your contact information:</strong> Your address, telephone number, and email address.
              </li>
              <li>
                <strong>A statement of good faith belief:</strong> A statement that you have a good faith belief that
                the disputed use is not authorized by the copyright owner, its agent, or the law.
              </li>
              <li>
                <strong>A statement of accuracy:</strong> A statement by you, made under penalty of perjury, that the
                above information in your notice is accurate and that you are the copyright owner or authorized to act
                on the copyright owner's behalf.
              </li>
              <li>
                <strong>Physical or electronic signature:</strong> An electronic or physical signature of the person
                authorized to act on behalf of the owner of the copyright interest.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Designated Copyright Agent</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Please send DMCA notices to our designated copyright agent:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 font-medium mb-2">DMCA Agent - NEWACTS</p>
              <p className="text-gray-700">Email: <a href="mailto:jbs0122@gmail.com" className="text-blue-600 hover:underline">jbs0122@gmail.com</a></p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              Please note that this procedure is exclusively for notifying us that your copyrighted material has been
              infringed. All other inquiries, such as product questions or technical support requests, will not receive
              a response through this process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Counter-Notification</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you believe that material you posted on our website was removed or access to it was disabled by
              mistake or misidentification, you may file a counter-notification with us by providing the following
              information in writing:
            </p>
            <ol className="list-decimal pl-6 text-gray-700 space-y-3">
              <li>Your physical or electronic signature</li>
              <li>Identification of the material that has been removed or to which access has been disabled, and the
                  location at which the material appeared before it was removed or access to it was disabled</li>
              <li>A statement under penalty of perjury that you have a good faith belief that the material was removed
                  or disabled as a result of mistake or misidentification</li>
              <li>Your name, address, telephone number, and email address</li>
              <li>A statement that you consent to the jurisdiction of the Federal District Court for the judicial
                  district in which your address is located, or if your address is outside the United States, for any
                  judicial district in which we may be found</li>
              <li>A statement that you will accept service of process from the person who provided the original DMCA
                  notification or an agent of such person</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Repeat Infringer Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              In accordance with the DMCA and other applicable laws, we have adopted a policy of terminating, in
              appropriate circumstances and at our sole discretion, accounts of users who are deemed to be repeat
              infringers. We may also, at our sole discretion, limit access to our website and terminate the accounts
              of users who infringe any intellectual property rights of others, whether or not there is any repeat
              infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Response Time</h2>
            <p className="text-gray-700 leading-relaxed">
              We will respond to valid DMCA notices as quickly as possible, typically within 2-5 business days.
              If we remove or disable access to material in response to a DMCA notice, we will make a good faith
              attempt to contact the user who posted the material.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Misrepresentations</h2>
            <p className="text-gray-700 leading-relaxed">
              Please be aware that under Section 512(f) of the DMCA, any person who knowingly materially
              misrepresents that material or activity is infringing, or that material or activity was removed or
              disabled by mistake or misidentification, may be subject to liability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Fair Use</h2>
            <p className="text-gray-700 leading-relaxed">
              Before submitting a DMCA notice, please consider whether the use of copyrighted material at issue
              falls within fair use. Fair use is a use permitted by copyright statute that might otherwise be
              infringing. Examples of fair use include commentary, criticism, news reporting, teaching, scholarship,
              and research.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about this DMCA Policy or copyright issues, please contact us at:
            </p>
            <p className="text-gray-700 mt-4">
              <strong>Email:</strong> <a href="mailto:jbs0122@gmail.com" className="text-blue-600 hover:underline">jbs0122@gmail.com</a>
            </p>
          </section>

          <section className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Important Notice</h3>
            <p className="text-gray-700 leading-relaxed">
              This DMCA Policy is provided for informational purposes only and does not constitute legal advice.
              If you are unsure whether material infringes your copyright, we recommend that you first contact a lawyer.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
