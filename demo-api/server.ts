/**
 * Stand-in for the Django API with made-up people, so the panel can be run
 * and demoed on a machine with no Postgres/Redis. It follows the same
 * routes, envelope and camelCase fields as peopletracker. Not for production.
 *
 *   npm run demo-api     then sign in with admin@routara.demo / Demo@1234
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

const PORT = 8000;
const PASSWORD = "Demo@1234";

const divisions = [
  { id: 1, name: "Dhaka", lat: 23.78, lng: 90.4, districts: ["Dhaka", "Gazipur", "Narayanganj"] },
  { id: 2, name: "Chattogram", lat: 22.34, lng: 91.82, districts: ["Chattogram", "Cumilla"] },
  { id: 3, name: "Khulna", lat: 22.82, lng: 89.55, districts: ["Khulna", "Jashore"] },
  { id: 4, name: "Rajshahi", lat: 24.37, lng: 88.6, districts: ["Rajshahi", "Bogura"] },
  { id: 5, name: "Sylhet", lat: 24.9, lng: 91.87, districts: ["Sylhet", "Moulvibazar"] },
];

const firstNames = "Arif Sadia Tanvir Nusrat Imran Farzana Rakib Mithila Sohel Jannat Hasan Tania Mahin Rumana Fahim Lamia Shakil Priya Nayeem Sumaiya Zahid Anika Rafi Maliha Touhid Nabila Kamal Shirin".split(" ");
const lastNames = "Hossain Akter Rahman Islam Chowdhury Ahmed Sarkar Khan Miah Begum".split(" ");

let seed = 42;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const spread = () => (random() - 0.5) * 0.22;

type DemoPerson = ReturnType<typeof makePerson>;

function makePerson(id: number, role: string, first: string, last: string, email: string, divisionIndex: number | null) {
  const division = divisionIndex === null ? null : divisions[divisionIndex];
  const hasDivision = division !== null;
  return {
    id,
    firstName: first,
    lastName: last,
    email,
    phone: `+8801${700000000 + id * 7919}`,
    dateOfBirth: null as string | null,
    nid: null as string | null,
    addressLine: null as string | null,
    division: division?.id ?? null,
    divisionName: division?.name ?? null,
    district: hasDivision ? division.id * 10 : null,
    districtName: division?.districts[0] ?? null,
    territory: null as number | null,
    territoryName: null as string | null,
    role,
    isAccountCompleted: true,
    createdAt: new Date(Date.now() - id * 864e5).toISOString(),
    // Simulation state, stripped before sending.
    lat: (division?.lat ?? 23.78) + spread(),
    lng: (division?.lng ?? 90.4) + spread(),
    lastSeen: 0,
    checkIn: null as Date | null,
    checkOut: null as Date | null,
  };
}

const people: DemoPerson[] = [
  makePerson(1, "ADMIN", "Demo", "Admin", "admin@routara.demo", null),
  makePerson(2, "MANAGER", "Demo", "Manager", "manager@routara.demo", 0),
  makePerson(3, "EMPLOYEE", "Demo", "Employee", "employee@routara.demo", 0),
];

firstNames.forEach((first, index) => {
  const id = index + 4;
  people.push(makePerson(id, index % 9 === 0 ? "MANAGER" : "EMPLOYEE", first, lastNames[index % lastNames.length], `${first.toLowerCase()}@routara.demo`, index % divisions.length));
});

const DHAKA_OFFSET_MS = 6 * 36e5;

const isoDay = (offset = 0) => new Date(Date.now() + DHAKA_OFFSET_MS - offset * 864e5).toISOString().slice(0, 10);

function atDhakaTime(hour: number, minute: number) {
  const clock = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return new Date(`${isoDay()}T${clock}:00+06:00`);
}

const fieldStaff = () => people.filter((person) => person.role !== "ADMIN" && person.role !== "SUPER_ADMIN");

for (const person of fieldStaff()) {
  const roll = random();
  if (roll > 0.14) person.checkIn = atDhakaTime(8 + Math.floor(random() * 3), Math.floor(random() * 60));
  if (person.checkIn && roll > 0.82) person.checkOut = new Date(Math.min(Date.now(), person.checkIn.getTime() + 5 * 36e5));
  person.lastSeen = roll > 0.42 ? Date.now() : roll > 0.2 ? Date.now() - 20 * 6e4 : Date.now() - 3 * 36e5;
}

type Row = Record<string, unknown> & { id: number };

const today = () => isoDay();
const named = (rows: string[]) => rows.map((name, index) => ({ id: index + 1, name, isActive: true }));

const store: Record<string, Row[]> = {
  regions: [
    { id: 1, name: "Central Region", code: "R-CEN", isActive: true },
    { id: 2, name: "South Region", code: "R-STH", isActive: true },
  ],
  areas: [
    { id: 1, region: 1, name: "Dhaka Metro", code: "A-DM", isActive: true },
    { id: 2, region: 2, name: "Port City", code: "A-PC", isActive: true },
  ],
  territories: divisions.map((division) => ({
    id: division.id,
    area: division.id === 2 ? 2 : 1,
    division: division.id,
    name: `${division.name} Central`,
    code: `T-${division.id}`,
    zoneLatitude: division.lat,
    zoneLongitude: division.lng,
    zoneRadiusM: 5000,
    isActive: true,
  })),
  distributors: [
    { id: 1, code: "D-001", name: "Alpha Traders", ownerName: "Sample Owner", phone: "+8801700000100", address: "Dhaka", territories: [1, 3, 4, 5], isActive: true },
    { id: 2, code: "D-002", name: "Harbour Supply", ownerName: "Sample Owner", phone: "+8801700000200", address: "Chattogram", territories: [2], isActive: true },
  ],
  "outlet-channels": named(["Grocery", "Pharmacy", "Super Shop"]),
  "product-categories": named(["Snacks", "Drinks"]),
  outlets: [],
  products: [
    { id: 1, sku: "SN-001", name: "Salted Crackers 100g", category: 1, unitName: "pack", unitsPerCase: 48, isActive: true },
    { id: 2, sku: "SN-002", name: "Chocolate Biscuit 75g", category: 1, unitName: "pack", unitsPerCase: 48, isActive: true },
    { id: 3, sku: "DR-001", name: "Mango Juice 250ml", category: 2, unitName: "bottle", unitsPerCase: 24, isActive: true },
  ],
  "non-productive-reasons": named(["Shop closed", "Owner not available", "Enough stock", "Credit issue"]),
  orders: [],
  visits: [],
  beats: [
    { id: 1, territory: 1, name: "Dhaka North", code: "B-DN", isActive: true },
    { id: 2, territory: 1, name: "Dhaka South", code: "B-DS", isActive: true },
  ],
};

const prices = new Map<number, Row[]>([
  [1, [{ id: 1, tradePrice: "18.00", mrp: "20.00", effectiveFrom: "2026-01-01" }]],
  [2, [{ id: 2, tradePrice: "27.00", mrp: "30.00", effectiveFrom: "2026-01-01" }]],
]);
const beatStops = new Map<number, number[]>();
const itinerary = new Map<string, { date: string; beat: number; beatName: unknown }[]>();
const targets = new Map<string, string>();

["Lake View Store", "Corner Mart", "Green Grocery", "City Bazar", "Family Shop", "New Corner Shop"].forEach((name, index) => {
  store.outlets.push({
    id: index + 1,
    code: `OL${String(index + 1).padStart(6, "0")}`,
    name,
    ownerName: "",
    phone: "",
    address: "",
    channel: 1,
    territory: 1,
    distributor: 1,
    latitude: index < 5 ? 23.78 + index * 0.006 : null,
    longitude: index < 5 ? 90.39 + (index % 3) * 0.012 : null,
    status: index < 4 ? "APPROVED" : index === 4 ? "VERIFIED" : "PENDING",
    rejectionReason: "",
    isActive: true,
  });
});

["Lake View Store", "Corner Mart", "Green Grocery"].forEach((outletName, index) => {
  const capturedAt = new Date(Date.now() - (index + 1) * 36e5).toISOString();
  const quantity = 24 * (index + 1);
  const total = (quantity * 18).toFixed(2);
  const common = { id: index + 1, date: isoDay(), capturedAt, employeeName: "Arif Hossain", outletName };
  store.orders.push({
    ...common,
    kind: "REGULAR",
    status: "SUBMITTED",
    total,
    distributorName: "Alpha Traders",
    lines: [{ id: index + 1, productName: "Salted Crackers 100g", sku: "SN-001", quantity, tradePrice: "18.00", amount: total }],
  });
  store.visits.push({ ...common, outcome: "PRODUCTIVE", reasonName: null, distanceM: 24 + index * 11, withinRange: true, photoUrl: null });
});
store.visits.push({
  id: 4,
  date: isoDay(),
  capturedAt: new Date().toISOString(),
  employeeName: "Arif Hossain",
  outletName: "City Bazar",
  outcome: "NON_PRODUCTIVE",
  reasonName: "Shop closed",
  distanceM: 412,
  withinRange: false,
  photoUrl: null,
});

for (const person of people) {
  const territory = store.territories.find((row) => row.id === person.division);
  person.territory = territory?.id ?? null;
  person.territoryName = (territory?.name as string) ?? null;
}

const nameOf = (resource: string, id: unknown) => store[resource].find((row) => row.id === Number(id))?.name;

/** Adds the read-only names the real serializers add. */
function view(resource: string, row: Row): Row {
  switch (resource) {
    case "areas":
      return { ...row, regionName: nameOf("regions", row.region) };
    case "territories": {
      const area = store.areas.find((item) => item.id === row.area);
      return { ...row, areaName: area?.name, region: area?.region, regionName: nameOf("regions", area?.region), divisionName: divisions.find((d) => d.id === row.division)?.name };
    }
    case "distributors":
      return { ...row, territoryNames: (row.territories as number[]).map((id) => nameOf("territories", id)) };
    case "outlets":
      return { ...row, channelName: nameOf("outlet-channels", row.channel), territoryName: nameOf("territories", row.territory), distributorName: nameOf("distributors", row.distributor) };
    case "products": {
      const current = (prices.get(row.id) ?? []).find((price) => String(price.effectiveFrom) <= today());
      return { ...row, categoryName: nameOf("product-categories", row.category), tradePrice: current?.tradePrice ?? null, mrp: current?.mrp ?? null };
    }
    case "beats":
      return { ...row, territoryName: nameOf("territories", row.territory), outletCount: beatStops.get(row.id)?.length ?? 0 };
    default:
      return row;
  }
}

