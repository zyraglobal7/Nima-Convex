export const DATA_HANDLING_POLICY = {
  title: "Data Handling & Protection Policy",
  company: "Nima AI Inc",
  website: "https://www.shopnima.ai",
  contact: "support@shopnima.ai",
  sections: [
    {
      heading: "1. Introduction",
      content:
        'Nima AI Inc ("Nima", "we", "our") is committed to protecting the personal data of our users, sellers, and website visitors.',
    },
    {
      heading: "2. Data Collected",
      list: [
        "User photos for virtual try-on (temporarily processed)",
        "Body measurements (manual input)",
        "Email, password, Google account info",
        "Shopping history, preferences, and in-app messages",
        "Approximate location",
        "Device information",
      ],
    },
    {
      heading: "3. Data Storage & Security",
      list: [
        "Processed on secure Google Cloud servers",
        "Encrypted in transit and at rest",
        "Access restricted to authorized personnel",
        "User photos for virtual try-on (stored until the user deletes them)",
      ],
    },
    {
      heading: "4. Data Retention",
      list: [
        "Personal data retained as long as the account exists",
        "Photos are retained indefinitely unless deleted by the user",
        "Analytics data aggregated and retained for insights",
      ],
    },
    {
      heading: "5. Data Access & Sharing",
      list: [
        "Aggregated analytics shared with sellers",
        "Data shared with third-party services (Firebase, Google Analytics, Fingo Pay, Meta Ads)",
        "Legal compliance disclosures when required",
      ],
    },
    {
      heading: "6. User Rights",
      list: [
        "Access, correction, deletion, data portability, restriction, objection",
        "Requests sent to support@shopnima.ai",
      ],
    },
    {
      heading: "7. Data Breach Notification",
      content:
        "Users notified promptly in the event of a breach affecting their data.",
    },
    {
      heading: "8. GDPR Compliance",
      list: [
        "Lawful basis for processing established",
        "Sub-processors documented",
        "Users informed of rights under GDPR",
      ],
    },
  ],
} as const;

export const COOKIE_POLICY = {
  title: "Cookie Notice & Policy",
  company: "Nima AI Inc",
  website: "https://www.shopnima.ai",
  contact: "support@shopnima.ai",
  sections: [
    {
      heading: "1. Introduction",
      content:
        "Our website uses cookies to improve user experience, analytics, and marketing.",
    },
    {
      heading: "2. Types of Cookies",
      list: [
        "Strictly necessary: enable basic website functionality",
        "Analytics: track user behavior to improve the site (Google Analytics)",
        "Marketing: track user interactions with ads (Meta Ads, Google Ads)",
        "Preferences: store user settings",
      ],
    },
    {
      heading: "3. Cookie Duration",
      list: [
        "Session cookies: deleted after browser closes",
        "Persistent cookies: retained up to 12 months",
      ],
    },
    {
      heading: "4. Third-Party Sharing",
      content:
        "Analytics and marketing cookies share anonymized data with Google and Meta.",
    },
    {
      heading: "5. User Control & Consent",
      list: [
        "Users must consent to non-essential cookies",
        "Cookies can be managed or rejected via browser settings",
        "Users can withdraw consent at any time",
      ],
    },
    {
      heading: "6. Updates",
      content:
        "This policy may change; last updated date is indicated at the top.",
    },
  ],
} as const;

export const AI_TRANSPARENCY_NOTICE = {
  title: "AI Transparency & Safety Notice",
  points: [
    "Nima uses generative AI to create try-on images.",
    "AI results may vary and are not exact representations of fit.",
    "User images are processed on secure cloud servers.",
    "Nima does not train AI models using user images unless explicitly authorized.",
  ],
} as const;

