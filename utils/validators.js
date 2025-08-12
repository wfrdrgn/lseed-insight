// Email: length + format (simplified RFC5322), local ≤ 64, total ≤ 254
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

function isEmail(email) {
  if (typeof email !== "string") return false;
  if (email.length < 3 || email.length > 254) return false;
  const [local] = email.split("@");
  if (!local || local.length > 64) return false;
  return EMAIL_RE.test(email);
}

// Names: letters + spaces + hyphen + apostrophe (with diacritics), 1–60 chars
// Reject digits & extraneous punctuation
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{1,60}$/u;
function isName(name) {
  if (typeof name !== "string") return false;
  const s = name.trim();
  return NAME_RE.test(s);
}

// Passwords:
//  - Allow printable ASCII (space–~), 8–128 chars
//  - Optional complexity toggle
const PASSWORD_ASCII_RE = /^[\x20-\x7E]{8,128}$/;

function passwordMeetsPolicy(pw, { enforceComplexity = true } = {}) {
  if (typeof pw !== "string") return false;
  if (!PASSWORD_ASCII_RE.test(pw)) return false;
  if (!enforceComplexity) return true;
  return /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

module.exports = { isEmail, isName, passwordMeetsPolicy };
