const express = require("express");
const bcrypt = require('bcrypt'); // For password hashing
const session = require("express-session");
const cookieParser = require('cookie-parser');
const { login, logout, protectedRoute, forgotPassword } = require("../controllers/authController");
const pgDatabase = require("../database.js"); // Import PostgreSQL client
const { passwordMeetsPolicy } = require("../utils/validators.js");

const router = express.Router();

router.use(cookieParser()); // Middleware to parse cookies

// router.post("/", login);
router.post('/forgot-password', forgotPassword);
// router.get("/logout", logout);
router.get("/protected", protectedRoute);

const saltRounds = 10;
const MIN_PASSWORD_AGE_MS = 24 * 60 * 60 * 1000; // 1 day
const PASSWORD_HISTORY_DEPTH = 5;                 // last N passwords disallowed

// const sessionId = crypto.randomUUID();

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    console.log("🚨 Unauthorized: No session found.");
    return res.status(401).json({ error: "Unauthorized: No session found." });
  }

  console.log("[authRoutes]✅ User is authenticated:", req.session.user);
  // Add additional validation, like checking the session ID in a database or store if needed.
  next();
};

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!passwordMeetsPolicy(newPassword)) {
      return res.status(400).json({
        code: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
      });
    }

    // 1) Validate token
    const result = await pgDatabase.query(
      `SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ code: "BAD_TOKEN", message: "Invalid or expired token" });
    }
    const { user_id: userId, expires_at } = result.rows[0];
    if (new Date() > new Date(expires_at)) {
      return res.status(400).json({ code: "EXPIRED_TOKEN", message: "Token has expired" });
    }

    // 2) Get current password & last change time
    const q = await pgDatabase.query(
      `SELECT password, password_changed_at FROM users WHERE user_id = $1`,
      [userId]
    );
    if (q.rows.length === 0) {
      return res.status(404).json({ code: "NO_USER", message: "User not found." });
    }
    const currentHash = q.rows[0].password || "";

    // 2a) (Optional) Min-age on resets too
    const MIN_AGE_MS = 24 * 60 * 60 * 1000;
    const lastChanged = q.rows[0].password_changed_at ? new Date(q.rows[0].password_changed_at).getTime() : null;
    if (Number.isFinite(lastChanged)) {
      const elapsed = Date.now() - lastChanged;
      if (elapsed < MIN_AGE_MS) {
        const nextEligibleAt = new Date(lastChanged + MIN_AGE_MS).toISOString();
        const hoursLeft = Math.ceil((MIN_AGE_MS - elapsed) / (60 * 60 * 1000));
        return res.status(429).json({
          code: "TOO_SOON",
          message: `You can change your password again in ~${hoursLeft} hour(s).`,
          nextEligibleAt,
          hoursLeft
        });
      }
    }

    // 3) Re-use prevention (current + last N hashes)
    const REUSE_WINDOW = 5;
    const h = await pgDatabase.query(
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
        return res.status(400).json({
          code: "PASSWORD_REUSE",
          message: "You’ve used this password before. Please choose a different password."
        });
      }
    }

    // 4) Update password + history inside a transaction
    const client = await pgDatabase.connect();
    try {
      await client.query("BEGIN");

      // insert current hash into history (only if it exists)
      if (currentHash) {
        await client.query(
          `INSERT INTO password_history (user_id, password_hash, changed_at)
           VALUES ($1, $2, NOW())`,
          [userId, currentHash]
        );
      }

      // set new password
      const newHash = await bcrypt.hash(newPassword, 12);
      await client.query(
        `UPDATE users
           SET password = $2,
               password_changed_at = NOW()
         WHERE user_id = $1`,
        [userId, newHash]
      );

      // burn token
      await client.query(`DELETE FROM password_reset_tokens WHERE token = $1`, [token]);

      // (optional) keep only the last REUSE_WINDOW rows + current in history
      await client.query(
        `DELETE FROM password_history
          WHERE user_id = $1
            AND id NOT IN (
              SELECT id FROM password_history
               WHERE user_id = $1
               ORDER BY changed_at DESC
               LIMIT $2
            )`,
        [userId, REUSE_WINDOW]  // keep last N
      );

      await client.query("COMMIT");
    } catch (txErr) {
      try { await client.query("ROLLBACK"); } catch {}
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    return res.status(500).json({ code: "SERVER_ERROR", message: 'Internal server error' });
  }
});

// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Query to fetch user data from PostgreSQL
//     const result = await pgDatabase.query('SELECT * FROM users WHERE email = $1', [email]);
//     const user = result.rows[0]; // Assuming email is unique, we take the first result

//     console.log("[Login Route] Fetched user from DB:", user);

//     if (!user) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Verify password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     console.log("[Login Route] User object before session storage:", user);

//     // Check if account is active
//     if (!user.isactive) {
//       return res.status(403).json({ message: 'Your account is pending verification. Please wait for LSEED to verify your account.' });
//     }

//     // ✅ Generate a unique session ID
//     const sessionId = crypto.randomUUID();

//     try {
//       console.log('[authRoutes] Inserting session into active_sessions');
//       // ✅ Insert the session ID into `active_sessions`
//       const sessionInsertQuery = `
//         INSERT INTO active_sessions (session_id, user_id) VALUES ($1, $2)
//       `;
//       await pgDatabase.query(sessionInsertQuery, [sessionId, user.user_id]);

//     } catch (error) {
//       console.error('Error inserting session:', error);
//     }
//     console.log("[authRoutes] Session ID (global):", sessionId);

//     // ✅ Store user details in the session
//     req.session.user = {
//       id: user.user_id,
//       email: user.email,
//       role: user.cleanedRoles,
//       firstName: user.first_name,
//       lastName: user.last_name,
//       sessionId: sessionId,
//     };

//     console.log("[authRoutes] Session after login:", req.session.user.sessionId); // Add this log

//     // ✅ Set session ID in a cookie
//     res.cookie("session_id", sessionId, { httpOnly: true, secure: false });

//     // Separate handling for admin and normal users
//     if (user.roles === "Administrator") {
//       return res.json({
//         message: "Admin login successful",
//         user: { id: user.user_id, email: user.email, role: user.roles },
//         session_id: sessionId,
//         redirect: "/admin",
//       });
//     } else {
//       return res.json({
//         message: "User login successful",
//         user: { id: user.user_id, email: user.email, role: user.roles, firstname: user.first_name, lastname: user.last_name },
//         session_id: sessionId,
//         redirect: "/dashboard", // Normal users go to their dashboard
//       });
//     }
//   } catch (error) {
//     console.error('Login Error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

router.get("/users", async (req, res) => {
  try {
    const query = `
      SELECT
          u.user_id AS id,
          u.first_name || ' ' || u.last_name AS name,
          u.email,
          -- Aggregate roles into an array
          ARRAY_AGG(uhr.role_name) AS roles
      FROM
          users u
      LEFT JOIN
          user_has_roles uhr ON u.user_id = uhr.user_id
      GROUP BY
          u.user_id, u.first_name, u.last_name, u.email
      ORDER BY
          u.first_name, u.last_name;
    `;

    const result = await pool.query(query);

    // Clean up the roles array from [null] to [] for users with no roles
    const usersWithCleanRoles = result.rows.map(user => {
      // If roles is [null], change it to an empty array
      const cleanedRoles = user.roles && user.roles.length > 0 && user.roles[0] !== null
        ? user.roles
        : [];
      return {
        ...user,
        roles: cleanedRoles,
      };
    });

    res.json(usersWithCleanRoles);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "Server error fetching users" });
  }
});

router.get("/mentors", async (req, res) => {
  try {
    const result = await pgDatabase.query(`SELECT mentor_id, mentor_firstname || ' ' || mentor_lastname AS name, calendarlink FROM mentors`);
    res.json(result.rows);
  } catch (err) {
    console.error("Database Error:", err);  // Improved logging
    res.status(500).json({ error: "Error fetching mentors" });
  }
});

// GET /auth/reset-password/validate?token=...
router.get("/reset-password/validate", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: "Missing token" });
  }

  try {
    // Optional: clean up any expired tokens first
    await pgDatabase.query(`DELETE FROM password_reset_tokens WHERE expires_at <= NOW()`);

    // Validate: token exists and not expired
    const { rows } = await pgDatabase.query(
      `SELECT 1 FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Token is good
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error validating reset token:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = {
  router,
  requireAuth,
};