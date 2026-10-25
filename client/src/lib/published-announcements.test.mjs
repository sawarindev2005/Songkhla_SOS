import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishedAnnouncements } from './published-announcements.mjs';

test('hidden drafts are never mapped into the public ticker', () => {
  const rows = [{ id: 1, is_published: 0 }, { id: 2, is_published: false }, { id: 3, is_published: 1, title: 'ข่าว', content: 'รายละเอียด', tone: 'org' }];
  assert.deepEqual(publishedAnnouncements(rows).map((item) => item.id), ['admin-3']);
});

test('authored text, line breaks, author and publication time reach the detail view intact', () => {
  const content = 'บรรทัดแรก\n<img src=x onerror=alert(1)>\nบรรทัดสุดท้าย';
  const [item] = publishedAnnouncements([{ id: 5, is_published: true, title: 'ประกาศ', content, tone: 'info', author_name: 'แอดมิน', published_at: '2026-10-25T08:00:00Z' }]);
  assert.equal(item.content, content);
  assert.equal(item.author, 'แอดมิน');
  assert.equal(item.publishedAt, '2026-10-25T08:00:00Z');
  assert.equal(item.kind, 'announcement');
  assert.equal(item.action, undefined);
});
