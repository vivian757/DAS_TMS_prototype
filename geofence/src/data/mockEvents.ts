import { mockGeofences, Geofence } from './mockGeofences';

export type EventType = '進入' | '離開' | '警示' | '停留超時';
export type EventSeverity = 'info' | 'warning' | 'alert';
export type EventStatus = 'new' | 'read' | 'resolved';

export interface GeofenceEvent {
  id: string;
  time: string; // YYYY-MM-DD HH:mm
  timestamp: number; // 用於排序 / 計算時間差
  geofenceId: string;
  geofenceName: string;
  type: EventType;
  severity: EventSeverity;
  status: EventStatus;
  vehicle: string; // 車牌
  driver: string;
  orderId?: string;
  note?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

const VEHICLES = [
  'ABC-1234', 'XYZ-5678', 'DEF-9012', 'GHI-3456', 'JKL-7890',
  'MNO-2468', 'PQR-1357', 'STU-8024', 'VWX-6913', 'YZA-4702',
  'BCD-3691', 'EFG-5814', 'HIJ-7036', 'KLM-2915', 'NOP-4826',
];
const DRIVERS = [
  '陳建國', '林志明', '王俊雄', '張家豪', '李志偉',
  '吳家銘', '劉冠宏', '蔡宗翰', '黃柏翰', '鄭文彬',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 0x100000000;
    return s / 0x100000000;
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatTime(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function pickType(rand: () => number): EventType {
  const r = rand();
  // 進入 40% / 離開 40% / 停留超時 12% / 警示 8%
  if (r < 0.4) return '進入';
  if (r < 0.8) return '離開';
  if (r < 0.92) return '停留超時';
  return '警示';
}

function severityFor(type: EventType): EventSeverity {
  if (type === '警示') return 'alert';
  if (type === '停留超時') return 'warning';
  return 'info';
}

function generateEvents(): GeofenceEvent[] {
  const rand = seededRandom(20260423);
  const events: GeofenceEvent[] = [];
  const now = new Date('2026-04-23T10:30:00');
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  // 只從「有監控訂單」的圍籬中抽（避免 test/殘渣產生事件）
  const activeFences = mockGeofences.filter((g) => g.usingOrderCount > 0);

  // ~200 筆事件
  for (let i = 0; i < 200; i++) {
    const fence = activeFences[Math.floor(rand() * activeFences.length)];
    const vehicle = VEHICLES[Math.floor(rand() * VEHICLES.length)];
    const driver = DRIVERS[Math.floor(rand() * DRIVERS.length)];
    const offsetMs = Math.floor(rand() * fourteenDaysMs);
    const time = new Date(now.getTime() - offsetMs);
    const type = pickType(rand);
    const severity = severityFor(type);

    // 越新的警示越可能是 new；舊的多是 read 或 resolved
    const hoursAgo = offsetMs / (60 * 60 * 1000);
    let status: EventStatus;
    if (severity === 'alert') {
      status = hoursAgo < 8 ? 'new' : hoursAgo < 48 ? 'read' : 'resolved';
    } else if (severity === 'warning') {
      status = hoursAgo < 4 ? 'new' : hoursAgo < 24 ? 'read' : 'resolved';
    } else {
      status = hoursAgo < 2 ? 'new' : 'read';
    }

    const orderIdSeed = parseInt(fence.id.replace(/\D/g, ''), 10) || 1;
    const orderId = `SH-2026-${String(1000 + ((orderIdSeed * 13 + i * 7) % 9000)).padStart(4, '0')}`;

    events.push({
      id: `EV-${String(i + 1).padStart(4, '0')}`,
      time: formatTime(time),
      timestamp: time.getTime(),
      geofenceId: fence.id,
      geofenceName: fence.name,
      type,
      severity,
      status,
      vehicle,
      driver,
      orderId,
      note: type === '警示' ? '進入後 > 60 分鐘未離開' : type === '停留超時' ? '停留 > 45 分鐘' : undefined,
      resolvedBy: status === 'resolved' ? '王小美' : undefined,
      resolvedAt: status === 'resolved' ? formatTime(new Date(time.getTime() + 30 * 60000)) : undefined,
    });
  }

  // 最新在前
  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}

export const mockEvents = generateEvents();

export function eventsForGeofence(geofenceId: string): GeofenceEvent[] {
  return mockEvents.filter((e) => e.geofenceId === geofenceId);
}

// 熱力圖 / 統計用：取某圍籬最近 N 天的每日事件數
export function dailyEventCounts(geofence: Pick<Geofence, 'id'>, days: number): number[] {
  const counts = new Array(days).fill(0) as number[];
  const now = new Date('2026-04-23T23:59:59');
  for (const e of mockEvents) {
    if (e.geofenceId !== geofence.id) continue;
    const diffDays = Math.floor((now.getTime() - e.timestamp) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < days) counts[days - 1 - diffDays] += 1;
  }
  return counts;
}

export function isToday(e: GeofenceEvent): boolean {
  return e.time.startsWith('2026-04-23');
}

export function isThisWeek(e: GeofenceEvent): boolean {
  const now = new Date('2026-04-23T23:59:59').getTime();
  return now - e.timestamp <= 7 * 24 * 60 * 60 * 1000;
}
