export interface SampleBatch {
  name: string;
  description: string;
  messages: string[];
}

export const SAMPLE_LOGISTICS_MESSAGES: string[] = [
  "Truck MH04 AB1234 has broken down near Pune. Today’s 11 AM delivery is pending.",
  "Delivery completed for order #8292.",
  "Vendor has not delivered packaging material needed for today’s dispatch.",
  "Customer says shipment #9921 is three days late and wants an urgent update.",
  "Driver says pickup at Andheri may be delayed by 45 minutes due to traffic.",
  "Invoice and proof of delivery have been shared by the vendor.",
  "Please confirm whether tomorrow’s pickup is scheduled."
];

export const SAMPLE_BATCHES: SampleBatch[] = [
  {
    name: "Morning Urgent Batch (7 messages)",
    description: "Standard morning logistics batch with breakdowns, delays, and confirmations",
    messages: SAMPLE_LOGISTICS_MESSAGES
  },
  {
    name: "Heavy Incident Batch (10 messages)",
    description: "Mix of multiple critical breakdowns, customer escalations, and route blocks",
    messages: [
      "Truck MH04 AB1234 has broken down near Pune. Today’s 11 AM delivery is pending.",
      "Customer escalation: Reliance Retail warehouse rejecting delivery #4401 because driver arrived without Gate Pass.",
      "Driver says pickup at Andheri may be delayed by 45 minutes due to traffic.",
      "Vendor has not delivered packaging material needed for today’s dispatch.",
      "Customer says shipment #9921 is three days late and wants an urgent update.",
      "Delivery completed for order #8292.",
      "Truck DL01 XY9988 met with minor tire puncture near Bhiwandi toll plaza. Driver safe, cargo intact.",
      "Invoice and proof of delivery have been shared by the vendor.",
      "Please confirm whether tomorrow’s pickup is scheduled.",
      "Customer asking for tracking link for shipment sent yesterday evening."
    ]
  },
  {
    name: "Routine & Vendor Updates (6 messages)",
    description: "Mostly routine status messages, PODs, and vendor queries",
    messages: [
      "Delivery completed for order #8292.",
      "Invoice and proof of delivery have been shared by the vendor.",
      "Please confirm whether tomorrow’s pickup is scheduled.",
      "Driver Ramesh signed out for the day after finishing 6 deliveries in Thane.",
      "Weekly diesel reimbursement slips uploaded to the shared folder.",
      "Delivery attempt for order #3312 successful, customer received OTP."
    ]
  }
];
