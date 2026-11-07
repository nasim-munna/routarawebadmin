export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";
export type Presence = "ONLINE" | "IDLE" | "OFFLINE";
export type AttendanceStatus = "WORKING" | "COMPLETED" | "ABSENT";

export type Person = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  nid: string | null;
  addressLine: string | null;
  division: number | null;
  divisionName: string | null;
  district: number | null;
  districtName: string | null;
  territory: number | null;
  territoryName: string | null;
  role: Role;
  isAccountCompleted: boolean;
  active: boolean;
  lastActiveAt: string | null;
  createdAt: string;
};

export type Page<T> = {
  count: number;
  totalPages: number;
  currentPage: number;
  results: T[];
};

export type Division = { id: number; name: string | null };
export type District = { id: number; name: string | null };

export type Overview = {
  date: string;
  timeZone: string;
  fieldStaff: number;
  present: number;
  working: number;
  absent: number;
  attendanceRate: number;
  presence: { online: number; idle: number; offline: number };
  divisions: { divisionId: number | null; name: string | null; total: number; present: number; online: number }[];
  checkInsByHour: { hour: number; count: number }[];
  trend: { date: string; present: number }[];
  sales: {
    scheduled: number;
    calls: number;
    productive: number;
    callPercent: number;
    productivePercent: number;
    memos: number;
    netOrder: string;
    valuePerMemo: string;
    monthTarget: string;
    monthAchieved: string;
    monthPercent: number;
  };
};

export type LivePosition = {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  role?: Role;
  divisionId: number | null;
  divisionName?: string | null;
  districtId: number | null;
  districtName?: string | null;
  latitude: number;
  longitude: number;
  syncTime: number;
  isLive?: boolean;
  status?: Presence;
  lastActiveAt?: string | null;
};

export type RosterRow = {
  userId: number;
  userName: string;
  email: string;
  role: Role;
  divisionId: number | null;
  divisionName: string | null;
  districtName: string | null;
  status: AttendanceStatus;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalHours: number;
  sessions: number;
};

export type Roster = { date: string; rows: RosterRow[] };

export type MonthDay = {
  date: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalHours: number;
};

export type Snapshot = { id: number; latitude: number; longitude: number; createdAt: string };
export type SnapshotPage = Page<Snapshot> & { distanceKm?: number };

export type Region = { id: number; name: string; code: string; isActive: boolean };
export type Area = Region & { region: number; regionName: string };
export type Territory = Region & {
  area: number;
  areaName: string;
  region: number;
  regionName: string;
  division: number;
  divisionName: string;
  zoneLatitude: number | null;
  zoneLongitude: number | null;
  zoneRadiusM: number | null;
};

export type FieldRules = { snapshotMinutes: number; orderRadiusM: number };

export type Distributor = {
  id: number;
  code: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  territories: number[];
  territoryNames: string[];
  isActive: boolean;
};

export type Named = { id: number; name: string; isActive: boolean };

export type OutletStatus = "PENDING" | "VERIFIED" | "APPROVED" | "REJECTED";

export type Outlet = {
  id: number;
  code: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  channel: number;
  channelName: string;
  territory: number;
  territoryName: string;
  distributor: number;
  distributorName: string;
  latitude: number | null;
  longitude: number | null;
  status: OutletStatus;
  rejectionReason: string;
  isActive: boolean;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: number;
  categoryName: string;
  unitName: string;
  unitsPerCase: number;
  tradePrice: string | null;
  mrp: string | null;
  isActive: boolean;
};

export type Price = { id: number; tradePrice: string; mrp: string; effectiveFrom: string };

export type Beat = {
  id: number;
  territory: number;
  territoryName: string;
  name: string;
  code: string;
  outletCount: number;
  isActive: boolean;
};

export type ItineraryDay = { date: string; beat: number; beatName: string };

export type TargetRow = {
  employee: number;
  name: string;
  territoryName: string | null;
  divisionName: string | null;
  amount: string;
};

export type Order = {
  id: number;
  date: string;
  capturedAt: string;
  kind: "REGULAR" | "READY_SALE";
  status: "SUBMITTED" | "CANCELLED";
  total: string;
  employeeName: string;
  outletName: string;
  distributorName: string;
  lines: { id: number; productName: string; sku: string; quantity: number; tradePrice: string; amount: string }[];
};

export type VisitRow = {
  id: number;
  date: string;
  capturedAt: string;
  employeeName: string;
  outletName: string;
  outcome: "PRODUCTIVE" | "NON_PRODUCTIVE";
  reasonName: string | null;
  distanceM: number | null;
  withinRange: boolean | null;
  photoUrl: string | null;
};
