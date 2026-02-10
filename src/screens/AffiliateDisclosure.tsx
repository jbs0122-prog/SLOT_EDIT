import { ArrowLeft } from 'lucide-react';

export default function AffiliateDisclosure() {
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

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Affiliate Disclosure</h1>
        <p className="text-gray-600 mb-8">Last Updated: February 10, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">FTC Compliance Statement</h2>
            <p className="text-gray-700 leading-relaxed">
              In accordance with the Federal Trade Commission's 16 CFR Part 255, "Guides Concerning the Use of
              Endorsements and Testimonials in Advertising," we are providing this disclosure to inform you about
              our affiliate relationships.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Affiliate Relationships</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Slot Edit, operated by NEWACTS, participates in various affiliate marketing programs. This means that
              when you click on certain links on our website and make a purchase, we may receive a commission at no
              additional cost to you.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are participants in affiliate programs including, but not limited to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Amazon Associates Program</li>
              <li>Various fashion retailer affiliate programs</li>
              <li>Other merchant affiliate networks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What This Means for You</h2>
            <h3 className="text-xl font-medium text-gray-800 mb-3">No Additional Cost</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              When you make a purchase through our affiliate links, you pay the same price you would pay if you went
              directly to the merchant's website. The commission we receive comes from the merchant, not from you.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Commission Structure</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              The commission we earn varies by merchant and product category. These commissions help support our
              operations and allow us to continue providing free outfit recommendations and fashion advice.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Product Selection</h3>
            <p className="text-gray-700 leading-relaxed">
              While we do earn commissions from affiliate links, our product recommendations are based on AI analysis,
              style compatibility, quality, and user preferences. We strive to recommend products that genuinely match
              your needs, regardless of commission rates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Amazon Associates Program</h2>
            <p className="text-gray-700 leading-relaxed">
              NEWACTS is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program
              designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com.
              As an Amazon Associate, we earn from qualifying purchases.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment to Transparency</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We are committed to maintaining your trust and confidence. Here's what you should know:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>We clearly identify affiliate links when possible</li>
              <li>Our editorial content is not influenced by affiliate relationships</li>
              <li>We recommend products based on quality and relevance, not commission rates</li>
              <li>We never recommend products we don't believe will benefit our users</li>
              <li>We respect your right to make informed purchasing decisions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Merchants</h2>
            <p className="text-gray-700 leading-relaxed">
              When you click on an affiliate link and make a purchase, you are purchasing from the merchant, not from
              us. We are not responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Product quality, availability, or pricing</li>
              <li>Merchant shipping, returns, or customer service</li>
              <li>Merchant privacy practices or terms of service</li>
              <li>Any disputes between you and the merchant</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Please review the merchant's policies before making a purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data and Tracking</h2>
            <p className="text-gray-700 leading-relaxed">
              When you click on affiliate links, cookies may be placed on your device to track your purchase and
              attribute the commission to us. These cookies are governed by the merchant's privacy policy. We
              encourage you to review our Privacy Policy and the privacy policies of merchants you visit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Disclosure</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Affiliate Disclosure from time to time to reflect changes in our affiliate
              relationships or legal requirements. We will post any changes on this page with an updated "Last Updated"
              date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Questions</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about our affiliate relationships or this disclosure, please contact us at:
            </p>
            <p className="text-gray-700 mt-4">
              <strong>Email:</strong> <a href="mailto:jbs0122@gmail.com" className="text-blue-600 hover:underline">jbs0122@gmail.com</a>
            </p>
          </section>

          <section className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Thank You</h2>
            <p className="text-gray-700 leading-relaxed">
              Thank you for supporting Slot Edit by using our affiliate links. Your purchases help us continue to
              provide free, high-quality outfit recommendations and fashion advice. We appreciate your trust and
              confidence in our service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
