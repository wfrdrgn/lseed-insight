const pgDatabase = require("../database");

exports.getTopStarTrend = async ({ from = null, to = null, se_id = null } = {}) => {
  // validate se_id if provided
  if (
    se_id &&
    !/^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[1-5][0-9a-fA-F-]{3}-[89abAB][0-9a-fA-F-]{3}-[0-9a-fA-F-]{12}$/.test(se_id)
  ) {
    throw new Error("INVALID_SE_ID");
  }

  const sql = `
    WITH params AS (
      SELECT
        $1::date AS from_date,
        $2::date AS to_date,
        $3::uuid AS only_se
    ),
    filt AS (
      SELECT r.se_id, r.m_start, r.score_0_100
      FROM se_monthly_ratings r, params p
      WHERE (p.from_date IS NULL OR r.m_start >= p.from_date)
        AND (p.to_date   IS NULL OR r.m_start <  p.to_date)   -- end-exclusive; use <= for inclusive
        AND (p.only_se   IS NULL OR r.se_id = p.only_se)
    ),
    overall AS (
      SELECT se_id, AVG(score_0_100) AS avg_score
      FROM filt
      GROUP BY se_id
    ),
    ranked AS (
      SELECT
        se_id,
        avg_score,
        ROW_NUMBER() OVER (ORDER BY avg_score DESC, se_id) AS rn
      FROM overall
    )
    SELECT
      f.se_id,
      f.m_start::date                 AS month,
      ROUND((f.score_0_100/20.0)*2)/2 AS stars_half,    -- 0..5 in 0.5 steps
      ROUND(f.score_0_100, 1)         AS score_0_100
    FROM filt f
    JOIN ranked k USING (se_id)
    ORDER BY month, f.se_id;
  `;

  const { rows } = await pgDatabase.query(sql, [from, to, se_id]);
  return rows ?? [];
};
