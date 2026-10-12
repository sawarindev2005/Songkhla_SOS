const router = require('express').Router();
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

async function one(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows[0];
}

// ตัวเลขสรุปสำหรับหน้าแรกของประชาชน
async function publicStats() {
  const requests = await one(`
    SELECT SUM(status = 'pending') AS pending,
           SUM(status IN ('assigned','in_progress')) AS in_progress,
           SUM(status = 'rescued') AS rescued
    FROM help_requests`);
  const teams = await one(`
    SELECT COUNT(DISTINCT assigned_to) AS active_teams
    FROM help_requests WHERE status IN ('assigned','in_progress')`);
  const shelters = await one(`
    SELECT COUNT(*) AS open_shelters,
           COALESCE(SUM(GREATEST(capacity - current_occupancy, 0)), 0) AS available_beds
    FROM shelters WHERE status = 'open'`);
  const dist = await one("SELECT COUNT(*) AS active_distributions FROM distribution_points WHERE status = 'active'");
  const rescuers = await one(`
    SELECT COUNT(*) AS rescuers_on_map FROM users
    WHERE role = 'rescuer' AND is_active = 1 AND current_lat IS NOT NULL
      AND location_updated_at > NOW() - INTERVAL 1 DAY`);

  return {
    pending: Number(requests.pending) || 0,
    in_progress: Number(requests.in_progress) || 0,
    rescued: Number(requests.rescued) || 0,
    ...teams,
    ...shelters,
    available_beds: Number(shelters.available_beds),
    ...dist,
    ...rescuers,
    updated_at: new Date(),
  };
}

router.get('/public', async (req, res) => {
  res.json(await publicStats());
});

router.get('/summary', verifyToken, requireRole('command', 'admin'), async (req, res) => {
  const [byStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM help_requests GROUP BY status');
  const [byUrgency] = await pool.query(`
    SELECT urgency, COUNT(*) AS count FROM help_requests
    WHERE status IN ('pending','assigned','in_progress') GROUP BY urgency`);
  const [daily] = await pool.query(`
    SELECT DATE_FORMAT(d.day, '%Y-%m-%d') AS day,
           (SELECT COUNT(*) FROM help_requests WHERE DATE(created_at) = d.day) AS created,
           (SELECT COUNT(*) FROM help_requests WHERE status = 'rescued' AND DATE(resolved_at) = d.day) AS rescued
    FROM (SELECT CURDATE() - INTERVAL n DAY AS day
          FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) t) d
    ORDER BY d.day`);
  const people = await one(`
    SELECT COALESCE(SUM(CASE WHEN status = 'rescued' THEN people_count END), 0) AS people_rescued,
           COALESCE(SUM(CASE WHEN status IN ('pending','assigned','in_progress') THEN people_count END), 0) AS people_waiting,
           SUM(status IN ('pending','assigned','in_progress') AND (has_elderly OR has_disabled OR has_patient)) AS vulnerable_waiting
    FROM help_requests`);
  const response = await one(`
    SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, assigned_at))) AS avg_assign_minutes,
           ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))) AS avg_resolve_minutes
    FROM help_requests WHERE assigned_at IS NOT NULL`);
  const [users] = await pool.query(
    'SELECT role, COUNT(*) AS count, SUM(is_active) AS active FROM users GROUP BY role'
  );
  const [teams] = await pool.query(`
    SELECT u.id, u.full_name, u.team_name,
           SUM(r.status IN ('assigned','in_progress')) AS active,
           SUM(r.status = 'rescued') AS rescued
    FROM users u LEFT JOIN help_requests r ON r.assigned_to = u.id
    WHERE u.role = 'rescuer' AND u.is_active = 1
    GROUP BY u.id ORDER BY rescued DESC, active DESC`);
  const [recent] = await pool.query(`
    SELECT r.id, r.case_no, r.requester_name, r.urgency, r.status, r.people_count, r.created_at,
           u.team_name AS rescuer_team
    FROM help_requests r LEFT JOIN users u ON u.id = r.assigned_to
    ORDER BY r.updated_at DESC LIMIT 10`);

  const num = (rows, key) =>
    Object.fromEntries(rows.map((r) => [r[key], Number(r.count)]));

  res.json({
    ...(await publicStats()),
    by_status: num(byStatus, 'status'),
    by_urgency: num(byUrgency, 'urgency'),
    daily: daily.map((d) => ({ ...d, created: Number(d.created), rescued: Number(d.rescued) })),
    people_rescued: Number(people.people_rescued),
    people_waiting: Number(people.people_waiting),
    vulnerable_waiting: Number(people.vulnerable_waiting) || 0,
    avg_assign_minutes: response.avg_assign_minutes,
    avg_resolve_minutes: response.avg_resolve_minutes,
    users: users.map((u) => ({ role: u.role, count: Number(u.count), active: Number(u.active) })),
    teams: teams.map((t) => ({ ...t, active: Number(t.active) || 0, rescued: Number(t.rescued) || 0 })),
    recent,
  });
});

module.exports = router;
