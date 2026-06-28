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
  `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
);


console.log("Available Models:");
console.log(JSON.stringify(data, null, 2));

return res.json(data);

    const data = await response.json();

    console.log("Gemini Status:", response.status);
    console.log("Gemini Response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
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