const presenceOf = (person: DemoPerson) => {
  const age = Date.now() - person.lastSeen;
  return age <= 3e5 ? "ONLINE" : age <= 36e5 ? "IDLE" : "OFFLINE";
};

const fullName = (person: DemoPerson) => `${person.firstName} ${person.lastName}`;

function publicPerson(person: DemoPerson) {
  const visible: Partial<DemoPerson> = { ...person };
  for (const key of ["lat", "lng", "lastSeen", "checkIn", "checkOut"] as const) delete visible[key];
  return {
    ...visible,
    active: presenceOf(person) === "ONLINE",
    lastActiveAt: person.lastSeen ? new Date(person.lastSeen).toISOString() : null,
    updatedAt: person.createdAt,
  };
}

function hoursWorked(person: DemoPerson) {
  if (!person.checkIn) return 0;
  const worked = (person.checkOut ?? new Date()).getTime() - person.checkIn.getTime();
  return Math.max(0, Math.round((worked / 36e5) * 100) / 100);
}

// Tokens are just "<kind>.<userId>.<nonce>": this is a demo, nothing to protect.
const tokenFor = (id: number, kind: string) => `${kind}.${id}.${Math.random().toString(36).slice(2)}`;

function userFromToken(token: string | null | undefined, kind: string) {
  const [tokenKind, id] = (token ?? "").split(".");
  return tokenKind === kind ? people.find((person) => person.id === Number(id)) : undefined;
}

