export const TERMS_OF_SERVICE = {
  title: "Terms of Service",
  effectiveDate: "February 13th, 2026",
  sections: [
    {
      heading: "1. Acceptance of Terms",
      content: "By using Nima, you agree to comply with these Terms.",
    },
    {
      heading: "2. Our Services",
      content: "Nima offers:",
      list: [
        "AI-powered virtual try-on",
        "Look creation tools",
        "Product browsing and shopping",
        "Seller product management",
        "Aggregated analytics for sellers",
      ],
    },
    {
      heading: "3. User Accounts",
      list: [
        "Users must provide accurate information.",
        "Accounts may be created via email/password or Google.",
        "Users are responsible for account security.",
      ],
    },
    {
      heading: "4. User Content",
      content: "Users may upload:",
      list: [
        "Photos",
        "Body measurements",
        "Messages",
        "Created looks",
      ],
      footer:
        "Users grant Nima a limited license to process content for service functionality.",
    },
    {
      heading: "5. Prohibited Conduct",
      content: "Users must not:",
      list: [
        "Upload explicit or harmful content",
        "Upload images of others without consent",
        "Misuse AI tools",
        "Attempt to reverse engineer the app",
        "Upload copyrighted or stolen content",
      ],
    },
    {
      heading: "6. Seller Responsibilities",
      content: "Sellers must:",
      list: [
        "Upload only authorized images",
        "Submit accurate product information",
        "Meet marketplace standards",
        "Fulfill customer orders promptly",
      ],
    },
    {
      heading: "7. Payments & Fees",
      list: [
        "Payments are processed via Fingo Pay or app store systems.",
        "Nima may charge commissions, subscription fees, and in-app purchase fees.",
      ],
    },
    {
      heading: "8. AI Disclaimer",
      content:
        "AI-generated visualizations are approximations and not guaranteed to reflect precise sizing, fit, or color.",
    },
    {
      heading: "9. Termination",
      content:
        "Nima may suspend or terminate accounts that violate these Terms.",
    },
    {
      heading: "10. Liability Limitations",
      content: "Nima is not responsible for:",
      list: [
        "Fit inaccuracies from AI try-ons",
        "Seller misrepresentations",
        "Loss resulting from unauthorized account access",
      ],
    },
    {
      heading: "11. Governing Law",
      content: "Governed by the laws of Delaware, USA.",
    },
  ],
} as const;

export const CONTENT_MODERATION_GUIDELINES = {
  title: "Content Moderation & UGC Guidelines",
  rules: [
    "No explicit, violent, hateful, or illegal content.",
    "No copyrighted photos without permission.",
    "Violations may result in removal or termination.",
  ],
} as const;
