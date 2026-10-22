/**
 * Cool Fix - Customer Support Knowledge Base
 * Single source of truth: powers BOTH the chatbot (system instruction)
 * and the public FAQ page (GET /api/chatbot/faq).
 * All facts confirmed from the Cool Fix app as of Oct 2026.
 */
module.exports = [
  {
    id: 1,
    question: "How do I book a service?",
    answer: "Go to Book a Service and follow five steps: pick one or more services, enter how many units (1 to 3), choose a date and Morning or Afternoon, confirm your address with any notes, then review and confirm. You'll receive a booking reference immediately.",
    tags: ["booking", "book", "appointment"],
  },
  {
    id: 2,
    question: "What time slots are available?",
    answer: "Two arrival windows: Morning from 09:00 AM and Afternoon from 02:00 PM. We take a maximum of 3 units per visit, and the Afternoon window isn't available when 3 units are selected.",
    tags: ["time", "slot", "morning", "afternoon"],
  },
  {
    id: 3,
    question: "Can I cancel a booking?",
    answer: "Yes — on the Bookings page while the booking is Pending, Confirmed, Scheduled or Assigned. Once work is In Progress or completed, it can no longer be cancelled. Contact support if there's a problem.",
    tags: ["cancel", "booking"],
  },
  {
    id: 4,
    question: "How often should my aircon be serviced?",
    answer: "We recommend a full service about every 90 days to keep cooling efficient and prevent costly breakdowns. Your dashboard shows a next-due date for each unit.",
    tags: ["frequency", "how often", "maintenance"],
  },
  {
    id: 5,
    question: "How do I register my aircon unit?",
    answer: "Open My Aircon Units and add the brand, model, type and serial number. Registered units appear on your dashboard.",
    tags: ["register", "unit", "aircon"],
  },
  {
    id: 6,
    question: "Who will service my aircon?",
    answer: "A technician is assigned closer to your booking date. Once assigned, their name, rating and number of jobs completed appear in your booking details.",
    tags: ["technician", "who"],
  },
  {
    id: 7,
    question: "Will I get a service report?",
    answer: "Yes. After the visit, the technician's findings appear in your booking details and in Recent activity on your dashboard.",
    tags: ["report", "findings"],
  },
  {
    id: 8,
    question: "Do you offer service packages or subscriptions?",
    answer: "Yes — see the My Subscriptions page for the packages on your account, or browse the plans catalogue to see what's available.",
    tags: ["package", "subscription", "plan"],
  },
  {
    id: 9,
    question: "How do I use a promotion code?",
    answer: "Active promotions and their codes are shown on the promotions section. Enter the code in the promo box in the booking summary before you confirm your booking.",
    tags: ["promo", "discount", "code", "voucher"],
  },
  {
    id: 10,
    question: "How is the price calculated?",
    answer: "Each service has a per-unit price. Your estimated total is the service price multiplied by your number of units, minus any promotion. Live prices are shown on the Book a Service page.",
    tags: ["price", "cost", "pricing"],
  },
  {
    id: 11,
    question: "Do you have loyalty points?",
    answer: "Yes — your loyalty points balance is shown on your dashboard together with your total spend.",
    tags: ["loyalty", "points", "rewards"],
  },
  {
    id: 12,
    question: "Is your work guaranteed?",
    answer: "Yes, every visit comes with a 30-day workmanship guarantee.",
    tags: ["guarantee", "warranty"],
  },
  {
    id: 13,
    question: "What are your support hours?",
    answer: "Our support team is available Monday to Saturday, 9am to 6pm. Hotline: +65 8686 2311.",
    tags: ["hours", "contact", "hotline", "support"],
  },
  {
    id: 14,
    question: "I need to talk to a real person",
    answer: "Of course — call our hotline at +65 8686 2311 (Monday to Saturday, 9am to 6pm), or use the support section on your dashboard.",
    tags: ["human", "person", "call", "agent"],
  },
];