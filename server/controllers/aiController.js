const db = require('../db');

const getAISuggestion = async (req, res, next) => {
  try {
    const { task_title, task_description, required_role } = req.body;

    const members = await db.query(`
      SELECT m.id, m.name, m.role, m.region,
        COALESCE(SUM(a.allocation_percent), 0) AS allocated_percent,
        100 - COALESCE(SUM(a.allocation_percent), 0) AS available_percent
      FROM members m
      LEFT JOIN allocations a ON m.id = a.member_id
      GROUP BY m.id, m.name, m.role, m.region
      ORDER BY allocated_percent ASC
    `);

    const membersData = members.rows.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      region: m.region,
      allocated: m.allocated_percent + '%',
      available: m.available_percent + '%'
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a resource allocation assistant for BrandSparkX.

Task to assign: "${task_title}"
Description: "${task_description || 'No description provided'}"
Required role: "${required_role || 'Any'}"

Available team members and their current workload:
${JSON.stringify(membersData, null, 2)}

Provide a concise response (3 short paragraphs):
1. Best person for the task, matching role and highest available capacity. Include an 'AI Estimated Time' (in hours) for how long this task should take based on the description.
2. Any utilization risks or upcoming deadlines to consider.
3. One backup option if the first choice is unavailable.`
            }]
          }]
        })
      }
    );

    if (!response.ok) throw new Error("AI Service Unavailable");
    const data = await response.json();
    const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate suggestion.';
    res.json({ success: true, suggestion, members: membersData });
  } catch (err) { next(err); }
};

module.exports = { getAISuggestion };
