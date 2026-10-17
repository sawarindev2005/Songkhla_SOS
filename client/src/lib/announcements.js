// ประกาศจากศูนย์บัญชาการ สร้างอัตโนมัติจากข้อมูลจริงในระบบ (สถิติ / ที่พักพิง / จุดแจกจ่าย) ไม่ต้องมี API ข่าวสารแยก
// ข่าวจากกรมอุตุฯ ยังไม่ได้ใส่: API data.tmd.go.th เรียกจากเบราว์เซอร์ไม่ได้ (CORS อนุญาตเฉพาะ wxmap.tmd.go.th)
// ถ้าจะเพิ่ม ต้องให้ฝั่ง server ดึงมาให้ แล้วต่อท้ายรายการที่ buildAnnouncements คืน
//
// เลือกเฉพาะข่าวที่อ่านแล้วทำอะไรต่อได้ (ไปที่ไหน / รีบไป / เลี่ยงที่ไหน) ไม่ใส่ตัวเลขสถานการณ์ที่ซ้ำกับแผ่นด้านล่าง
//   รูปแบบ { id, kind: 'shelter' | 'distribution', tone, text, detail: { lines: [{ title, sub, at }], note }, action: { href, label } }
//   at = เวลาที่เจ้าหน้าที่แก้ข้อมูลสถานที่ครั้งล่าสุด (บอกว่าข้อมูลเก่าแค่ไหน)
//   tone: 'red' = ข่าวร้าย  'org' = เตือนภัย  'ok' = ข่าวดี
//   text อ่านจบในบรรทัดเดียวบนแถบข่าวสาร: ขึ้นต้นด้วยเรื่องที่เกิด ตามด้วยชื่อสถานที่ (ชื่อยาวถูกตัดด้วย … แต่ยังรู้ว่าเรื่องอะไร)
//   detail = รายละเอียดตอนแตะแถบข่าว  action = ปุ่มไปหน้าที่เกี่ยวข้อง

import { isNearFull, openHours, shelterFree } from '@/components/pk/domain';
import { formatNumber } from '@/lib/format';

const TONE_ORDER = { red: 0, org: 1, ok: 2 };
// จุดแจกที่จะปิดภายในเวลานี้ = ข่าว "ใกล้ปิด"
const CLOSING_SOON_MS = 60 * 60 * 1000;
const SHELTERS = { href: '/shelters', label: 'ดูที่พักพิงทั้งหมด' };
const DISTRIBUTIONS = { href: '/distributions', label: 'ดูจุดแจกจ่ายทั้งหมด' };

const freeText = (s) => `ว่าง ${formatNumber(shelterFree(s))} จาก ${formatNumber(s.capacity)} ที่`;
const hhmm = (t) => String(t).slice(0, 5);

// เวลาปิดของวันนี้ (ms) จาก "17:00:00" เทียบกับ now
function closeAt(d, now) {
  if (!d.close_time) return null;
  const [h, m] = String(d.close_time).split(':').map(Number);
  const t = new Date(now);
  t.setHours(h, m || 0, 0, 0);
  return t.getTime();
}

