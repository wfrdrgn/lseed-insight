// utils/allowList.js

// ----- Canonical options (arrays) -----
const BUSINESS_AREAS = Object.freeze([
  "Application Development",
  "Business Registration Process",
  "Community Development",
  "Expansion/Acceleration",
  "Finance",
  "Human Resource",
  "Intellectual Property",
  "Legal Aspects and Compliance",
  "Management",
  "Marketing",
  "Online engagement",
  "Operations",
  "Product Development",
  "Sales",
  "Supply Chain and Logistics",
  "Technology Development",
  "Social Impact",
]);

const PREFERRED_TIME = Object.freeze([
  "Weekday (Morning) 8AM - 12NN",
  "Weekday (Afternoon) 1PM - 5PM",
  "Other",
]);

const COMMUNICATION_MODES = Object.freeze([
  "Face to Face",
  "Facebook Messenger",
  "Google Meet",
  "Zoom",
  "Other",
]);

// ----- Sets for O(1) membership checks -----
const ALLOWED_BUSINESS_AREAS = new Set(BUSINESS_AREAS);
const ALLOWED_PREF_TIME     = new Set(PREFERRED_TIME);
const ALLOWED_COMM_MODES    = new Set(COMMUNICATION_MODES);

// ----- Helpers -----
function normalizeOption(s) {
  return String(s || "").trim();
}

/**
 * Keep only allowed values, de-duplicate, and preserve order.
 * Exact, case-sensitive match (frontend should send canonical labels).
 */
function filterAllowed(arr, allowedSet) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const n = normalizeOption(v);
    if (!n) continue;
    if (allowedSet.has(n) && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

/**
 * Validate a single selection and return the normalized value.
 * Throws an error with code 'INVALID_OPTION' if not allowed.
 */
function assertAllowedSingle(value, allowedSet, fieldName = "value") {
  const n = normalizeOption(value);
  if (!allowedSet.has(n)) {
    const err = new Error(`${fieldName} must be one of the allowed values.`);
    err.code = "INVALID_OPTION";
    err.allowed = Array.from(allowedSet);
    throw err;
  }
  return n;
}

module.exports = {
  // Arrays (useful for sending to frontend)
  BUSINESS_AREAS,
  PREFERRED_TIME,
  COMMUNICATION_MODES,

  // Sets (fast validation)
  ALLOWED_BUSINESS_AREAS,
  ALLOWED_PREF_TIME,
  ALLOWED_COMM_MODES,

  // Utilities
  normalizeOption,
  filterAllowed,
  assertAllowedSingle,
};
