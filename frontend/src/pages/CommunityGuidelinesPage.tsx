import React from 'react';
import PolicyPageLayout from '@/components/legal/PolicyPageLayout';

const CommunityGuidelinesPage: React.FC = () => {
  return (
    <PolicyPageLayout
      title="Community Guidelines"
      lastUpdated="April 7, 2026"
      summary="These Guidelines explain the standards we expect from everyone using Bazaaro to buy, sell, communicate, and offer local services."
      asideTitle="Community Standards"
      asideItems={[
        'Be honest in listings, messages, and service offers.',
        'Treat other users respectfully and avoid harassment or intimidation.',
        'Do not post misleading, dangerous, illegal, or prohibited content.',
        'Use reporting tools when content or behavior crosses the line.',
      ]}
      sections={[
        {
          title: '1. Be Respectful And Honest',
          body: (
            <>
              <p>
                Users should communicate politely, act in good faith, and avoid abusive, threatening, discriminatory, or
                harassing behavior. Honest, straightforward communication helps the marketplace stay safe and useful for
                everyone.
              </p>
              <p>
                Do not impersonate individuals, businesses, platform staff, or public organizations. Do not create fake
                profiles or use misleading identities to gain trust.
              </p>
            </>
          ),
        },
        {
          title: '2. Listing And Service Quality Standards',
          body: (
            <>
              <p>
                Listings and service ads should accurately describe what is being offered. Titles, descriptions, photos,
                categories, pricing, and other details should not be deceptive, manipulative, or intentionally vague.
              </p>
              <p>
                Duplicate posts, bait listings, fake availability, hidden conditions, or repeated attempts to mislead
                users may be removed and can lead to account restrictions.
              </p>
            </>
          ),
        },
        {
          title: '3. Prohibited Conduct',
          body: (
            <>
              <p>
                The following are not allowed on Bazaaro: fraud, scams, spam, counterfeit goods, stolen items, unsafe or
                unlawful activity, abusive content, exploitative behavior, and attempts to take advantage of other users
                through pressure or deception.
              </p>
              <p>
                Content that encourages violence, hate, threats, or dangerous offline encounters is prohibited. Users
                should also avoid sharing private information about others without a valid reason and permission.
              </p>
            </>
          ),
        },
        {
          title: '4. Safe Transactions And Service Interactions',
          body: (
            <>
              <p>
                Community members should follow practical safety steps when meeting in person, arranging pickups,
                deliveries, or booking services. Keep expectations clear, agree on key terms early, and stop the
                interaction if you feel pressured or unsafe.
              </p>
              <p>
                Users should never use the platform to organize harmful conduct, exploit vulnerable individuals, or
                bypass safety expectations in a misleading way.
              </p>
            </>
          ),
        },
        {
          title: '5. Reporting And Enforcement',
          body: (
            <>
              <p>
                If you notice behavior or content that violates these Guidelines, use the platform&apos;s reporting tools or
                official support channels so the issue can be reviewed.
              </p>
              <p>
                Bazaaro may remove content, warn users, restrict visibility, suspend accounts, or take stronger action
                for serious or repeated violations. Enforcement decisions may also consider the severity, frequency, and
                potential safety impact of the conduct involved.
              </p>
            </>
          ),
        },
        {
          title: '6. Building A Better Marketplace',
          body: (
            <>
              <p>
                A healthy hyperlocal marketplace depends on accurate information, reliable follow-through, respectful
                communication, and good judgment. Users who contribute positively help the platform remain useful for
                both product listings and local services.
              </p>
              <p>
                {/* TODO: Add any marketplace-specific moderation escalation, appeals, or review process once finalized. */}
                If your final moderation or appeals workflow becomes more detailed later, this section should be updated
                to reflect it.
              </p>
            </>
          ),
        },
      ]}
    />
  );
};

export default CommunityGuidelinesPage;
