#!/usr/bin/env node
/**
 * End-to-end API smoke test: walks every endpoint as every role against a
 * running backend, using a brand-new test organization so existing data is
 * never touched. Prints a PASS/FAIL checklist and writes the results to JSON.
 *
 * Usage (from the repository root):
 *   node scripts/api-smoke-test.mjs
 *
 * Environment variables:
 *   SMOKE_API                 API base URL (default http://localhost:8080/api/v1)
 *   SMOKE_BACKEND_LOG         Path to the backend log. Used to read the email
 *                             verification link printed by the console email
 *                             provider (EMAIL_PROVIDER=console). Required unless
 *                             SMOKE_ADMIN_EMAIL is set.
 *   SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD
 *                             Use an existing, verified ORG_ADMIN instead of
 *                             registering a new organization (e.g. on a hosted
 *                             server with real email delivery).
 *   SMOKE_SUPERADMIN_EMAIL / SMOKE_SUPERADMIN_PASSWORD
 *                             Enables the platform checks (organizations, plans,
 *                             suspension, backups). Skipped when unset.
 *   SMOKE_RESULTS             Where to write the JSON results
 *                             (default smoke-test-results.json in the cwd).
 *
 * It creates real rows (an organization named "QA Checklist Coop …" and its
 * members, loans, meetings, etc.). Never point it at a production database
 * that holds real members unless you intend to keep that test organization.
 */
import fs from "node:fs";
import * as XLSX from "xlsx";

const API = process.env.SMOKE_API ?? "http://localhost:8080/api/v1";
const ORIGIN = API.replace(/\/api\/v1\/?$/, "");
const PASSWORD = "SmokeTest123!";
const RUN = Date.now().toString(36);
const results = [];
let currentArea = "Setup";

// ------------------------------------------------------------------ helpers

function area(name) {
  currentArea = name;
  console.log(`\n== ${name}`);
}

