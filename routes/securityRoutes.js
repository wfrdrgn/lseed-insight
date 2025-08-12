const express = require("express");
const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const router = express.Router();

const db = require("../database");
const { requireAuth } = require("./authRoutes");
const { passwordMeetsPolicy } = require("../utils/validators");

const MIN_PASSWORD_AGE_MS = 24 * 60 * 60 * 1000; // 1 day
const PASSWORD_HISTORY_DEPTH = 5;                 // last N passwords disallowed

// ------------------------
// 2FA
// ------------------------

/**
 * GET /api/security/2fa/status
 * -> { enabled: boolean }
 */
router.get("/2fa/status", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    const q = await db.query(
      `SELECT enabled FROM user_twofa WHERE user_id = $1`,
      [userId]
    );
    return res.json({ enabled: q.rows[0]?.enabled || false });
  } catch (err) {
    console.error("GET /2fa/status", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * GET /api/security/2fa/setup
 * -> { qrCodeDataURL, secret }
 */
router.get("/2fa/setup", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    const u = await db.query(`SELECT email FROM users WHERE user_id = $1`, [userId]);
    const email = u.rows[0]?.email || `user-${userId}`;

    const secret = speakeasy.generateSecret({
      name: `LSEED (${email})`,
      length: 20,
    });

    // Upsert pending secret
    await db.query(
      `
      INSERT INTO user_twofa (user_id, pending_secret_base32, enabled)
      VALUES ($1, $2, false)
      ON CONFLICT (user_id)
      DO UPDATE SET pending_secret_base32 = EXCLUDED.pending_secret_base32
      `,
      [userId, secret.base32]
    );

    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qrCodeDataURL,
      secret: secret.base32, // optional to show
    });
  } catch (err) {
    console.error("GET /2fa/setup", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * POST /api/security/2fa/enable
 * body: { code }
 */
router.post("/2fa/enable", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: "Missing code." });

    const row = await db.query(
      `SELECT pending_secret_base32 FROM user_twofa WHERE user_id = $1`,
      [userId]
    );
    const pending = row.rows[0]?.pending_secret_base32;
    if (!pending) return res.status(400).json({ message: "No 2FA setup in progress." });

    const ok = speakeasy.totp.verify({
      secret: pending,
      encoding: "base32",
      token: String(code),
      window: 1,
    });

    if (!ok) return res.status(400).json({ message: "Invalid 2FA code." });

    await db.query(
      `
      UPDATE user_twofa
      SET enabled = true,
          secret_base32 = $2,
          pending_secret_base32 = NULL
      WHERE user_id = $1
      `,
      [userId, pending]
    );

    res.json({ message: "2FA enabled." });
  } catch (err) {
    console.error("POST /2fa/enable", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * POST /api/security/2fa/disable
 */
router.post("/2fa/disable", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    await db.query(
      `
      INSERT INTO user_twofa (user_id, enabled, secret_base32, pending_secret_base32)
      VALUES ($1, false, NULL, NULL)
      ON CONFLICT (user_id)
      DO UPDATE SET enabled=false, secret_base32=NULL, pending_secret_base32=NULL
      `,
      [userId]
    );

    res.json({ message: "2FA disabled." });
  } catch (err) {
    console.error("POST /2fa/disable", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ------------------------
// Security Questions
// ------------------------

/**
 * GET /api/security/security-questions
 * -> [{ question, answer: "" }, ...]
 * (Never return answers/hashes)
 */
router.get("/security-questions", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    const q = await db.query(
      `
      SELECT position, question
      FROM user_security_questions
      WHERE user_id = $1
      ORDER BY position ASC
      `,
      [userId]
    );

    res.json(q.rows.map((r) => ({ question: r.question, answer: "" })));
  } catch (err) {
    console.error("GET /security-questions", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * PUT /api/security/security-questions
 * body: { questions: [{question, answer}, ...] }  (up to 3)
 * (Answers are hashed)
 */
router.put("/security-questions", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Invalid questions payload." });
    }

    const trimmed = questions.slice(0, 3).map((q, i) => ({
      position: i + 1,
      question: String(q.question || "").trim(),
      answer: String(q.answer || "").trim(),
    }));

    if (trimmed.some((x) => !x.question || !x.answer)) {
      return res.status(400).json({ message: "Question and answer are required." });
    }

    // Hash answers
    const hashed = await Promise.all(
      trimmed.map(async (x) => ({
        position: x.position,
        question: x.question,
        answer_hash: await bcrypt.hash(x.answer, 12),
      }))
    );

    await db.query("BEGIN");
    try {
      for (const row of hashed) {
        await db.query(
          `
          INSERT INTO user_security_questions (user_id, position, question, answer_hash)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, position)
          DO UPDATE SET question = EXCLUDED.question,
                        answer_hash = EXCLUDED.answer_hash,
                        updated_at = now()
          `,
          [userId, row.position, row.question, row.answer_hash]
        );
      }
      await db.query("COMMIT");
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    }

    res.json({ message: "Security questions updated." });
  } catch (err) {
    console.error("PUT /security-questions", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ------------------------
// Change Password
// ------------------------

/**
 * POST /api/security/change-password
 * body: { currentPassword, newPassword }
 */
// POST /api/security/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const userId = req.session?.user?.id;
    const { currentPassword, newPassword } = req.body || {};
    if (!userId) return res.status(401).json({ message: "Not authenticated." });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing fields." });
    }
    if (!passwordMeetsPolicy(newPassword)) {
      return res.status(400).json({
        message: "Password does not meet complexity requirements."
      });
    }

    await client.query("BEGIN");

    // Lock the row for consistency
    const q = await client.query(
      `SELECT password, password_changed_at FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    if (q.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found." });
    }

    const currentHash = q.rows[0].password || "";
    const ok = await bcrypt.compare(currentPassword, currentHash);
    if (!ok) {
      await client.query("ROLLBACK");
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Min age: 24h since users.password_changed_at
    const MIN_AGE_MS = 24 * 60 * 60 * 1000;
    const lastChanged = q.rows[0].password_changed_at ? new Date(q.rows[0].password_changed_at).getTime() : null;
    if (Number.isFinite(lastChanged)) {
      const elapsed = Date.now() - lastChanged;
      if (elapsed < MIN_AGE_MS) {
        const nextEligibleAt = new Date(lastChanged + MIN_AGE_MS).toISOString();
        const hoursLeft = Math.ceil((MIN_AGE_MS - elapsed) / (60 * 60 * 1000));
        await client.query("ROLLBACK");
        return res.status(429).json({
          code: "TOO_SOON",
          message: `You can change your password again in ~${hoursLeft} hour(s).`,
          nextEligibleAt,
          hoursLeft
        });
      }
    }

    // Re-use prevention: compare against current + last N hashes
    const REUSE_WINDOW = 5;
    const h = await client.query(
      `SELECT password_hash FROM password_history
     WHERE user_id = $1
     ORDER BY changed_at DESC
     LIMIT $2`,
      [userId, REUSE_WINDOW]
    );
    const hashesToCheck = [currentHash, ...h.rows.map(r => r.password_hash)];
    for (const oldHash of hashesToCheck) {
      if (!oldHash) continue;
      const reused = await bcrypt.compare(newPassword, oldHash);
      if (reused) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          code: "PASSWORD_REUSE",
          message: "You’ve used this password before. Please choose a different password."
          // optionally also include: blockedWindow: Math.min(REUSE_WINDOW + 1, hashesToCheck.length)
        });
      }
    }

    // Everything OK → hash and update
    const newHash = await bcrypt.hash(newPassword, 12);

    // Store the *current* hash into history before changing it
    await client.query(
      `INSERT INTO password_history (user_id, password_hash, changed_at)
       VALUES ($1, $2, NOW())`,
      [userId, currentHash]
    );

    await client.query(
      `UPDATE users
         SET password = $2,
             password_changed_at = NOW()
       WHERE user_id = $1`,
      [userId, newHash]
    );

    await client.query("COMMIT");
    return res.json({ message: "Password changed." });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { }
    console.error("POST /change-password", err);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// POST /api/security/change-password/verify-current
router.post("/change-password/verify-current", async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const { currentPassword } = req.body || {};
    if (!userId) return res.status(401).json({ message: "Not authenticated." });
    if (!currentPassword) return res.status(400).json({ message: "Missing current password." });

    const q = await db.query(
      `SELECT password, password_changed_at FROM users WHERE user_id = $1`,
      [userId]
    );
    if (q.rows.length === 0) return res.status(404).json({ message: "User not found." });

    const { password: currentHash, password_changed_at } = q.rows[0];
    const ok = await bcrypt.compare(currentPassword, currentHash || "");
    if (!ok) return res.status(401).json({ message: "Current password is incorrect." });

    // Min age check (24h)
    const MIN_AGE_MS = 24 * 60 * 60 * 1000;
    const last = password_changed_at ? new Date(password_changed_at).getTime() : null;
    let eligible = true, hoursLeft = 0, nextEligibleAt = null;
    if (Number.isFinite(last)) {
      const elapsed = Date.now() - last;
      if (elapsed < MIN_AGE_MS) {
        eligible = false;
        hoursLeft = Math.ceil((MIN_AGE_MS - elapsed) / (60 * 60 * 1000));
        nextEligibleAt = new Date(last + MIN_AGE_MS).toISOString();
      }
    }

    return res.json({ ok: true, eligible, hoursLeft, nextEligibleAt });
  } catch (err) {
    console.error("POST /change-password/verify-current", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


module.exports = router;