function visibleTo(viewer: DemoPerson) {
  if (viewer.role === "MANAGER") return people.filter((p) => p.role === "EMPLOYEE" && p.division === viewer.division);
  return fieldStaff();
}

const ok = (data: unknown = null, message = "Request completed successfully") => ({ status: 200, body: { success: true, message, data } });
const fail = (status: number, message: string) => ({ status, body: { success: false, message, data: null } });

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}

function route(method: string, path: string, query: URLSearchParams, body: Record<string, string>, viewer: DemoPerson | undefined) {
  if (method === "POST" && path === "/auth/login") {
    const person = people.find((p) => p.email === body.email);
    if (!person || body.password !== PASSWORD) return fail(401, "No active account found with the given credentials");
    return ok({ accessToken: tokenFor(person.id, "access"), refreshToken: tokenFor(person.id, "refresh"), isAccountCompleted: true, role: person.role });
  }
  if (method === "POST" && path === "/auth/token/refresh") {
    const person = userFromToken(body.refresh, "refresh");
    if (!person) return fail(401, "Token is invalid");
    return { status: 200, body: { access: tokenFor(person.id, "access"), refresh: tokenFor(person.id, "refresh") } };
  }
  if (method === "POST" && path === "/auth/logout") return { status: 200, body: {} };

  if (!viewer) return fail(401, "Authentication credentials were not provided.");

  if (path === "/user/me") return ok(publicPerson(viewer));

  if (path === "/user/others") {
    const term = (query.get("search") ?? "").toLowerCase();
    const role = query.get("role");
    const division = query.get("division");
    const size = Number(query.get("size") ?? 20);
    const page = Number(query.get("page") ?? 1);
    const base = viewer.role === "MANAGER" ? visibleTo(viewer) : people.filter((p) => p.id !== viewer.id);
    const matches = base.filter(
      (p) => (!term || fullName(p).toLowerCase().includes(term) || p.email.includes(term)) && (!role || p.role === role) && (!division || p.division === Number(division)),
    );
    return ok({ count: matches.length, totalPages: Math.max(1, Math.ceil(matches.length / size)), currentPage: page, results: matches.slice((page - 1) * size, page * size).map(publicPerson) });
  }

  if (path === "/address/division") return ok(divisions.map(({ id, name }) => ({ id, name })));

  const districtMatch = path.match(/^\/address\/district\/(\d+)$/);
  if (districtMatch) {
    const division = divisions.find((d) => d.id === Number(districtMatch[1]));
    return ok(division?.districts.map((name, index) => ({ id: division.id * 10 + index, name })) ?? []);
  }

  if (path === "/dashboard/overview") {
    const staff = visibleTo(viewer);
    const present = staff.filter((p) => p.checkIn);
    const hourCounts = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: present.filter((p) => (p.checkIn!.getUTCHours() + 6) % 24 === hour).length,
    }));
    return ok({
      date: isoDay(),
      timeZone: "Asia/Dhaka",
      sales: {
        scheduled: 40,
        calls: 4,
        productive: 3,
        callPercent: 10,
        productivePercent: 75,
        memos: 3,
        netOrder: "2592.00",
        valuePerMemo: "864.00",
        monthTarget: "500000.00",
        monthAchieved: "185000.00",
        monthPercent: 37,
      },
      fieldStaff: staff.length,
      present: present.length,
      working: present.filter((p) => !p.checkOut).length,
      absent: staff.length - present.length,
      attendanceRate: staff.length ? Math.round((present.length / staff.length) * 1000) / 10 : 0,
      presence: {
        online: staff.filter((p) => presenceOf(p) === "ONLINE").length,
        idle: staff.filter((p) => presenceOf(p) === "IDLE").length,
        offline: staff.filter((p) => presenceOf(p) === "OFFLINE").length,
      },
      divisions: divisions
        .map((division) => {
          const members = staff.filter((p) => p.division === division.id);
          return {
            divisionId: division.id,
            name: division.name,
            total: members.length,
            present: members.filter((p) => p.checkIn).length,
            online: members.filter((p) => presenceOf(p) === "ONLINE").length,
          };
        })
        .filter((row) => row.total)
        .sort((a, b) => b.total - a.total),
      checkInsByHour: hourCounts,
      trend: Array.from({ length: 7 }, (_, index) => {
        const offset = 6 - index;
        return { date: isoDay(offset), present: offset === 0 ? present.length : Math.round(staff.length * (0.7 + ((offset * 37) % 20) / 100)) };
      }),
    });
  }

  if (path === "/attendance/roster") {
    const date = query.get("date") ?? isoDay();
    const isToday = date === isoDay();
    return ok({
      date,
      rows: visibleTo(viewer).map((person) => {
        const checkIn = isToday ? person.checkIn : null;
        const checkOut = isToday ? person.checkOut : null;
        return {
          userId: person.id,
          userName: fullName(person),
          email: person.email,
          role: person.role,
          divisionId: person.division,
          divisionName: person.divisionName,
          districtName: person.districtName,
          status: !checkIn ? "ABSENT" : checkOut ? "COMPLETED" : "WORKING",
          firstCheckIn: checkIn,
          lastCheckOut: checkOut,
          totalHours: isToday ? hoursWorked(person) : 0,
          sessions: checkIn ? 1 : 0,
        };
      }),
    });
  }

  if (path === "/location/live") {
    return ok(
      visibleTo(viewer).map((person) => ({
        ...livePayload(person),
        role: person.role,
        divisionName: person.divisionName,
        districtName: person.districtName,
        isLive: presenceOf(person) === "ONLINE",
        status: presenceOf(person),
        syncTime: person.lastSeen,
        lastActiveAt: new Date(person.lastSeen).toISOString(),
      })),
    );
  }

  const snapshots = path.match(/^\/location\/snapshots\/(\d+)$/);
  if (snapshots) {
    const person = people.find((p) => p.id === Number(snapshots[1]));
    if (!person) return fail(404, "Not found.");
    const start = atDhakaTime(9, 0).getTime();
    const results = Array.from({ length: 24 }, (_, index) => ({
      id: index,
      latitude: person.lat + Math.sin(index / 4) * 0.02 + index * 0.0015,
      longitude: person.lng + Math.cos(index / 3) * 0.02 - index * 0.001,
      createdAt: new Date(start + index * 9e5).toISOString(),
    }));
    return ok({ count: results.length, totalPages: 1, currentPage: 1, results, distanceKm: 18.4 });
  }

  const monthly = path.match(/^\/attendance\/user\/monthly\/(\d+)$/);
  if (monthly) {
    const month = query.get("month") ?? isoDay().slice(0, 7);
    const today = Number(isoDay().slice(8, 10));
    const rows = [];
    for (let date = 1; date <= today; date++) {
      if ((date + Number(monthly[1])) % 7 === 0 || (date + Number(monthly[1])) % 7 === 1) continue;
      const day = `${month}-${String(date).padStart(2, "0")}`;
      rows.push({ date: day, firstCheckIn: `${day}T03:10:00Z`, lastCheckOut: `${day}T11:30:00Z`, totalHours: 8.33, blocks: [] });
    }
    return ok(rows);
  }

  const person = path.match(/^\/user\/(\d+)$/);
  if (person) {
    const target = people.find((p) => p.id === Number(person[1]));
    return target ? ok(publicPerson(target)) : fail(404, "Not found.");
  }

  const create = path.match(/^\/user\/create\/(admin|manager|employee)$/);
  if (method === "POST" && create) {
    if (people.some((p) => p.email === body.email)) return fail(400, "user with this email already exists.");
    if (body.password !== body.confirmPassword) return fail(400, "Password does not match.");
    const created = makePerson(Math.max(...people.map((p) => p.id)) + 1, create[1].toUpperCase(), body.firstName, body.lastName, body.email, null);
    created.isAccountCompleted = false;
    people.unshift(created);
    return ok(null, "Account created successfully");
  }

  const update = path.match(/^\/user\/update\/personal-info\/(\d+)$/);
  if (method === "PATCH" && update) {
    const target = people.find((p) => p.id === Number(update[1]));
    if (!target) return fail(404, "Not found.");
    Object.assign(target, body);
    const division = divisions.find((d) => d.id === target.division);
    target.divisionName = division?.name ?? null;
    target.territoryName = (nameOf("territories", target.territory) as string) ?? null;
    return ok(publicPerson(target));
  }

  if (method === "POST" && /^\/user\/update\/password\/\d+$/.test(path)) return ok(null, "Password updated successfully");

  const remove = path.match(/^\/user\/delete\/(\d+)$/);
  if (method === "POST" && remove) {
    const index = people.findIndex((p) => p.id === Number(remove[1]));
    if (index >= 0) people.splice(index, 1);
    return ok(null, "User account deleted successfully");
  }

  const setup = setupRoute(method, path, query, body as unknown as Row, viewer);
  return setup ?? fail(404, `Demo API has no route for ${method} ${path}`);
}