function check(name, ok, detail = "") {
  results.push({ area: currentArea, name, ok: Boolean(ok), detail: ok ? "" : String(detail) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  -> ${detail}`}`);
  return Boolean(ok);
}

function expect(name, res, status, extra = true, extraDetail = "") {
  const ok = res.status === status && extra;
  const detail = res.status !== status
    ? `expected HTTP ${status}, got ${res.status} ${JSON.stringify(res.json ?? res.text ?? "").slice(0, 200)}`
    : extraDetail;
  return check(name, ok, detail);
}

async function api(method, path, token, body, { raw = false, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(`${API}${path}`, init);
      break;
    } catch (e) {
      if (attempt >= 3) throw e; // flaky networks: retry transport errors only
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  const type = res.headers.get("content-type") ?? "";
  let json = null;
  let text = null;
  if (raw) {
    text = `${(await res.arrayBuffer()).byteLength} bytes`;
  } else if (type.includes("json")) {
    json = await res.json();
  } else {
    text = await res.text();
  }
  return { status: res.status, json, text, type, headers: res.headers };
}

const get = (p, t, o) => api("GET", p, t, undefined, o);
const post = (p, t, b, o) => api("POST", p, t, b, o);
const put = (p, t, b) => api("PUT", p, t, b);
const patch = (p, t, b) => api("PATCH", p, t, b);

const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const tokenFrom = (link) => new URL(link).searchParams.get("token");
const content = (json) => (Array.isArray(json) ? json : json?.content ?? []);

async function login(email, password = PASSWORD) {
  const res = await post("/auth/login", null, { email, password });
  if (res.status !== 200) throw new Error(`login ${email} -> ${res.status} ${JSON.stringify(res.json)}`);
  return res.json;
}

function verificationTokenFromLog(email) {
  const logPath = process.env.SMOKE_BACKEND_LOG;
  if (!logPath) throw new Error("Set SMOKE_BACKEND_LOG (or SMOKE_ADMIN_EMAIL) — see the header comment.");
  const lines = fs.readFileSync(logPath, "utf8").split(/\r?\n/).filter((l) => l.includes(email) && l.includes("verify-email?token="));
  if (lines.length === 0) throw new Error(`No verification link for ${email} in ${logPath}`);
  return lines.at(-1).split("token=")[1].trim();
}

// ------------------------------------------------------------- the checks

async function main() {
  console.log(`API smoke test against ${API} (run ${RUN})`);

  area("Health & basic security");
  const health = await fetch(`${ORIGIN}/actuator/health`).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
  check("Health endpoint is UP", health.status === 200 && health.json?.status === "UP", JSON.stringify(health));
  expect("Protected endpoint without a token is refused", await get("/members", null), 401);
  expect("Tampered token is refused", await get("/me", "eyJhbGciOiJIUzI1NiJ9.e30.invalid"), 401);
  const corsOk = await fetch(`${API}/auth/login`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST" } });
  const corsBad = await fetch(`${API}/auth/login`, { method: "OPTIONS", headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" } });
  check("CORS allows the configured frontend origin", corsOk.headers.get("access-control-allow-origin") === "http://localhost:3000",
    `allow-origin=${corsOk.headers.get("access-control-allow-origin")} (fine on a host whose CORS_ALLOWED_ORIGINS differs)`);
  check("CORS refuses an unknown origin", !corsBad.headers.get("access-control-allow-origin"), `allow-origin=${corsBad.headers.get("access-control-allow-origin")}`);

  // ---- organization + admin
  area("Registration, verification & sessions");
  let admin;
  let orgId;
  if (process.env.SMOKE_ADMIN_EMAIL) {
    admin = await login(process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD);
    orgId = admin.user.organizationId;
    check("Logged in as the supplied org admin", Boolean(orgId));
  } else {
    const adminEmail = `qa-admin-${RUN}@qa.test`;
    const reg = await post("/auth/register", null, {
      organizationName: `QA Checklist Coop ${RUN}`, organizationShortName: `QA${RUN}`, district: "Gasabo", sector: "Remera",
      address: "KG 1 Ave", contactEmail: `qa-contact-${RUN}@qa.test`, contactPhone: `0788${digits(6)}`,
      adminFullName: "QA Admin", adminNationalId: `1199${digits(12)}`, adminEmployeeId: `QA-ADM-${RUN}`,
      adminEmail, adminPhone: `0788${digits(6)}`, password: PASSWORD,
    });
    expect("Register a new organization", reg, 201);
    orgId = reg.json.user.organizationId;
    const unverified = reg.json.accessToken;
    const me = await get("/me", unverified);
    expect("Unverified admin can open /me", me, 200, me.json?.emailVerified === false, "emailVerified should be false");
    const gated = await get("/members", unverified);
    expect("Unverified admin is blocked from member data", gated, 403, gated.json?.error === "email_not_verified", JSON.stringify(gated.json));
    await new Promise((r) => setTimeout(r, 500)); // let the log line flush
    const vToken = verificationTokenFromLog(adminEmail);
    expect("Verify email with the emailed link", await post("/auth/verify-email", null, { token: vToken }), 204);
    expect("Verification link can't be reused", await post("/auth/verify-email", null, { token: vToken }), 403);
    expect("Wrong password is refused", await post("/auth/login", null, { email: adminEmail, password: "wrong-password" }), 401);
    admin = await login(adminEmail);
    expect("Resend verification once verified is refused", await post("/auth/resend-verification", admin.accessToken), 409);

    const refreshed = await post("/auth/refresh", null, { refreshToken: admin.refreshToken });
    expect("Refresh token issues a new session", refreshed, 200);
    expect("Old refresh token can't be reused (rotation)", await post("/auth/refresh", null, { refreshToken: admin.refreshToken }), 403);
    expect("Logout", await post("/auth/logout", null, { refreshToken: refreshed.json.refreshToken }), 204);
    expect("Refresh after logout is refused", await post("/auth/refresh", null, { refreshToken: refreshed.json.refreshToken }), 403);
    admin = await login(adminEmail);
  }
  const A = () => admin.accessToken;

  // ---- people
  area("Members, invites & roles");
  const people = {};
  async function invite(key, fullName) {
    const res = await post("/members", A(), {
      nationalId: `1198${digits(12)}`, employeeId: `QA-${key.toUpperCase()}-${RUN}`, fullName,
      email: `qa-${key}-${RUN}@qa.test`, phone: `0788${digits(6)}`, department: "Operations", position: "Officer",
      monthlySalaryRwf: 400000,
    });
    people[key] = { id: res.json?.member?.id, email: `qa-${key}-${RUN}@qa.test`, employeeId: `QA-${key.toUpperCase()}-${RUN}`, inviteLink: res.json?.inviteLink, res };
    return res;
  }
  const first = await invite("secretary", "QA Secretary");
  expect("Add a member (invite, no temporary password)", first, 201,
    !("temporaryPassword" in first.json) && first.json.member.invitePending === true && Boolean(first.json.inviteLink),
    JSON.stringify(first.json).slice(0, 200));
  for (const [key, name] of [["accountant", "QA Accountant"], ["hr", "QA HR"], ["chair", "QA Committee Chair"],
    ["committee", "QA Committee Member"], ["borrower", "QA Borrower"], ["guarantor", "QA Guarantor"],
    ["member", "QA Plain Member"], ["exiter", "QA Exiting Member"], ["shareholder", "QA Shareholder"], ["pending", "QA Never Joined"]]) {
    await invite(key, name);
  }
  check("Created all test members", Object.values(people).every((p) => p.res.status === 201),
    Object.entries(people).filter(([, p]) => p.res.status !== 201).map(([k, p]) => `${k}:${p.res.status}`).join(", "));
  expect("Duplicate employee ID is refused", await post("/members", A(), {
    nationalId: `1198${digits(12)}`, employeeId: people.member.employeeId, fullName: "Dup", email: `dup-${RUN}@qa.test`,
    phone: "0788000000", department: "X", position: "Y", monthlySalaryRwf: 1,
  }), 409);

  expect("Pending invite can't log in", await post("/auth/login", null, { email: people.pending.email, password: "anything123" }), 401);
  const resent = await post(`/members/${people.pending.id}/resend-invite`, A());
  expect("Resend invite issues a new link", resent, 200, resent.json?.inviteLink !== people.pending.inviteLink);
  expect("Old invite link stops working after resend",
    await post("/auth/accept-invite", null, { token: tokenFrom(people.pending.inviteLink), password: PASSWORD }), 403);

  for (const [key, p] of Object.entries(people)) {
    if (key === "pending") continue;
    const res = await post("/auth/accept-invite", null, { token: tokenFrom(p.inviteLink), password: PASSWORD });
    p.accepted = res.status === 200;
  }
  check("Every invited member could accept and set a password",
    Object.entries(people).filter(([k]) => k !== "pending").every(([, p]) => p.accepted));
  expect("Accepted invite can't be re-sent", await post(`/members/${people.member.id}/resend-invite`, A()), 409);

  const roleSets = {
    secretary: ["member", "secretary"], accountant: ["member", "accountant"], hr: ["member", "hr"],
    chair: ["member", "loan-committee"], committee: ["member", "loan-committee"],
  };
  for (const [key, roles] of Object.entries(roleSets)) {
    expect(`Assign roles to ${key}`, await put(`/members/${people[key].id}/roles`, A(), { roles }), 200);
  }
  expect("Chair requires the loan-committee role", await put(`/members/${people.member.id}/committee-chair`, A(), { chair: true }), 409);
  expect("Make the committee chair", await put(`/members/${people.chair.id}/committee-chair`, A(), { chair: true }), 200);
  expect("Plain member can't assign roles", await put(`/members/${people.member.id}/roles`, null, { roles: ["member"] }), 401);
  for (const p of Object.values(people)) {
    if (p.accepted) p.token = (await login(p.email)).accessToken; // roles + chair live in the JWT
  }
  const T = (k) => people[k].token;
  expect("Plain member can't assign roles (logged in)", await put(`/members/${people.member.id}/roles`, T("member"), { roles: ["member", "org-admin"] }), 403);

  const list = await get("/members?size=500", A());
  expect("Admin lists members", list, 200, content(list.json).length >= 11, `got ${content(list.json).length}`);
  check("Roster flags the pending invite", content(list.json).find((m) => m.id === people.pending.id)?.invitePending === true);
  expect("Secretary lists members", await get("/members", T("secretary")), 200);
  expect("HR lists members", await get("/members", T("hr")), 200);
  expect("Plain member can't list members", await get("/members", T("member")), 403);
  expect("Member opens own profile", await get(`/members/${people.member.id}`, T("member")), 200);
  expect("Member can't open someone else's profile", await get(`/members/${people.borrower.id}`, T("member")), 403);
  const cands = await get("/members/guarantor-candidates", T("borrower"));
  expect("Guarantor candidates exclude the caller and sensitive fields", cands, 200,
    cands.json.every((c) => c.id !== people.borrower.id && !("nationalId" in c)));
  const me = await get("/me", T("chair"));
  expect("/me shows roles and chair flag", me, 200, me.json.committeeChair === true && me.json.roles.includes("loan-committee"));

  // ---- organization settings
  area("Organization settings & policies");
  const org = await get(`/organizations/${orgId}`, T("member"));
  expect("Member reads own organization", org, 200);
  const profile = {
    name: `QA Checklist Coop ${RUN}`, shortName: `QA${RUN}`, district: "Gasabo", sector: "Kimironko", address: "KG 2 Ave",
    contactEmail: `qa-contact-${RUN}@qa.test`, contactPhone: "0788123456", logoInitials: "QA", brandColor: "#2563eb", stampLabel: "QA STAMP",
  };
  expect("Admin updates organization profile", await patch(`/organizations/${orgId}/profile`, A(), profile), 200);
  expect("Member can't edit organization profile", await patch(`/organizations/${orgId}/profile`, T("member"), profile), 403);
  const policy = { loanInterestRate: 0.05, loanInsuranceRate: 0.01, minMonthsBeforeEligible: 0, allowedRepaymentPeriods: [3, 6, 12] };
  expect("Committee updates loan policy", await patch(`/organizations/${orgId}/loan-policy`, T("chair"), policy), 200);
  expect("Accountant can't update loan policy", await patch(`/organizations/${orgId}/loan-policy`, T("accountant"), policy), 403);
  const policies = await get("/policies", T("member"));
  expect("Governance policies are seeded (8)", policies, 200, content(policies.json).length === 8, `got ${content(policies.json).length}`);

  // ---- savings & shares
  area("Savings & shares");
  expect("Member adds voluntary savings", await post(`/members/${people.borrower.id}/savings/voluntary`, T("borrower"), { amountRwf: 20000, source: "mobile-money" }), 201);
  expect("Accountant records savings for a member", await post(`/members/${people.guarantor.id}/savings/voluntary`, T("accountant"), { amountRwf: 150000, source: "cash" }), 201);
  expect("Member can't add savings for someone else", await post(`/members/${people.guarantor.id}/savings/voluntary`, T("member"), { amountRwf: 1000, source: "cash" }), 403);
  const ledger = await get(`/members/${people.guarantor.id}/savings-ledger`, T("guarantor"));
  expect("Savings ledger shows the balance", ledger, 200, Number(ledger.json.currentBalanceRwf) === 150000, `balance ${ledger.json?.currentBalanceRwf}`);
  const buy = await post(`/members/${people.shareholder.id}/shares/buy`, T("shareholder"), { shares: 3 });
  expect("Member buys shares", buy, 201, buy.json?.totalShares === 3);

  // ---- loans
  area("Loans: guaranteed loan, full lifecycle");
  const calc = await post("/loans/calculate", T("borrower"), { amount: 60000, periodMonths: 3 });
  expect("Loan calculator", calc, 200, calc.json?.guarantorRequired === true, JSON.stringify(calc.json).slice(0, 200));
  expect("Below the 50,000 RWF minimum is refused", await post("/loans", T("borrower"), { amount: 10000, purpose: "x", periodMonths: 3 }), 400);
  expect("Loan above savings without a guarantor is refused", await post("/loans", T("borrower"), { amount: 60000, purpose: "School fees", periodMonths: 3 }), 400);
  expect("Unsupported repayment period is refused", await post("/loans", T("borrower"), { amount: 60000, purpose: "x", periodMonths: 5, guarantorId: people.guarantor.id }), 400);
  const applied = await post("/loans", T("borrower"), { amount: 60000, purpose: "School fees", periodMonths: 3, guarantorId: people.guarantor.id });
  expect("Apply for a guaranteed loan", applied, 201, applied.json?.status === "submitted");
  const loanId = applied.json?.id;
  const memberLoans = await get("/loans?size=500", T("member"));
  check("Other members don't see this loan", !content(memberLoans.json).some((l) => l.id === loanId));
  expect("Plain member can't start review", await post(`/loans/${loanId}/start-review`, T("member")), 403);
  const review = await post(`/loans/${loanId}/start-review`, T("committee"));
  expect("Committee starts review → waiting for guarantor", review, 200, review.json?.status === "guarantor-approval", review.json?.status);
  const inbox = await get("/guarantees", T("guarantor"));
  const guarantee = content(inbox.json).find((g) => g.loanId === loanId);
  check("Guarantor sees the request in their inbox", Boolean(guarantee));
  expect("Borrower can't answer for the guarantor", await post(`/guarantees/${guarantee?.id}/respond`, T("borrower"), { accept: true }), 403);
  expect("Guarantor accepts", await post(`/guarantees/${guarantee?.id}/respond`, T("guarantor"), { accept: true }), 200);
  expect("Guarantor can't answer twice", await post(`/guarantees/${guarantee?.id}/respond`, T("guarantor"), { accept: true }), 409);
  const afterG = await get(`/loans/${loanId}`, T("chair"));
  check("Loan moves to committee review", afterG.json?.status === "committee-review", afterG.json?.status);
  expect("Non-chair committee member can't decide a guaranteed loan",
    await post(`/loans/${loanId}/committee-decision`, T("committee"), { approve: true }), 403);
  const approved = await post(`/loans/${loanId}/committee-decision`, T("chair"), { approve: true, notes: "QA approved" });
  expect("Chair approves", approved, 200, approved.json?.status === "approved");
  expect("Disbursing without a contract is refused", await post(`/loans/${loanId}/disburse`, T("accountant")), 409);
  const contract = await post(`/loans/${loanId}/generate-contract`, T("accountant"));
  expect("Accountant generates the contract", contract, 200, contract.json?.status === "contract-generated");
  const pdf = await get(`/loans/${loanId}/contract`, T("borrower"), { raw: true });
  expect("Borrower downloads the contract PDF", pdf, 200, pdf.type.includes("pdf"), pdf.type);
  expect("Plain member can't disburse", await post(`/loans/${loanId}/disburse`, T("member")), 403);
  const disbursed = await post(`/loans/${loanId}/disburse`, T("accountant"));
  expect("Accountant disburses", disbursed, 200, disbursed.json?.status === "disbursed");
  const ledgerRows = await get(`/ledger?size=500&memberId=${people.borrower.id}`, T("accountant"));
  const types = content(ledgerRows.json).map((r) => r.type);
  check("Disbursement wrote interest-income and insurance-fee ledger rows",
    types.includes("interest-income") && types.includes("insurance-fee"), types.join(","));
  let status = "disbursed";
  for (let i = 0; i < 6 && status !== "completed"; i++) {
    status = (await post(`/loans/${loanId}/record-repayment`, T("accountant"))).json?.status;
  }
  check("Every installment repaid → loan completed", status === "completed", status);
  expect("Repaying a completed loan is refused", await post(`/loans/${loanId}/record-repayment`, T("accountant")), 409);
  const released = content((await get("/guarantees", T("guarantor"))).json).find((g) => g.loanId === loanId);
  check("Guarantee released after full repayment", released?.status === "released", released?.status);

  area("Loans: rejection path");
  const small = await post("/loans", T("guarantor"), { amount: 50000, purpose: "Stock", periodMonths: 3 });
  expect("Apply for a loan covered by own savings (no guarantor)", small, 201);
  await post(`/loans/${small.json?.id}/start-review`, T("committee"));
  const rejected = await post(`/loans/${small.json?.id}/committee-decision`, T("committee"), { approve: false, notes: "QA rejection" });
  expect("Committee member rejects an unguaranteed loan", rejected, 200, rejected.json?.status === "rejected", rejected.json?.status);

  // ---- money reporting
  area("Ledger & reports");
  const filtered = await get("/ledger?type=interest-income", T("accountant"));
  expect("Accountant filters the ledger by type", filtered, 200,
    content(filtered.json).length > 0 && content(filtered.json).every((r) => r.type === "interest-income"));
  expect("Unknown ledger filter is a 400, not a server error", await get("/ledger?type=bogus", T("accountant")), 400);
  expect("Malformed JSON is a 400, not a server error", await api("POST", "/meetings", T("secretary"), undefined,
    { headers: { "Content-Type": "application/json" } }), 400);
  expect("Unknown endpoint is a 404", await get("/does-not-exist", T("accountant")), 404);
  expect("Plain member can't read the ledger", await get("/ledger", T("member")), 403);
  const dash = await get("/reports/accountant-dashboard", T("accountant"));
  expect("Accountant dashboard", dash, 200, Number(dash.json?.totalInterestIncome) > 0, `interest ${dash.json?.totalInterestIncome}`);
  expect("Financial report", await get("/reports/financial", A()), 200);
  expect("Plain member can't read reports", await get("/reports/financial", T("member")), 403);

  // ---- payroll
  area("Payroll import");
  const ws = XLSX.utils.aoa_to_sheet([
    ["Employee ID", "Saving Amount"],
    [people.member.employeeId, 12000],
    [people.member.employeeId, 12000],
    ["NOBODY-999", 5000],
    [people.hr.employeeId, 0],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Payroll");
  const xlsx = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const form = new FormData();
  form.append("file", new Blob([xlsx]), `qa-payroll-${RUN}.xlsx`);
  const imported = await post("/payroll/import", T("hr"), form);
  const s = imported.json?.summary;
  expect("HR imports a payroll file", imported, 201,
    s?.successful === 1 && s?.duplicates === 1 && s?.failed === 2, JSON.stringify(s));
  const bad = new FormData();
  bad.append("file", new Blob(["a,b"]), "payroll.csv");
  expect("Non-Excel upload is refused", await post("/payroll/import", T("hr"), bad), 400);
  const noRole = new FormData();
  noRole.append("file", new Blob([xlsx]), "p.xlsx");
  expect("Plain member can't import payroll", await post("/payroll/import", T("member"), noRole), 403);
  const imports = await get("/payroll/imports", T("accountant"));
  expect("Import history", imports, 200, content(imports.json).length >= 1);
  expect("Import detail", await get(`/payroll/imports/${s?.id}`, T("accountant")), 200);
  const memberLedger = await get(`/members/${people.member.id}/savings-ledger`, T("member"));
  check("Matched payroll row credited the member", Number(memberLedger.json?.currentBalanceRwf) === 12000, memberLedger.json?.currentBalanceRwf);

  // ---- secretary operations
  area("Meetings, announcements & documents");
  const meeting = await post("/meetings", T("secretary"), { title: `QA General Assembly ${RUN}`, date: "2026-12-15", time: "10:00", location: "Head office", agenda: ["Accounts", "Elections"] });
  expect("Secretary schedules a meeting", meeting, 201);
  expect("Plain member can't schedule meetings", await post("/meetings", T("member"), { title: "x", date: "2026-12-15", time: "10:00", location: "x", agenda: ["x"] }), 403);
  expect("Member sees meetings", await get("/meetings", T("member")), 200);
  const minutes = await post(`/meetings/${meeting.json?.id}/minutes`, T("secretary"), { minutesSummary: "Accounts approved." });
  expect("Secretary records minutes → completed", minutes, 200, minutes.json?.status === "completed", minutes.json?.status);
  expect("Announcement to everyone", await post("/announcements", T("secretary"), { title: `QA all ${RUN}`, body: "Hello all", priority: "normal", audience: "all" }), 201);
  expect("Announcement to staff only", await post("/announcements", T("secretary"), { title: `QA staff ${RUN}`, body: "Staff only", priority: "important", audience: "admins" }), 201);
  const memberAnn = content((await get("/announcements", T("member"))).json).map((a) => a.title);
  const staffAnn = content((await get("/announcements", T("secretary"))).json).map((a) => a.title);
  check("Plain member sees the public announcement but not the staff one",
    memberAnn.includes(`QA all ${RUN}`) && !memberAnn.includes(`QA staff ${RUN}`), memberAnn.join(" | "));
  check("Staff see both announcements", staffAnn.includes(`QA staff ${RUN}`));
  expect("Staff-only document", await post("/documents", T("secretary"), { name: `QA staff doc ${RUN}`, category: "report", fileType: "pdf", sizeKb: 120, visibility: "admins" }), 201);
  const memberDocs = content((await get("/documents", T("member"))).json).map((d) => d.name);
  check("Plain member doesn't see staff-only documents", !memberDocs.includes(`QA staff doc ${RUN}`));

  // ---- notifications
  area("Notifications");
  const bNotes = content((await get("/notifications", T("borrower"))).json);
  const titles = bNotes.map((n) => n.title);
  check("Borrower was notified through the loan lifecycle",
    ["Loan approved", "Loan disbursed", "Loan fully repaid"].every((t) => titles.includes(t)), titles.join(" | "));
  check("Members were notified of the meeting", content((await get("/notifications", T("member"))).json).some((n) => n.title.includes("QA General Assembly")));
  expect("Mark one notification read", await post(`/notifications/${bNotes[0]?.id}/read`, T("borrower")), 200);
  expect("Can't mark someone else's notification (404, not 403)", await post(`/notifications/${bNotes[0]?.id}/read`, T("member")), 404);
  expect("Mark all read", await post("/notifications/read-all", T("borrower")), 200);
  check("All borrower notifications now read", content((await get("/notifications", T("borrower"))).json).every((n) => n.read));

  // ---- membership requests
  area("Share withdrawals & exit");
  expect("Can't withdraw more shares than held", await post("/share-withdrawals", T("shareholder"), { shares: 5 }), 409);
  const sw = await post("/share-withdrawals", T("shareholder"), { shares: 2 });
  expect("Request a share withdrawal", sw, 201);
  expect("Member can't approve own withdrawal", await post(`/share-withdrawals/${sw.json?.id}/decision`, T("shareholder"), { decision: "approve" }), 403);
  expect("Secretary approves the withdrawal", await post(`/share-withdrawals/${sw.json?.id}/decision`, T("secretary"), { decision: "approve" }), 200);
  const shDetail = await get(`/members/${people.shareholder.id}`, A());
  check("Shares actually moved (3 → 1)", shDetail.json?.totalShares === 1, shDetail.json?.totalShares);

  const blocked = await get(`/members/${people.guarantor.id}/exit-eligibility`, T("guarantor"));
  expect("Exit eligibility check", blocked, 200);
  const elig = await get(`/members/${people.exiter.id}/exit-eligibility`, T("exiter"));
  expect("Member with no loans is eligible to exit", elig, 200, elig.json?.eligible === true);
  const ex = await post("/exit-requests", T("exiter"), { reason: "Moving abroad" });
  expect("Request exit", ex, 201);
  expect("Second pending exit request is refused", await post("/exit-requests", T("exiter"), { reason: "again" }), 409);
  expect("Secretary approves exit", await post(`/exit-requests/${ex.json?.id}/decision`, T("secretary"), { decision: "approve" }), 200);
  expect("Exited member can no longer log in", await post("/auth/login", null, { email: people.exiter.email, password: PASSWORD }), 403);

  // ---- status, audit, password reset
  area("Suspension, audit log & password reset");
  expect("Admin suspends a member", await post(`/members/${people.committee.id}/status`, A(), { status: "suspended" }), 200);
  expect("Suspended member can't log in", await post("/auth/login", null, { email: people.committee.email, password: PASSWORD }), 403);
  expect("Admin reactivates the member", await post(`/members/${people.committee.id}/status`, A(), { status: "active" }), 200);
  expect("Reactivated member can log in", await post("/auth/login", null, { email: people.committee.email, password: PASSWORD }), 200);
  const audit = await get(`/audit-logs?organizationId=00000000-0000-0000-0000-000000000000`, A());
  expect("Org admin reads the audit log (own org only)", audit, 200,
    content(audit.json).length > 0 && content(audit.json).every((r) => r.organizationId === orgId));
  expect("Plain member can't read the audit log", await get("/audit-logs", T("member")), 403);
  expect("Forgot password answers 204 for an unknown email", await post("/auth/forgot-password", null, { email: `nobody-${RUN}@qa.test` }), 204);
  expect("Forgot password answers 204 for a real member", await post("/auth/forgot-password", null, { email: people.member.email }), 204);
  expect("Invalid reset token is refused", await post("/auth/reset-password", null, { token: "nope", password: "Whatever123!" }), 403);

  // ---- platform (super admin)
  area("Platform administration (super admin)");
  if (!process.env.SMOKE_SUPERADMIN_EMAIL) {
    check("Platform checks skipped (set SMOKE_SUPERADMIN_EMAIL/PASSWORD)", true);
  } else {
    const sa = (await login(process.env.SMOKE_SUPERADMIN_EMAIL, process.env.SMOKE_SUPERADMIN_PASSWORD)).accessToken;
    const orgs = await get("/organizations", sa);
    expect("Super admin lists every organization", orgs, 200, content(orgs.json).some((o) => o.id === orgId));
    expect("Org admin can't list the platform", await get("/organizations", A()), 403);
    expect("Change the organization's plan", await post(`/organizations/${orgId}/plan`, sa, { plan: "growth" }), 200);
    expect("Suspend the organization", await post(`/organizations/${orgId}/status`, sa, { status: "suspended" }), 200);
    expect("Members of a suspended organization can't log in", await post("/auth/login", null, { email: people.member.email, password: PASSWORD }), 403);
    expect("Reactivate the organization", await post(`/organizations/${orgId}/status`, sa, { status: "active" }), 200);
    expect("Members can log in again", await post("/auth/login", null, { email: people.member.email, password: PASSWORD }), 200);
    const platformAudit = await get("/audit-logs", sa);
    expect("Super admin reads the platform audit log", platformAudit, 200);
    const backup = await post("/backups", sa, { label: `QA smoke ${RUN}` });
    expect("Super admin creates a real backup (pg_dump)", backup, 201, Number(backup.json?.sizeMb) >= 1,
      "needs pg_dump available to the backend (PG_DUMP_PATH)");
    expect("Org admin sees the backup list", await get("/backups", A()), 200);
    expect("Org admin can't create backups", await post("/backups", A(), { label: "no" }), 403);
  }

  // ---- summary
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  [${f.area}] ${f.name}: ${f.detail}`);
  }
  const out = process.env.SMOKE_RESULTS ?? "smoke-test-results.json";
  fs.writeFileSync(out, JSON.stringify({ api: API, run: RUN, organizationId: orgId, at: new Date().toISOString(), results }, null, 2));
  console.log(`Results written to ${out}`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  check("Smoke test crashed", false, e.stack ?? e.message);
  console.error(e);
  process.exitCode = 1;
});
