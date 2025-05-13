import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

const PrivacyPolicy = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>{" "}
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Privacy Policy for {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {
            `Privacy Policy for Outline

Effective Date: May 13, 2025

1. Introduction  
Welcome to Outline (“we,” “us,” or “our”). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit https://outline.so (the “Site”).

2. Information We Collect  
   • Personal Data: We collect your name, email address, and payment information when you place an order or register for an account.  
   • Non-Personal Data: We use web cookies to gather usage information, such as pages visited and time spent on the Site.

3. Use of Your Information  
   We use the information we collect to:  
   • Process and fulfill your orders.  
   • Communicate with you about your account, orders, and updates to this Privacy Policy.  
   • Improve our Site’s functionality and user experience.

4. Data Sharing and Disclosure  
   We do not share, sell, rent, or otherwise disclose your personal data to any third parties, except as required by law.

5. Cookies and Tracking Technologies  
   We use cookies to enhance your experience, analyze Site usage, and assist in our marketing efforts. You may disable cookies through your browser settings, but this may affect Site functionality.

6. Children’s Privacy  
   Our Site is not directed to individuals under the age of 13. We do not knowingly collect personal data from children under 13. If you believe we have collected such data, please contact us to have it deleted.

7. Data Security  
   We implement industry-standard security measures (e.g., TLS encryption) to protect your data. However, no system can guarantee absolute security.

8. Updates to This Policy  
   We may update this Privacy Policy from time to time. When we do, we will post the new effective date above and notify you via email.

9. Contact Us  
   If you have any questions about this Privacy Policy, please contact us at support@outline.so.`}
        </pre>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