/** now = เวลาของรอบดึงข้อมูลล่าสุด (ms) ใช้หาจุดแจกที่ใกล้ปิด — 0 = ยังไม่รู้เวลา ข้ามข่าวใกล้ปิด */
export function buildAnnouncements({ shelters = [], distributions = [], now = 0 }) {
  const out = [];

  const open = shelters.filter((s) => s.status === 'open' && shelterFree(s) > 0);
  const full = shelters.filter((s) => s.status === 'full' || (s.status === 'open' && shelterFree(s) === 0));
  const nearFull = open.filter(isNearFull);
  const roomy = open.filter((s) => !isNearFull(s)).sort((a, b) => shelterFree(b) - shelterFree(a));
  const best = roomy[0];

  if (full.length > 0) {
    out.push({
      id: 'shelter-full',
      kind: 'shelter',
      tone: 'red',
      text: full.length === 1 ? `ที่พักพิงเต็มแล้ว · ${full[0].name}` : `ที่พักพิงเต็มแล้ว ${full.length} แห่ง`,
      detail: {
        lines: full.map((s) => ({ title: s.name, sub: `เต็มแล้ว · รับได้ ${formatNumber(s.capacity)} ที่`, at: s.updated_at })),
        note: best
          ? `อย่าเพิ่งเดินทางไปที่นี่ แนะนำ ${best.name} ยังว่าง ${formatNumber(shelterFree(best))} ที่`
          : 'ที่พักพิงทุกแห่งเต็มหรือใกล้เต็ม โทรสายด่วน ปภ. 1784 เพื่อถามที่พักอื่น',
      },
      action: SHELTERS,
    });
  }
  if (nearFull.length > 0) {
    out.push({
      id: 'shelter-near-full',
      kind: 'shelter',
      tone: 'org',
      text: nearFull.length === 1 ? `ที่พักพิงใกล้เต็ม · ${nearFull[0].name}` : `ที่พักพิงใกล้เต็ม ${nearFull.length} แห่ง`,
      detail: {
        lines: nearFull.map((s) => ({ title: s.name, sub: freeText(s), at: s.updated_at })),
        note: 'ที่ว่างเหลือน้อย ควรโทรถามก่อนเดินทาง หรือเลือกที่พักที่ยังว่างมาก',
      },
      action: SHELTERS,
    });
  }

  const active = distributions.filter((d) => d.status === 'active');
  const closing = now
    ? active.filter((d) => {
        const t = closeAt(d, now);
        return t != null && t > now && t - now <= CLOSING_SOON_MS;
      })
    : [];
  if (closing.length > 0) {
    out.push({
      id: 'distribution-closing',
      kind: 'distribution',
      tone: 'org',
      text: closing.length === 1 ? `ใกล้ปิดแจก ${hhmm(closing[0].close_time)} น. · ${closing[0].name}` : `จุดแจกของใกล้ปิด ${closing.length} จุด`,
      detail: {
        lines: closing.map((d) => ({
          title: d.name,
          sub: [`ปิด ${hhmm(d.close_time)} น.`, d.supply_types].filter(Boolean).join(' · '),
          at: d.updated_at,
        })),
        note: 'จะปิดแจกภายใน 1 ชั่วโมง ถ้าต้องการของ ควรรีบไปก่อนเวลาปิด',
      },
      action: DISTRIBUTIONS,
    });
  }

  if (best) {
    out.push({
      id: 'shelter-free',
      kind: 'shelter',
      tone: 'ok',
      text: `ที่พักว่าง ${formatNumber(shelterFree(best))} ที่ · ${best.name}`,
      detail: {
        lines: roomy.slice(0, 3).map((s) => ({ title: s.name, sub: [freeText(s), s.facilities].filter(Boolean).join(' · '), at: s.updated_at })),
        note: 'เรียงจากที่ว่างมากที่สุด ที่ว่างเปลี่ยนได้ตลอด ควรโทรถามก่อนเดินทาง',
      },
      action: SHELTERS,
    });
  }

  if (active.length > 0) {
    out.push({
      id: 'distributions',
      kind: 'distribution',
      tone: 'ok',
      text: `เปิดจุดแจกของช่วยเหลือ ${active.length} จุด`,
      detail: {
        lines: active.map((d) => ({ title: d.name, sub: [openHours(d), d.supply_types].filter(Boolean).join(' · '), at: d.updated_at })),
        note: 'ของที่แจกและเวลาเปิดอาจเปลี่ยนได้ ถ้ามีเบอร์ติดต่อควรโทรถามก่อนเดินทาง',
      },
      action: DISTRIBUTIONS,
    });
  }

  // ข่าวร้ายขึ้นก่อน ตามด้วยเตือนภัย แล้วข่าวดี
  return out.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}
