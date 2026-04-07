import React from 'react';
import PolicyPageLayout from '@/components/legal/PolicyPageLayout';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <PolicyPageLayout
      title="Privacy Policy"
      lastUpdated="April 7, 2026"
      summary="This Privacy Policy explains the types of information Bazaaro may collect, how that information may be used, and the choices available to users."
      asideTitle="Privacy Snapshot"
      asideItems={[
        'Account, listing, and service data may be collected to operate the marketplace.',
        'Information may be used for security, support, communication, and platform improvement.',
        'Bazaaro may share data with service providers or when legally required.',
        'Users can request updates to account information and review available privacy controls.',
      ]}
      sections={[
        {
          title: '1. Information We May Collect',
          body: (
            <>
              <p>
                Bazaaro may collect information you provide directly, such as your name, contact details, account
                credentials, profile information, listing content, service ads, messages, booking details, and support
                requests.
              </p>
              <p>
                We may also collect platform activity data such as login events, page interactions, listing performance,
                device or browser information, and general usage analytics needed to maintain and improve the service.
              </p>
            </>
          ),
        },
        {
          title: '2. How We Use Information',
          body: (
            <>
              <p>
                Information may be used to create and manage accounts, display listings and service ads, facilitate
                communication, support transactions and bookings, send operational notifications, respond to support
                requests, and improve trust and safety across the platform.
              </p>
              <p>
                We may also use information to detect fraud, investigate abuse, enforce platform rules, troubleshoot
                technical issues, and understand how users interact with the marketplace.
              </p>
            </>
          ),
        },
        {
          title: '3. How Information May Be Shared',
          body: (
            <>
              <p>
                Bazaaro may share limited information with other users when needed for marketplace interactions, such as
                profile details, listing information, service availability, and transaction-related communication.
              </p>
              <p>
                We may also share information with trusted service providers that help operate the platform, such as
                hosting, analytics, communication, support, payment, or security vendors, subject to appropriate
                safeguards and contractual controls.
              </p>
              <p>
                We may disclose information when reasonably necessary to comply with legal obligations, protect users,
                investigate suspicious activity, or defend the rights, safety, and integrity of the platform.
              </p>
            </>
          ),
        },
        {
          title: '4. Data Retention And Security',
          body: (
            <>
              <p>
                Bazaaro may retain information for as long as reasonably necessary to operate the platform, meet support
                and safety needs, resolve disputes, enforce policies, and comply with legal or operational requirements.
              </p>
              <p>
                We take reasonable steps to protect user information using administrative, technical, and organizational
                measures appropriate to the platform context. However, no service can guarantee absolute security.
              </p>
            </>
          ),
        },
        {
          title: '5. User Choices And Rights',
          body: (
            <>
              <p>
                Users may be able to review or update certain account information through their profile settings. Users
                may also contact the platform to request help with account access, corrections, or privacy-related
                questions.
              </p>
              <p>
                Depending on applicable requirements in your operating markets, users may have additional rights related
                to access, correction, deletion, restriction, or objection.
              </p>
              <p>
                {/* TODO: Add final user-rights workflow, support contact, and jurisdiction-specific language if required. */}
                The exact process and timelines for privacy requests should be finalized here once your business and
                compliance details are confirmed.
              </p>
            </>
          ),
        },
        {
          title: '6. Children, Sensitive Data, And Safety',
          body: (
            <>
              <p>
                The platform is not intended to encourage users to post unnecessary sensitive personal information in
                public listings, messages, or service ads. Users should limit public disclosures to what is necessary for
                safe marketplace use.
              </p>
              <p>
                If you believe information has been shared inappropriately or that a safety risk exists, report it
                promptly so the platform can review the situation.
              </p>
            </>
          ),
        },
        {
          title: '7. Updates To This Policy',
          body: (
            <>
              <p>
                Bazaaro may update this Privacy Policy from time to time. The current version will always show the latest
                revision date at the top of the page.
              </p>
              <p>
                {/* TODO: Replace with final privacy contact email, registered address, and legal entity details. */}
                Questions about privacy can be directed to the official support contacts published on the platform until
                a dedicated privacy contact is finalized.
              </p>
            </>
          ),
        },
      ]}
    />
  );
};

export default PrivacyPolicyPage;
