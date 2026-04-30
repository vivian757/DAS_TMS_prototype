export type GeofenceType = '圓形' | '多邊形';
export type CreationMethod = '手動建立' | '批次匯入';

export interface AuditEntry {
  time: string; // YYYY-MM-DD HH:mm
  user: string;
  role: string;
  summary: string;
}

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  address: string;
  lat: number; // 圓形：中心；多邊形：centroid（僅用於 map fit / list 代表點）
  lng: number;
  radius: number; // 圓形：半徑 m；多邊形：忽略（保留 0）
  vertices?: [number, number][]; // 僅多邊形：座標陣列（順序即連線順序）
  note?: string;
  isEnabled: boolean;
  usingOrderCount: number; // 後端 aggregate 結果，列表不展示；刪除時才查
  creationMethod: CreationMethod;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  auditLog: AuditEntry[];
}

export function mockOrdersForGeofence(g: Pick<Geofence, 'id' | 'usingOrderCount'>): string[] {
  const seedNum = parseInt(g.id.replace(/\D/g, ''), 10) || 1;
  const list: string[] = [];
  for (let i = 0; i < g.usingOrderCount; i++) {
    const n = 1000 + ((seedNum * 13 + i * 7) % 9000);
    list.push(`SH-2026-${String(n).padStart(4, '0')}`);
  }
  return list;
}

export function centroidOf(vertices: [number, number][]): [number, number] {
  if (vertices.length === 0) return [23.7, 121];
  let lat = 0;
  let lng = 0;
  for (const [la, ln] of vertices) {
    lat += la;
    lng += ln;
  }
  return [lat / vertices.length, lng / vertices.length];
}

const CITY_ANCHORS: Array<{ city: string; lat: number; lng: number; spread: number }> = [
  { city: '台北', lat: 25.045, lng: 121.55, spread: 0.1 },
  { city: '新北', lat: 25.01, lng: 121.46, spread: 0.12 },
  { city: '桃園', lat: 24.99, lng: 121.3, spread: 0.1 },
  { city: '中壢', lat: 24.95, lng: 121.22, spread: 0.06 },
  { city: '新竹', lat: 24.81, lng: 120.97, spread: 0.08 },
  { city: '台中', lat: 24.15, lng: 120.67, spread: 0.1 },
  { city: '彰化', lat: 24.08, lng: 120.54, spread: 0.06 },
  { city: '嘉義', lat: 23.48, lng: 120.45, spread: 0.05 },
  { city: '台南', lat: 22.99, lng: 120.21, spread: 0.08 },
  { city: '高雄', lat: 22.63, lng: 120.3, spread: 0.1 },
  { city: '基隆', lat: 25.13, lng: 121.74, spread: 0.04 },
  { city: '宜蘭', lat: 24.75, lng: 121.75, spread: 0.06 },
];

const STREETS = [
  '忠孝東路', '信義路', '復興北路', '民生東路', '南京東路', '中山北路',
  '文化路', '中正路', '建國路', '環河路', '工業路', '重慶北路',
];

// 格式化經緯度為人類可讀字串（4 位小數 ≈ 11m 精度）
export function formatLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// Fake reverse-geocoder — 從經緯度猜最近的城市，湊出看起來像地址的字串。
// Prototype only; 不是真正的 reverse geocoding。
export function guessAddress(lat: number, lng: number): string {
  let nearest = CITY_ANCHORS[0];
  let minDist = Infinity;
  for (const a of CITY_ANCHORS) {
    const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = a;
    }
  }
  const codeSum = Math.floor(Math.abs((lat * 1000) + (lng * 10)));
  const street = STREETS[codeSum % STREETS.length];
  const num = (codeSum % 500) + 1;
  return `${nearest.city}市${street}${num}號`;
}

