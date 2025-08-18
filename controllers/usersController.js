const pgDatabase = require("../database.js"); // Import PostgreSQL client

// controllers/userController.js
exports.getUsers = async (excludeUserId) => {
  try {
    const query = `
      SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.isactive,
        COALESCE(
          ARRAY_AGG(uhr.role_name) FILTER (WHERE uhr.role_name IS NOT NULL),
          '{}'
        ) AS roles
      FROM users u
      LEFT JOIN user_has_roles uhr ON u.user_id = uhr.user_id
      WHERE u.user_id <> $1
      GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.isactive
      ORDER BY u.last_name, u.first_name;
    `;

    const result = await pgDatabase.query(query, [excludeUserId]);

    // Always return an array; let the route decide status & envelope
    return result.rows ?? [];
  } catch (error) {
    console.error("Error fetching users in userController:", error);
    throw error;
  }
};

exports.getUserName = async (user_id) => {
  try {
    console.log(`Fetching user by ID: ${user_id}`);

    const query = ` SELECT CONCAT(first_name, ' ', last_name) AS full_name 
                    FROM users 
                    WHERE user_id = $1`;
    const values = [user_id];

    const result = await pgDatabase.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching mentor by ID:", error);
    return null;
  }
};

exports.getLSEEDCoordinators = async () => {
  try {
    const query = `
        SELECT
            u.user_id,
            u.first_name,
            u.last_name,
            u.email
        FROM
            users u
            INNER JOIN user_has_roles ur ON u.user_id = ur.user_id
        WHERE
            ur.role_name = 'LSEED-Coordinator';
    `;
    const result = await pgDatabase.query(query);

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows;
  } catch (error) {
    console.error("Error fetching LSEED coordinators:", error);
    return [];
  }
};

exports.getLSEEDDirectors = async () => {
  try {
    const query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email
      FROM users u
      JOIN user_has_roles ur ON u.user_id = ur.user_id
      WHERE ur.role_name = 'LSEED-Director';
    `;
    const result = await pgDatabase.query(query);

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows;
  } catch (error) {
    console.error("Error fetching LSEED coordinators:", error);
    return [];
  }
};