const fieldRules = { snapshotMinutes: 15, orderRadiusM: 100 };

const PAGED = ["distributors", "outlets", "products", "beats", "orders", "visits"];

function setupRoute(method: string, path: string, query: URLSearchParams, body: Row, viewer: DemoPerson) {
  if (path === "/field-settings") {
    if (method === "PATCH") Object.assign(fieldRules, body);
    return ok(fieldRules);
  }

  if (path === "/targets") {
    const month = query.get("month") ?? String(body.month);
    if (method === "PUT") {
      for (const row of body.rows as unknown as { employee: number; amount: string }[]) targets.set(`${month}|${row.employee}`, Number(row.amount).toFixed(2));
    }
    return ok(
      visibleTo(viewer)
        .filter((person) => person.role === "EMPLOYEE")
        .map((person) => ({
          employee: person.id,
          name: fullName(person),
          territoryName: person.territoryName,
          divisionName: person.divisionName,
          amount: targets.get(`${month}|${person.id}`) ?? "0.00",
        })),
    );
  }

  if (path === "/itinerary") {
    const key = `${query.get("employee") ?? body.employee}|${query.get("month") ?? body.month}`;
    if (method === "PUT") {
      const days = body.days as unknown as { date: string; beat: number }[];
      itinerary.set(key, days.map((day) => ({ ...day, beatName: nameOf("beats", day.beat) })));
    }
    return ok(itinerary.get(key) ?? []);
  }

  const match = path.match(/^\/([a-z-]+)(?:\/(\d+))?(?:\/([a-z]+))?$/);
  if (!match || !store[match[1]]) return null;

  const [, resource, rawId, action] = match;
  const rows = store[resource];
  const row = rawId ? rows.find((item) => item.id === Number(rawId)) : undefined;
  if (rawId && !row) return fail(404, "Not found.");

  if (resource === "orders" && row && action === "cancel") {
    row.status = "CANCELLED";
    return ok(row);
  }

  if (resource === "outlets" && row && action) {
    const next: Record<string, [string, string]> = { verify: ["PENDING", "VERIFIED"], approve: ["VERIFIED", "APPROVED"] };
    if (action === "reject") Object.assign(row, { status: "REJECTED", rejectionReason: body.reason });
    else if (row.status === next[action]?.[0]) row.status = next[action][1];
    else return fail(400, "This outlet can't do that right now.");
    return ok(view(resource, row));
  }

  if (resource === "products" && row && action === "prices") {
    const list = prices.get(row.id) ?? [];
    if (method === "POST") {
      if (Number(body.tradePrice) > Number(body.mrp)) return fail(400, "Trade price can't be higher than MRP.");
      list.unshift({ ...body, id: Date.now() });
      list.sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
      prices.set(row.id, list);
    }
    return ok(list);
  }

  if (resource === "beats" && row && action === "outlets") {
    if (method === "PUT") beatStops.set(row.id, body.outletIds as unknown as number[]);
    return ok((beatStops.get(row.id) ?? []).map((id) => view("outlets", store.outlets.find((outlet) => outlet.id === id)!)));
  }

  if (method === "POST") {
    const created: Row = { isActive: true, ...body, id: Math.max(0, ...rows.map((item) => item.id)) + 1 };
    if (resource === "outlets") Object.assign(created, { code: `OL${String(created.id).padStart(6, "0")}`, status: viewer.role === "MANAGER" ? "PENDING" : "APPROVED", rejectionReason: "" });
    rows.push(created);
    return { status: 201, body: { success: true, message: "Created", data: view(resource, created) } };
  }
  if (method === "PATCH" && row) return ok(view(resource, Object.assign(row, body)));
  if (row) return ok(view(resource, row));

  const term = (query.get("search") ?? "").toLowerCase();
  const matches = rows.filter((item) => {
    const hit = (key: string, field = key) => {
      const wanted = query.get(key);
      if (!wanted) return true;
      const value = item[field];
      return Array.isArray(value) ? value.includes(Number(wanted)) : String(value) === wanted;
    };
    const active = !query.get("is_active") || item.isActive === (query.get("is_active") === "true");
    const text = [item.name, item.code, item.sku].join(" ").toLowerCase();
    const range = query.get("within_range");
    const inRange = !range || item.withinRange === (range === "true");
    const searchable = [text, item.outletName, item.employeeName].join(" ").toLowerCase();
    return active && inRange && searchable.includes(term) && ["region", "area", "division", "territories", "territory", "status", "channel", "category", "date", "outcome"].every((key) => hit(key));
  });

  if (!PAGED.includes(resource)) return ok(matches.map((item) => view(resource, item)));

  const size = Number(query.get("size") ?? 20);
  const page = Number(query.get("page") ?? 1);
  return ok({
    count: matches.length,
    totalPages: Math.max(1, Math.ceil(matches.length / size)),
    currentPage: page,
    results: matches.slice((page - 1) * size, page * size).map((item) => view(resource, item)),
  });
}