const CUSTOMERS = ['鼎泰豐', '統一速達', '全家', '7-11', '新光三越', '家樂福', 'COSTCO', 'momo', 'Pxmart', '屈臣氏'];
const VENUE_TYPES = ['分店', '物流中心', '門市', '倉儲區', '中繼倉', '轉運站'];
const LANDMARKS = [
  { name: '台北港警戒區', city: '台北', note: '出港車輛監控' },
  { name: '基隆港', city: '基隆', note: '' },
  { name: '高雄港', city: '高雄', note: '' },
  { name: '台中港', city: '台中', note: '' },
  { name: '桃園機場貨運站', city: '桃園', note: '' },
  { name: '林口貨運專用道', city: '新北', note: '' },
  { name: '竹科警戒區', city: '新竹', note: '' },
  { name: '南科警戒區', city: '台南', note: '' },
  { name: '內湖科技園區', city: '台北', note: '' },
];
const GARBAGE_NAMES = [
  { name: 'test', note: '' },
  { name: 'test2', note: '' },
  { name: '測試用', note: '' },
  { name: '暫用_勿刪', note: '' },
  { name: 'xxx', note: '' },
  { name: '新竹', note: '' },
  { name: '刪我', note: '工程師 2024 留' },
  { name: '舊系統遷移', note: '' },
];

const USERS = ['王小美', '李經理', '張調度'];
const ROLES_BY_USER: Record<string, string> = {
  王小美: '調度員',
  李經理: '管理員',
  張調度: '調度員',
};
const EDIT_SUMMARIES = [
  '調整半徑',
  '更新圍籬名稱',
  '更新備註',
  '更新中心點位置',
  '更新地址',
];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const rand = seeded(7358);

