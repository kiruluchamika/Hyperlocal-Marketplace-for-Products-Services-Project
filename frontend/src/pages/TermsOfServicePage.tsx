import React from 'react';
import PolicyPageLayout from '@/components/legal/PolicyPageLayout';

const TermsOfServicePage: React.FC = () => {
  return (
    <PolicyPageLayout
      title="Terms of Service"
      lastUpdated="April 7, 2026"
      summary="These Terms describe the basic rules for using Bazaaro as a marketplace for local product listings and service offers."
      asideTitle="Important Highlights"
      asideItems={[
        'Users are responsible for the accuracy of their listings and account activity.',
        'Misleading, illegal, unsafe, or abusive behavior is not permitted.',
        'Bazaaro may remove content or restrict accounts that violate these Terms.',
        'Marketplace transactions remain primarily between the participating users.',
      ]}
      sections={[
        {
          title: '1. Using The Platform',
          body: (
            <>
              <p>
                Bazaaro provides a platform where users can browse, list, buy, sell, and offer local services. By
                accessing or using the platform, you agree to follow these Terms and any related community or safety
                rules published on the site.
              </p>
              <p>
                {/* TODO: Replace with your legal entity name if different from the public-facing brand. */}
                These Terms apply to the Bazaaro platform and related services operated under your final business and
                legal structure.
              </p>
            </>
          ),
        },
        {
          title: '2. Accounts And Eligibility',
          body: (
            <>
              <p>
                You are responsible for keeping your account information accurate and for maintaining the confidentiality
                of your login credentials. You may not use another person&apos;s account or impersonate another user,
                business, or organization.
              </p>
              <p>
                If you create an account, you are responsible for the activity that occurs under it. You must provide
                truthful information during registration, profile completion, and any verification process used on the
                platform.
              </p>
            </>
          ),
        },
        {
          title: '3. Listings, Service Ads, And User Content',
          body: (
            <>
              <p>
                You may only post content that you have the right to publish. Listings and service ads must be accurate,
                reasonably complete, and not misleading. Photos, descriptions, pricing, availability, and category
                details should reflect the actual item or service offered.
              </p>
              <p>
                Prohibited content includes unlawful items, deceptive offers, counterfeit goods, dangerous conduct,
                abusive material, or any content that violates the platform&apos;s Community Guidelines.
              </p>
            </>
          ),
        },
        {
          title: '4. Buyer, Seller, And Provider Responsibilities',
          body: (
            <>
              <p>
                Buyers should review listings carefully, ask questions when needed, and confirm the terms of any
                transaction or service booking. Sellers and service providers must honor the terms they advertise unless
                changes are clearly communicated and accepted by the other party.
              </p>
              <p>
                Users are responsible for complying with applicable local rules, fulfilling their commitments, and
                communicating respectfully during marketplace interactions.
              </p>
            </>
          ),
        },
        {
          title: '5. Payments, Disputes, And Marketplace Role',
          body: (
            <>
              <p>
                Bazaaro may offer platform features that support payments, bookings, or transaction tracking, but the
                underlying agreement for a sale or service generally remains between the participating users.
              </p>
              <p>
                We are not a party to every transaction and do not guarantee the conduct, quality, safety, legality, or
                truthfulness of every listing, user, product, or service. Users should exercise reasonable caution and
                follow the platform&apos;s Safety Tips.
              </p>
              <p>
                {/* TODO: Add company-specific billing, payout, dispute, or refund language if your final business rules require it. */}
                Any future marketplace payment, payout, cancellation, or dispute processes should be reflected here once
                finalized.
              </p>
            </>
          ),
        },
        {
          title: '6. Enforcement And Account Action',
          body: (
            <>
              <p>
                Bazaaro may review content, investigate reports, remove listings, suspend or restrict accounts, and take
                other reasonable enforcement action when we believe a user has violated these Terms, the Community
                Guidelines, or platform safety standards.
              </p>
              <p>
                We may also take action to protect users, preserve platform integrity, comply with legal obligations, or
                respond to abuse, fraud, or repeated policy violations.
              </p>
            </>
          ),
        },
        {
          title: '7. Disclaimers And Limitation Of Liability',
          body: (
            <>
              <p>
                The platform is provided on an &quot;as available&quot; basis. To the extent permitted by applicable law, Bazaaro
                disclaims warranties not expressly stated here, including implied warranties related to availability,
                accuracy, merchantability, fitness for a particular purpose, or non-infringement.
              </p>
              <p>
                To the extent permitted by applicable law, Bazaaro will not be liable for indirect, incidental, special,
                consequential, or similar damages arising from platform use, user interactions, listings, transactions,
                or service arrangements.
              </p>
            </>
          ),
        },
        {
          title: '8. Changes And Contact',
          body: (
            <>
              <p>
                We may update these Terms from time to time. When material changes are made, the updated version will be
                posted on the platform with a revised &quot;Last Updated&quot; date.
              </p>
              <p>
                {/* TODO: Replace with your final legal contact email, mailing address, and governing jurisdiction if needed. */}
                If you have questions about these Terms, contact the platform through the official support details shown
                on the site.
              </p>
            </>
          ),
        },
      ]}
    />
  );
};

export default TermsOfServicePage;
