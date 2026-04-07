import React from 'react';
import PolicyPageLayout from '@/components/legal/PolicyPageLayout';

const SafetyTipsPage: React.FC = () => {
  return (
    <PolicyPageLayout
      title="Safety Tips"
      lastUpdated="April 7, 2026"
      summary="Use these practical safety recommendations when buying products, selling items, or arranging local services through Bazaaro."
      asideTitle="Quick Reminders"
      asideItems={[
        'Meet in safe, public places whenever possible.',
        'Inspect products and confirm service details before payment.',
        'Keep communication inside the platform when possible.',
        'Report suspicious behavior, scams, or abusive conduct promptly.',
      ]}
      sections={[
        {
          title: 'Stay Alert From First Contact',
          body: (
            <>
              <p>
                Read listings carefully, review profile details, and ask clear questions before agreeing to meet,
                buy, sell, or book a service. Take extra care if a listing looks unusually cheap, incomplete, or
                rushed.
              </p>
              <p>
                Warning signs can include pressure to act immediately, requests to continue the conversation on a
                different channel too early, inconsistent information, or refusal to answer reasonable questions about
                the item or service.
              </p>
            </>
          ),
        },
        {
          title: 'Tips For Buyers',
          body: (
            <>
              <p>
                Verify the product condition, price, accessories, and delivery or pickup expectations before you pay.
                For services, confirm the scope of work, timing, total charges, and what is included.
              </p>
              <p>
                If you are meeting in person, inspect the product before handing over payment. For higher-value items,
                consider bringing another person with you and meeting during daylight hours in a well-trafficked area.
              </p>
              <p>
                Avoid sending advance payments to someone you do not know unless you are fully comfortable with the
                arrangement and understand the risks.
              </p>
            </>
          ),
        },
        {
          title: 'Tips For Sellers And Service Providers',
          body: (
            <>
              <p>
                Keep your listing accurate, respond clearly, and disclose important details up front. If an item has
                damage or a service has limitations, say so before the customer commits.
              </p>
              <p>
                Meet customers in locations that feel safe to you. For home visits or on-site services, confirm the
                address, expected work, and timing in advance. Trust your instincts if a request feels unsafe or
                unusual.
              </p>
              <p>
                Do not share more personal information than necessary to complete the transaction or appointment.
              </p>
            </>
          ),
        },
        {
          title: 'Payment And Scam Awareness',
          body: (
            <>
              <p>
                Be cautious with overpayment requests, fake proof-of-payment screenshots, suspicious links, and anyone
                asking you to verify your account through unofficial channels. Scammers may also pretend to be platform
                staff or payment providers.
              </p>
              <p>
                Double-check all payment requests, transfer details, and booking confirmations. If something seems off,
                pause the transaction and verify it before continuing.
              </p>
              <p>
                {/* TODO: Replace with your final trust-and-safety or support contact flow if it changes. */}
                If you believe you encountered fraud, collect relevant screenshots or messages and contact the platform
                through the official support channels shown on the site.
              </p>
            </>
          ),
        },
        {
          title: 'Meetups, Deliveries, And In-Person Services',
          body: (
            <>
              <p>
                Prefer public locations for exchanges when practical. If delivery or in-home service is required,
                confirm arrival windows, identify who will attend, and share plans with someone you trust for added
                safety.
              </p>
              <p>
                Stop the interaction immediately if the other party behaves aggressively, changes the agreed terms at
                the last minute, or makes you feel unsafe.
              </p>
            </>
          ),
        },
        {
          title: 'Report Problems Promptly',
          body: (
            <>
              <p>
                Report listings, messages, profiles, or service ads that appear misleading, abusive, fraudulent, or
                unsafe. Early reports help protect the rest of the community.
              </p>
              <p>
                If a situation involves immediate danger or a possible crime, contact local emergency or law enforcement
                services instead of relying only on marketplace reporting tools.
              </p>
            </>
          ),
        },
      ]}
    />
  );
};

export default SafetyTipsPage;