export const PRIVACY_POLICY = {
  title: "Privacy Policy",
  effectiveDate: "February 13th, 2026",
  lastUpdated: "February 13th, 2026",
  company: "Nima AI Inc",
  website: "https://www.shopnima.ai",
  contact: "support@shopnima.ai",
  sections: [
    {
      heading: "1. Introduction",
      paragraphs: [
        'Nima AI Inc ("Nima", "we", "our", or "us") provides an AI-powered virtual stylist platform that allows users to virtually try on clothing, create looks, shop items, and gives sellers tools to promote products and view aggregated analytics.',
        'This Privacy Policy explains how we collect, use, store, and share information when you use our mobile application ("Nima") and website.',
        "By using Nima, you agree to the practices described in this Privacy Policy.",
      ],
    },
    {
      heading: "2. Information We Collect",
      subsections: [
        {
          subheading: "A. Information You Provide",
          list: [
            "Photos & Images: User-uploaded photos for virtual try-on via generative AI.",
            "Body Measurements: Manually entered measurements.",
            "Account Information: Email, password, or login via Google.",
            "Personal Preferences: Style preferences, sizing, brand interests, saved items.",
            "In-App Chats: Messages exchanged with sellers or support.",
            "Shopping & Order History: Past purchases, cart activity, browsing logs.",
          ],
        },
        {
          subheading: "B. Information Automatically Collected",
          list: [
            "Approximate Location: For localization, recommendations, and analytics.",
            "Usage Data: Screens viewed, interactions, clicks, time spent.",
            "Device Data: IP address, OS version, device model, app version.",
          ],
        },
        {
          subheading: "C. Seller Data",
          list: [
            "Product images uploaded by sellers",
            "Product details and inventory information",
          ],
        },
      ],
    },
    {
      heading: "3. How We Use Your Information",
      content: "We use your information to:",
      list: [
        "Provide AI-powered virtual try-on",
        "Enable users to create personal looks and save them",
        "Personalize recommendations and shopping experiences",
        "Process payments, manage orders, and issue receipts",
        "Provide aggregated analytics to sellers",
        "Improve app performance, stability, and safety",
        "Display relevant advertising",
        "Enforce policies and comply with legal requirements",
      ],
    },
    {
      heading: "4. AI Processing & Image Handling",
      list: [
        "User images are processed securely on cloud servers.",
        "Images may be temporarily stored for processing but deleted afterward unless saved by users.",
        "Images are not used to train AI models without explicit user consent.",
        "AI outputs (virtual try-ons) are not guaranteed to be perfectly accurate.",
      ],
    },
    {
      heading: "5. Data Sharing",
      subsections: [
        {
          subheading: "A. Service Providers",
          content:
            "We share necessary data with trusted providers, including:",
          list: [
            "Google Cloud (storage & compute)",
            "Google Analytics / PostHog (analytics)",
            "Fingo Pay (payment processing)",
            "Advertising platforms (Meta Ads, Google Ads)",
          ],
        },
        {
          subheading: "B. Sellers",
          content: "Sellers receive only aggregated analytics, such as:",
          list: [
            "Impressions",
            "Click-through rates",
            "Category-level demographics",
          ],
          footer: "No identifiable or individualized user data is shared.",
        },
        {
          subheading: "C. Legal Requirements",
          content:
            "We may disclose information to comply with legal obligations or protect our rights.",
        },
      ],
    },
    {
      heading: "6. Advertising & Tracking",
      paragraphs: [
        "Nima uses advertising technologies to measure ad performance and deliver relevant content.",
        "Users may opt out of personalized ads through device settings.",
      ],
    },
    {
      heading: "7. Payments",
      content: "Transactions are processed securely through:",
      list: [
        "Fingo Pay",
        "Apple\u2019s in-app purchase system",
        "Google Play Billing",
      ],
      footer: "Nima does not store complete credit card information.",
    },
    {
      heading: "8. Data Security",
      content: "We implement industry-standard safeguards:",
      list: [
        "Encryption in transit and at rest",
        "Access controls and authentication",
        "Secure cloud infrastructure",
      ],
      footer: "However, no system is completely secure.",
    },
    {
      heading: "9. Data Retention",
      list: [
        "Account data is kept until user deletion.",
        "User photos are deleted after processing unless saved.",
        "Analytics data is retained in aggregated form.",
      ],
    },
    {
      heading: "10. Your Rights",
      content: "Users may request to:",
      list: [
        "Access their personal data",
        "Delete their data",
        "Update inaccurate information",
        "Export their data",
        "Withdraw certain types of consent",
      ],
      footer: "Contact: support@shopnima.ai",
    },
    {
      heading: "11. Children\u2019s Privacy",
      content: "Nima is not intended for children under 13.",
    },
    {
      heading: "12. Changes to This Policy",
      content:
        'Changes will be posted with an updated "Last Updated" date. Continued use after updates indicates acceptance.',
    },
  ],
} as const;

export const PERMISSIONS_JUSTIFICATION = {
  title: "Permissions Justification",
  permissions: [
    { name: "Camera", reason: "Capturing photos for virtual try-on." },
    { name: "Photos/Media", reason: "Uploading images, saving looks." },
    {
      name: "Approximate Location",
      reason: "Regional personalization and analytics.",
    },
  ],
} as const;