function livePayload(person: DemoPerson) {
  return {
    userId: person.id,
    latitude: person.lat,
    longitude: person.lng,
    name: fullName(person),
    email: person.email,
    phone: person.phone,
    divisionId: person.division,
    districtId: person.district,
    syncTime: Date.now(),
  };
}

const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
  const token = request.headers.authorization?.replace("Bearer ", "");
  const body = await readJson(request).catch(() => ({}));
  const result = route(request.method ?? "GET", url.pathname.replace("/api/v1", ""), url.searchParams, body, userFromToken(token, "access"));

  response.writeHead(result.status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(result.body));
});

const sockets = new WebSocketServer({ server, path: "/ws/tracking/" });
const viewers = new Map<WebSocket, DemoPerson>();

sockets.on("connection", (socket, request) => {
  const token = new URL(request.url ?? "", `http://localhost:${PORT}`).searchParams.get("token");
  const viewer = userFromToken(token, "access");
  if (!viewer) return socket.close(4401);
  viewers.set(socket, viewer);
  socket.on("close", () => viewers.delete(socket));
});

// Everyone online drifts a little, and viewers see only who they supervise.
setInterval(() => {
  for (const person of fieldStaff()) {
    if (presenceOf(person) !== "ONLINE") continue;
    person.lat += (random() - 0.5) * 0.0025;
    person.lng += (random() - 0.5) * 0.0025;
    person.lastSeen = Date.now();

    for (const [socket, viewer] of viewers) {
      if (socket.readyState === WebSocket.OPEN && visibleTo(viewer).includes(person)) {
        socket.send(JSON.stringify(livePayload(person)));
      }
    }
  }
}, 3000);

server.listen(PORT, () => console.log(`Routara demo API on http://localhost:${PORT}`));
