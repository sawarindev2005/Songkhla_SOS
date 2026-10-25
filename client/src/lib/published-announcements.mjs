// Authored announcements stay ahead of automatic place updates; React renders plain text.
export function publishedAnnouncements(rows = []) {
  return rows.filter((row) => row.is_published === 1 || row.is_published === true).map((row) => ({
    id: `admin-${row.id}`,
    kind: 'announcement',
    tone: row.tone,
    text: row.title,
    content: row.content,
    publishedAt: row.published_at,
    author: row.author_name || 'ผู้ดูแลระบบ',
  }));
}
