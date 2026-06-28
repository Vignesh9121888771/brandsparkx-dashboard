const db = require('../db');

const getAISuggestion = async (req, res, next) => {
  try {
    const { task_title, task_description, required_role } = req.body;

    // Get all members with their current capacity
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

    // Debug
console.log(
  "Gemini key loaded:",
  !!process.env.GEMINI_API_KEY
);

console.log(
  "Gemini key prefix:",
  process.env.GEMINI_API_KEY?.substring(0, 8)
);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a resource allocation assistant for BrandSparkX, a digital marketing agency with operations in India and UAE.

Task to assign: "${task_title}"
Description: "${task_description || 'No description provided'}"
Required role: "${required_role || 'Any'}"

Available team members and their current workload:
${JSON.stringify(membersData, null, 2)}

Based on the task requirements, role match, and available capacity, suggest the best person to assign this task to.
Keep your response concise — 3 short paragraphs max:
1. Who you recommend and why
2. Any overallocation risk to watch out for
3. One alternative if the first choice is unavailable`
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
  console.error("Gemini Status:", response.status);
  console.error("Gemini API Error:", JSON.stringify(data, null, 2));

  throw new Error(
    data.error?.message || `Gemini API returned ${response.status}`
  );
}
    const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate suggestion.';
    res.json({ success: true, suggestion, members: membersData });
  } catch (err) {
  console.error("AI Controller Error:", err);
  next(err);
}
};

module.exports = { getAISuggestion };
