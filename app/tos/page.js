import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

const TOS = () => {
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
          </svg>
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Terms and Conditions for {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Terms of Service for Outline

Effective Date: May 13, 2025

1. Acceptance of Terms  
By accessing or using https://outline.so (the “Site”) and our services (“Services”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, please do not use the Site or Services.

2. Description of Services  
Outline provides an AI-powered tool to help students and mentors check the structure and content of academic theses, including automated analysis, editing tools, and export functions.

3. User Accounts  
   • To access certain features, you must register and create an account.  
   • You agree to provide accurate and complete information and to keep your password secure.  
   • You are responsible for all activity under your account.

4. User Obligations  
   • You will not use the Site for any unlawful purpose or in violation of these Terms.  
   • You will not attempt to reverse-engineer, misuse, or disrupt the Services or underlying systems.

5. Payments and Subscriptions  
   • Certain features may require payment. By subscribing, you authorize us to charge your chosen payment method.  
   • All fees are non-refundable except as required by law.

6. Intellectual Property  
   • The Site and Services, including all software, content, and trademarks, are owned by Outline or its licensors.  
   • You retain ownership of any content you submit, but grant us a license to use it to provide the Services.

7. Termination  
   • We may suspend or terminate your access for breach of these Terms or unlawful conduct.  
   • Upon termination, your right to use the Services immediately ceases.

8. Disclaimer of Warranties  
   • The Services are provided “as is” without warranties of any kind.  
   • We do not guarantee the accuracy, reliability, or suitability of the analysis or recommendations.

9. Limitation of Liability  
   • To the maximum extent permitted by law, Outline will not be liable for any indirect, incidental, or consequential damages arising from your use of the Services.

10. Governing Law  
These Terms are governed by the laws of Slovenia, without regard to conflict of law principles.

11. Changes to Terms  
We may update these Terms at any time. We will post the revised date above and notify you by email if you have an account.

12. Contact Us  
If you have questions about these Terms, please contact us at support@outline.so.
`}
        </pre>
      </div>
    </main>
  );
};

export default TOS;
