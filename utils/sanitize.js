// utils/sanitize.js
// For free-text fields: strip or escape dangerous chars
// Option A (strip a few characters quickly):
function stripDangerousChars(s) {
  return String(s || "").replace(/[<>{}]/g, "");
}

module.exports = { stripDangerousChars };
