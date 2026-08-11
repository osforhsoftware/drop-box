import { COMPANY_NAME, CONTACT, SHIPPING_INFO } from "./company";

const LAST_UPDATED = "July 3, 2026";

export const POLICY_PAGES = {
  privacy: {
    slug: "privacy",
    path: "/privacy",
    title: "Privacy Policy",
    eyebrow: "Legal",
    lastUpdated: LAST_UPDATED,
    intro: `This Privacy Policy explains how ${COMPANY_NAME} collects, uses, and protects your personal information when you use our website, place orders, or contact us.`,
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Account details such as name, email address, and phone number when you register or checkout.",
          "Shipping address, pincode, and state required to fulfill your order.",
          "Order details including phone model, case type, design uploads, and payment references (UTR).",
          "Communications you send via our contact form, email, or Instagram direct messages.",
          "Technical data such as browser type, device information, and usage patterns collected through standard analytics and security measures.",
        ],
      },
      {
        heading: "How we use your information",
        body: [
          "Process and fulfill custom phone case orders, including printing and delivery.",
          "Verify UPI payments and communicate order status updates.",
          "Respond to support requests, design inquiries, and mockup approvals.",
          "Improve our products, website experience, and fraud prevention.",
          "Send transactional messages related to your order. We do not sell your personal data to third parties.",
        ],
      },
      {
        heading: "Design uploads & custom content",
        body: [
          "Images and artwork you upload are used solely to produce your order and provide print-ready files to our fulfillment partners.",
          "You are responsible for ensuring you have the rights to any images, logos, or artwork you submit.",
          `${COMPANY_NAME} may retain order files for quality assurance and reprint support for a reasonable period.`,
        ],
      },
      {
        heading: "Data sharing",
        body: [
          "We share necessary order and shipping details with courier partners to deliver your package.",
          "Payment verification is handled through UPI; we do not store full bank or card credentials.",
          "We may disclose information if required by law or to protect our rights, customers, and platform.",
        ],
      },
      {
        heading: "Data retention & security",
        body: [
          "We retain order and account data as long as needed to fulfill orders, comply with legal obligations, and resolve disputes.",
          "We use industry-standard safeguards including secure connections and access controls. No method of transmission over the internet is 100% secure.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You may request access to, correction of, or deletion of your personal data by contacting us at the address below.",
          "You may opt out of non-essential marketing communications at any time.",
        ],
      },
      {
        heading: "Contact",
        body: [
          `For privacy-related questions, email ${CONTACT.email} or message us on Instagram at ${CONTACT.instagram.handle}.`,
        ],
      },
    ],
  },
  terms: {
    slug: "terms",
    path: "/terms",
    title: "Terms & Conditions",
    eyebrow: "Legal",
    lastUpdated: LAST_UPDATED,
    intro: `By accessing or using the ${COMPANY_NAME} website and placing an order, you agree to these Terms & Conditions. Please read them carefully before purchasing.`,
    sections: [
      {
        heading: "About CASEBOX",
        body: [
          `${COMPANY_NAME} is a premium custom phone case brand based in India. We sell pre-designed templates and fully customized cases printed to your specifications.`,
        ],
      },
      {
        heading: "Orders & customization",
        body: [
          "All custom orders require accurate phone model, case type, and design details. You are responsible for reviewing mockups and proofs before we proceed to print.",
          "Once a custom design is approved and printing begins, changes may not be possible.",
          "We reserve the right to refuse orders that contain offensive, illegal, or infringing content.",
          "Product images on the site are representative. Minor color variation may occur due to screen settings and print processes.",
        ],
      },
      {
        heading: "Pricing & payment",
        body: [
          "Prices are listed in Indian Rupees (INR) and include applicable product costs unless stated otherwise.",
          `Shipping is charged at a flat rate of ₹80 across ${SHIPPING_INFO.coverage.toLowerCase()}.`,
          "Payment is accepted via UPI. Orders are processed after payment verification by our team.",
          "Promotional codes and offers are subject to their stated terms and may be modified or withdrawn at any time.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          `${COMPANY_NAME} branding, website content, and template designs are owned by ${COMPANY_NAME} or its licensors.`,
          "You retain ownership of artwork you upload, but grant us a license to use it solely to fulfill your order.",
        ],
      },
      {
        heading: "Limitation of liability",
        body: [
          `${COMPANY_NAME} is not liable for indirect, incidental, or consequential damages arising from use of our products or website.`,
          "Our liability for any order is limited to the amount you paid for that order.",
          "Phone cases provide protection but cannot guarantee against all damage from drops or impact.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "These terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in India.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these Terms & Conditions from time to time. Continued use of the site after changes constitutes acceptance of the updated terms.",
        ],
      },
    ],
  },
  returns: {
    slug: "returns",
    path: "/returns",
    title: "Refund & Replacement Policy",
    eyebrow: "Legal",
    lastUpdated: "July 15, 2026",
    intro:
      "At Casebox, every product is carefully inspected and quality-checked before dispatch. If you receive a damaged, defective, or incorrect product, we’re here to help.",
    sections: [
      {
        heading: "Refund Eligibility",
        body: [
          "Refunds will be issued only under the following circumstances:",
          "Out-of-Stock Situations: If an order is placed and the product becomes unavailable or is found to be out of stock, the full amount paid by the customer will be refunded within 4-5 working days.",
        ],
      },
      {
        heading: "Replacement Only",
        body: [
          "We offer replacements only. Refunds are not provided under any circumstances.",
        ],
      },
      {
        heading: "Unboxing Video Requirement",
        body: [
          "A complete, uninterrupted unboxing video is mandatory to process any replacement request.",
          "The video must clearly show the sealed package being opened from the beginning.",
          "The product and the issue must be clearly visible.",
          "Claims without a complete unboxing video will not be accepted.",
        ],
      },
      {
        heading: "Eligibility for Replacement",
        body: [
          "Your replacement request will be approved only if:",
          "You receive a damaged, defective, or incorrect product.",
          "You contact us within 48 hours of delivery.",
          "You provide a valid unboxing video as proof.",
          "Camera cutout or camera coverage differences based on phone model design are not considered manufacturing defects.",
          "Damage caused by accidental drops, misuse, improper installation, scratches after use, or normal wear and tear is not eligible for replacement.",
        ],
      },
      {
        heading: "How to File a Replacement Request",
        body: [
          "Note your Order ID from the Order History page.",
          "Send the defect/damage video to our WhatsApp (+918137953532) with your Order ID.",
          "Our team will verify your request, and if valid, process the replacement promptly.",
        ],
      },
    ],
  },
  shipping: {
    slug: "shipping",
    path: "/shipping",
    title: "Shipping Policy",
    eyebrow: "Legal",
    lastUpdated: LAST_UPDATED,
    intro: `${COMPANY_NAME} ships custom phone cases across India. Below is everything you need to know about fulfillment, fees, and delivery timelines.`,
    sections: [
      {
        heading: "Coverage",
        body: [SHIPPING_INFO.coverage + "."],
      },
      {
        heading: "Shipping fee",
        body: [SHIPPING_INFO.feeNote],
      },
      {
        heading: "Processing time",
        body: [
          SHIPPING_INFO.fulfillment,
          "Custom orders may require additional time for design approval and mockup confirmation before printing.",
        ],
      },
      {
        heading: "Delivery timeline",
        body: [
          SHIPPING_INFO.deliveryNote,
          "Delivery times may vary for remote pin codes, festivals, or courier delays beyond our control.",
          "You will receive tracking information once your order is dispatched.",
        ],
      },
      {
        heading: "Address accuracy",
        body: [
          "Please ensure your shipping name, address, pincode, and phone number are correct at checkout.",
          "We are not responsible for failed delivery due to incorrect address details provided by the customer.",
        ],
      },
      {
        heading: "Order tracking",
        body: [
          "Track your order anytime using your order ID on our Track Order page.",
          "For shipping questions, contact us with your order ID for the fastest response.",
        ],
      },
    ],
  },
};