function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function coord(anchor: { lat: number; lng: number; spread: number }) {
  return {
    lat: anchor.lat + (rand() - 0.5) * anchor.spread,
    lng: anchor.lng + (rand() - 0.5) * anchor.spread,
  };
}
function formatDate(daysAgo: number) {
  const now = new Date('2026-04-22T10:00:00+08:00');
  const d = new Date(now.getTime() - daysAgo * 86400_000);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(daysAgo: number) {
  const now = new Date('2026-04-22T10:00:00+08:00');
  const d = new Date(now.getTime() - daysAgo * 86400_000 - randInt(0, 86400) * 1000);
  const date = d.toISOString().slice(0, 10);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

function makeAuditLog(
  createdBy: string,
  createdDaysAgo: number,
  updatedDaysAgo: number,
  isEnabled: boolean,
  radius: number,
): AuditEntry[] {
  const entries: AuditEntry[] = [];

  // 建立
  entries.push({
    time: formatDateTime(createdDaysAgo),
    user: createdBy,
    role: ROLES_BY_USER[createdBy] ?? '調度員',
    summary: '建立圍籬',
  });

  // 0-3 筆編輯
  const extraCount =
    createdDaysAgo === updatedDaysAgo ? 0 : randInt(0, 3);
  for (let i = 0; i < extraCount; i++) {
    const daysAgo = randInt(updatedDaysAgo, createdDaysAgo - 1);
    const user = pick(USERS);
    const summaryKind = pick(EDIT_SUMMARIES);
    let summary = summaryKind;
    if (summaryKind === '調整半徑') {
      const from = pick([100, 150, 200, 300, 500, 800, 1000]);
      const delta = pick([-200, -100, 100, 200, 300]);
      const to = Math.max(50, from + delta);
      summary = `調整半徑 ${from}m → ${to}m`;
    }
    entries.push({
      time: formatDateTime(daysAgo),
      user,
      role: ROLES_BY_USER[user] ?? '調度員',
      summary,
    });
  }

  // 啟用/停用（若目前為停用，最後一筆是「停用」事件）
  if (!isEnabled && createdDaysAgo !== updatedDaysAgo) {
    entries.push({
      time: formatDateTime(updatedDaysAgo),
      user: pick(USERS),
      role: ROLES_BY_USER[pick(USERS)] ?? '調度員',
      summary: '停用',
    });
  }

  // 依時間新→舊排序（字串比較 YYYY-MM-DD HH:mm 可直接用）
  entries.sort((a, b) => b.time.localeCompare(a.time));

  // suppress unused warning
  void radius;

  return entries;
}

// 5 筆多邊形 mock（僑力廠區場景）
const POLYGON_SEEDS: Array<{
  name: string;
  address: string;
  vertices: [number, number][];
  note?: string;
}> = [
  {
    name: '僑力_觀音廠',
    address: '桃園市觀音區工業一路 88 號',
    vertices: [
      [25.0458, 121.0831],
      [25.0462, 121.0878],
      [25.0434, 121.0902],
      [25.0412, 121.0882],
      [25.0408, 121.0848],
      [25.0432, 121.0822],
    ],
    note: '主廠區含原料倉、成品倉',
  },
  {
    name: '僑力_中壢廠',
    address: '桃園市中壢區中園路二段 120 號',
    vertices: [
      [24.9568, 121.2082],
      [24.9585, 121.2128],
      [24.9568, 121.2152],
      [24.9542, 121.2145],
      [24.9535, 121.2108],
      [24.9548, 121.2078],
    ],
    note: '中壢工業區 A 區',
  },
  {
    name: '僑力_湖口廠',
    address: '新竹縣湖口鄉工業三路 25 號',
    vertices: [
      [24.8892, 121.0382],
      [24.8908, 121.0428],
      [24.8885, 121.0462],
      [24.8858, 121.0452],
      [24.8852, 121.0412],
      [24.8872, 121.0378],
    ],
    note: '',
  },
  {
    name: '僑力_竹科廠',
    address: '新竹市東區研新一路 1 號',
    vertices: [
      [24.7822, 121.0062],
      [24.7838, 121.0108],
      [24.7812, 121.0132],
      [24.7788, 121.0122],
      [24.7782, 121.0088],
      [24.7802, 121.0058],
    ],
    note: '竹科 Fab 12A',
  },
  {
    name: '僑力_南科廠',
    address: '台南市新市區南科三路 8 號',
    vertices: [
      [23.1052, 120.2732],
      [23.1072, 120.2782],
      [23.1048, 120.2812],
      [23.1018, 120.2802],
      [23.1012, 120.2762],
      [23.1032, 120.2728],
    ],
    note: '南科園區廠區',
  },
];

function generate(): Geofence[] {
  const out: Geofence[] = [];
  let idCounter = 1;

  POLYGON_SEEDS.forEach((p) => {
    const [lat, lng] = centroidOf(p.vertices);
    const createdDaysAgo = randInt(60, 400);
    const updatedDaysAgo = Math.min(createdDaysAgo, randInt(1, 40));
    const isEnabled = true;
    const createdBy = pick(USERS);
    out.push({
      id: `GF-${String(idCounter++).padStart(4, '0')}`,
      name: p.name,
      type: '多邊形',
      address: p.address,
      lat,
      lng,
      radius: 0,
      vertices: p.vertices,
      note: p.note || '',
      isEnabled,
      usingOrderCount: randInt(3, 25),
      creationMethod: '手動建立',
      createdBy,
      createdAt: formatDate(createdDaysAgo),
      updatedAt: formatDate(updatedDaysAgo),
      auditLog: makeAuditLog(createdBy, createdDaysAgo, updatedDaysAgo, isEnabled, 0),
    });
  });

  LANDMARKS.forEach((lm) => {
    const anchor = CITY_ANCHORS.find((c) => c.city === lm.city)!;
    const c = coord(anchor);
    const createdDaysAgo = randInt(30, 400);
    const updatedDaysAgo = Math.min(createdDaysAgo, randInt(1, 60));
    const radius = pick([300, 500, 800, 1000, 1500, 2000]);
    const isEnabled = true;
    const createdBy = pick(USERS);
    out.push({
      id: `GF-${String(idCounter++).padStart(4, '0')}`,
      name: lm.name,
      type: '圓形',
      address: `${lm.city}市${pick(STREETS)}${randInt(1, 500)}號`,
      lat: c.lat,
      lng: c.lng,
      radius,
      note: lm.note,
      isEnabled,
      usingOrderCount: randInt(0, 40),
      creationMethod: '手動建立',
      createdBy,
      createdAt: formatDate(createdDaysAgo),
      updatedAt: formatDate(updatedDaysAgo),
      auditLog: makeAuditLog(createdBy, createdDaysAgo, updatedDaysAgo, isEnabled, radius),
    });
  });

  CUSTOMERS.forEach((customer) => {
    const count = randInt(6, 12);
    for (let i = 0; i < count; i++) {
      const anchor = pick(CITY_ANCHORS);
      const c = coord(anchor);
      const venue = pick(VENUE_TYPES);
      const createdDaysAgo = randInt(10, 300);
      const updatedDaysAgo = Math.min(createdDaysAgo, randInt(0, 40));
      const radius = pick([300, 500, 800, 1000]);
      const isEnabled = rand() < 0.85;
      const createdBy = pick(USERS);
      out.push({
        id: `GF-${String(idCounter++).padStart(4, '0')}`,
        name: `${customer}_${anchor.city}${venue}`,
        type: '圓形',
        address: `${anchor.city}市${pick(STREETS)}${randInt(1, 500)}號`,
        lat: c.lat,
        lng: c.lng,
        radius,
        note: '',
        isEnabled,
        usingOrderCount: rand() < 0.65 ? randInt(1, 15) : 0,
        creationMethod: '手動建立',
        createdBy,
        createdAt: formatDate(createdDaysAgo),
        updatedAt: formatDate(updatedDaysAgo),
        auditLog: makeAuditLog(createdBy, createdDaysAgo, updatedDaysAgo, isEnabled, radius),
      });
    }
  });

  GARBAGE_NAMES.forEach((g) => {
    const anchor = pick(CITY_ANCHORS);
    const c = coord(anchor);
    const createdDaysAgo = randInt(200, 700);
    const radius = pick([300, 500, 1000, 5000]);
    const createdBy = pick(USERS);
    out.push({
      id: `GF-${String(idCounter++).padStart(4, '0')}`,
      name: g.name,
      type: '圓形',
      address: `${anchor.city}市${pick(STREETS)}${randInt(1, 500)}號`,
      lat: c.lat,
      lng: c.lng,
      radius,
      note: g.note,
      isEnabled: false,
      usingOrderCount: 0,
      creationMethod: '手動建立',
      createdBy,
      createdAt: formatDate(createdDaysAgo),
      updatedAt: formatDate(createdDaysAgo),
      auditLog: makeAuditLog(createdBy, createdDaysAgo, createdDaysAgo, false, radius),
    });
  });

  while (out.length < 127) {
    const anchor = pick(CITY_ANCHORS);
    const c = coord(anchor);
    const customer = pick(CUSTOMERS);
    const venue = pick(VENUE_TYPES);
    const createdDaysAgo = randInt(5, 250);
    const updatedDaysAgo = Math.min(createdDaysAgo, randInt(0, 30));
    const radius = pick([300, 500, 800]);
    const isEnabled = rand() < 0.9;
    const createdBy = pick(USERS);
    out.push({
      id: `GF-${String(idCounter++).padStart(4, '0')}`,
      name: `${customer}_${anchor.city}${venue}`,
      type: '圓形',
      address: `${anchor.city}市${pick(STREETS)}${randInt(1, 500)}號`,
      lat: c.lat,
      lng: c.lng,
      radius,
      note: '',
      isEnabled,
      usingOrderCount: rand() < 0.5 ? randInt(1, 10) : 0,
      creationMethod: '手動建立',
      createdBy,
      createdAt: formatDate(createdDaysAgo),
      updatedAt: formatDate(updatedDaysAgo),
      auditLog: makeAuditLog(createdBy, createdDaysAgo, updatedDaysAgo, isEnabled, radius),
    });
  }

  return out.slice(0, 127);
}

export const mockGeofences: Geofence[] = generate();