export const FAQ_ITEMS = [
  {
    question: "How do I place a custom order?",
    answer: `Use the Customize page to select your phone brand, model, and case type, then upload your design. You can also message us on Instagram (${CONTACT.instagram.handle}) for fully bespoke requests with mockups before printing.`,
  },
  {
    question: "Which phone models do you support?",
    answer: "We support major iPhone and Android models including Samsung Galaxy S series and other popular brands. Check the Customize or Shop pages for the full live catalog.",
  },
  {
    question: "What case types are available?",
    answer: "We offer Premium Gloss Shell, Premium Glass, Metal, Hard, and Soft cases — plus customizable Pop Sliders. Availability may vary by phone model.",
  },
  {
    question: "How does payment work?",
    answer: "After checkout, pay via UPI using the QR code or UPI ID shown on the payment page. Upload your payment screenshot and enter the UTR/reference number so we can verify your order.",
  },
  {
    question: "How long does shipping take?",
    answer: `${SHIPPING_INFO.deliveryNote} ${SHIPPING_INFO.feeNote}`,
  },
  {
    question: "Can I track my order?",
    answer: "Yes. Use the Track Order page and enter your order ID (e.g. FRM-YYMMDD-XXXXXX) to see real-time status from payment verification through delivery.",
  },
  {
    question: "Can I return or exchange my case?",
    answer:
      "We offer replacements only for damaged, defective, or incorrect products when you contact us within 48 hours of delivery with a complete unboxing video. Refunds apply only for out-of-stock situations. See our Refund & Replacement Policy for full details.",
  },
  {
    question: "What if my design has a mistake?",
    answer: "Review your design carefully before checkout. For custom orders, contact us immediately after placing the order — before printing starts — and we will try to help. Changes may not be possible once production begins.",
  },
  {
    question: "Do you ship outside India?",
    answer: `Currently we ship ${SHIPPING_INFO.coverage.toLowerCase()} only. International shipping is not available at this time.`,
  },
  {
    question: "How do I contact support?",
    answer: `Fastest response: Instagram DM at ${CONTACT.instagram.handle}. You can also use our Contact form or email ${CONTACT.email}. Include your order ID for order-related queries.`,
  },
];
