/**
 * Data Migration Script: WordPress DB → New Prisma DB
 *
 * Prerequisites:
 * 1. Import the WP SQL dump into a local MySQL database:
 *    mysql -u root d88811sd560857 < d88811sd560857.sql
 * 2. Make sure the new Prisma DB exists and schema is pushed:
 *    npx prisma db push
 * 3. Run this script:
 *    npx tsx scripts/migrate-data.ts
 *
 * This script preserves original IDs to maintain all relationships.
 * All users get a temporary password "Parool123!" — send password reset emails after migration.
 */

import mysql from "mysql2/promise";
import { hash } from "bcryptjs";

// ── Config ──────────────────────────────────────────────────────────────────

const WP_DB_CONFIG = {
  host: "localhost",
  user: "root",
  password: "",
  database: "d88811sd560857",
  charset: "utf8mb4",
};

const NEW_DB_CONFIG = {
  host: "localhost",
  user: "root",
  password: "",
  database: "agliit",
  charset: "utf8mb4",
};

const TEMP_PASSWORD = "Parool123!";
const WP_PREFIX = "mwvj_";

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function fixDate(val: string | null | undefined): string | null {
  if (!val || val === "0000-00-00" || val === "0000-00-00 00:00:00") return null;
  return val;
}

function parseWpRole(serialized: string): string {
  if (serialized.includes("administrator")) return "ADMIN";
  if (serialized.includes("organisaator")) return "ORGANIZER";
  if (serialized.includes("competitor")) return "COMPETITOR";
  return "COMPETITOR";
}

function parseRefereeToJson(referee: string | null): string {
  if (!referee) return "[]";
  // Referee field may be comma-separated or newline-separated
  const refs = referee
    .split(/[,\n]/)
    .map((r: string) => r.trim())
    .filter(Boolean);
  return JSON.stringify(refs);
}

function escSql(val: string | null | undefined): string {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function escNum(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "NULL";
  return String(val);
}

function escBool(val: number | boolean | null | undefined): string {
  if (val === null || val === undefined) return "0";
  return val ? "1" : "0";
}

function escDate(val: string | Date | null | undefined): string {
  if (!val) return "NULL";
  const str = typeof val === "object" ? val.toISOString() : String(val);
  const fixed = fixDate(str);
  if (!fixed) return "NULL";
  // Ensure datetime format
  if (fixed.length === 10) return `'${fixed} 00:00:00'`;
  return `'${fixed.replace("T", " ").replace("Z", "")}'`;
}

function escJson(val: string | null | undefined): string {
  if (!val) return "NULL";
  try {
    // Validate it's valid JSON
    JSON.parse(val);
    return escSql(val);
  } catch {
    return "NULL";
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log("Starting migration...");

  const wpConn = await mysql.createConnection(WP_DB_CONFIG);
  const newConn = await mysql.createConnection(NEW_DB_CONFIG);

  // Disable FK checks for bulk inserts
  await newConn.execute("SET FOREIGN_KEY_CHECKS = 0");
  await newConn.execute("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO'");

  const hashedPassword = await hash(TEMP_PASSWORD, 10);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  try {
    // ────────────────────────────────────────────────────────────────────
    // 1. USERS (from wp_users + wp_usermeta for roles)
    // ────────────────────────────────────────────────────────────────────
    log("Migrating users...");

    const [wpUsers] = await wpConn.execute(
      `SELECT u.ID, u.user_login, u.user_email, u.display_name, u.user_registered,
              COALESCE(m.meta_value, '') as capabilities
       FROM ${WP_PREFIX}users u
       LEFT JOIN ${WP_PREFIX}usermeta m ON m.user_id = u.ID AND m.meta_key = '${WP_PREFIX}capabilities'
       ORDER BY u.ID`
    ) as any[];

    // Clear existing data
    await newConn.execute("DELETE FROM users");

    for (const u of wpUsers) {
      const role = parseWpRole(u.capabilities || "");
      const name = u.display_name || u.user_login;
      const registered = fixDate(u.user_registered) || now;

      await newConn.execute(
        `INSERT INTO users (id, email, password, name, role, created_at, updated_at)
         VALUES (${escNum(u.ID)}, ${escSql(u.user_email)}, ${escSql(hashedPassword)},
                 ${escSql(name)}, ${escSql(role)}, ${escDate(registered)}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpUsers.length} users migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 2. HANDLERS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating handlers...");

    const [wpHandlers] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}handlers ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM handlers");

    for (const h of wpHandlers) {
      await newConn.execute(
        `INSERT INTO handlers (id, user_id, handler_name, phone, email, club_name, country, created_at, updated_at)
         VALUES (${escNum(h.id)}, ${escNum(h.user_id)}, ${escSql(h.handler_name)},
                 ${escSql(h.phone)}, ${escSql(h.email)}, ${escSql(h.club_name)},
                 ${escSql(h.country || "EST")}, ${escDate(h.created_at)}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpHandlers.length} handlers migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 3. DOGS (WP uses user_id, new schema uses handler_id)
    // ────────────────────────────────────────────────────────────────────
    log("Migrating dogs...");

    // Build user_id → handler_id mapping
    const userToHandler: Record<number, number> = {};
    for (const h of wpHandlers) {
      userToHandler[h.user_id] = h.id;
    }

    const [wpDogs] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}dogs ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM dogs");

    let dogsSkipped = 0;
    for (const d of wpDogs) {
      const handlerId = userToHandler[d.user_id];
      if (!handlerId) {
        log(`  ⚠ Dog id=${d.id} "${d.nick_name}" has no handler (user_id=${d.user_id}), skipping`);
        dogsSkipped++;
        continue;
      }

      await newConn.execute(
        `INSERT INTO dogs (id, handler_id, nick_name, official_name, breed, gender, birthday,
                          size_est, size_fci, agility_class, jump_class, register_code, id_code,
                          general_vaccination_end, rabies_vaccination_end, owners_name,
                          agility_class_changed_at, jump_class_changed_at, info, created_at, updated_at)
         VALUES (${escNum(d.id)}, ${escNum(handlerId)}, ${escSql(d.nick_name)}, ${escSql(d.official_name)},
                 ${escSql(d.breed)}, ${escSql(d.gender)}, ${escDate(d.birthday)},
                 ${escSql(d.size_est)}, ${escSql(d.size_fci)}, ${escSql(d.agility_class)}, ${escSql(d.jump_class)},
                 ${escSql(d.register_code)}, ${escSql(d.id_code)},
                 ${escDate(d.general_vaccination_end)}, ${escDate(d.rabies_vaccination_end)},
                 ${escSql(d.owners_name)}, ${escDate(d.agility_class_changed_at)}, ${escDate(d.jump_class_changed_at)},
                 ${escSql(d.info)}, ${escDate(d.created_at)}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpDogs.length - dogsSkipped} dogs migrated (${dogsSkipped} skipped)`);

    // ────────────────────────────────────────────────────────────────────
    // 4. BOOKINGS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating bookings...");

    const [wpBookings] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}bookings ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM bookings");

    // Find admin user ID for bookings with NULL user_id
    const adminUserId = wpUsers.find((u: any) => parseWpRole(u.capabilities) === "ADMIN")?.ID || 1;

    for (const b of wpBookings) {
      const userId = b.user_id || adminUserId;
      const refereeJson = parseRefereeToJson(b.referee);

      await newConn.execute(
        `INSERT INTO bookings (id, user_id, start_date, end_date, qual_time, organizer_name, club_name,
                              email, phone, location, referee, info, competition_classes,
                              competition_type, status, reg_status, reg_close_date,
                              protocol_published, teams_locked, teams_published, created_at, updated_at)
         VALUES (${escNum(b.id)}, ${escNum(userId)}, ${escDate(b.startDate)}, ${escDate(b.endDate)},
                 ${escSql(fixDate(b.qualTime))}, ${escSql(b.organizerName)}, ${escSql(b.clubName)},
                 ${escSql(b.email)}, ${escSql(b.phone || "")}, ${escSql(b.location || "")},
                 ${escSql(refereeJson)}, ${escSql(b.info)}, ${escSql(b.competitionClasses)},
                 ${escSql(b.competitionType || "Rahvuslik võistlus")}, ${escSql(b.status || "PENDING")},
                 ${escSql(b.reg_status)}, ${escDate(b.reg_close_date)},
                 ${escNum(b.protocol_published || 0)}, ${escNum(b.teams_locked || 0)}, ${escNum(b.teams_published || 0)},
                 ${escDate(b.created_at)}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpBookings.length} bookings migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 5. COMPETITION INFO
    // ────────────────────────────────────────────────────────────────────
    log("Migrating competition info...");

    const [wpCompInfo] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}competition_info ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM competition_info");

    for (const ci of wpCompInfo) {
      await newConn.execute(
        `INSERT INTO competition_info (id, booking_id, description_est, description_eng,
                                       sponsor_image_urls, max_competitors_per_day, created_at, updated_at)
         VALUES (${escNum(ci.id)}, ${escNum(ci.booking_id)}, ${escSql(ci.description_est)},
                 ${escSql(ci.description_eng)}, ${escJson(ci.sponsor_image_urls)},
                 ${escJson(ci.max_competitors_per_day)}, ${escDate(now)}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpCompInfo.length} competition info records migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 6. COMPETITION TRACKS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating competition tracks...");

    const [wpTracks] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}competition_tracks ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM competition_tracks");

    for (const t of wpTracks) {
      await newConn.execute(
        `INSERT INTO competition_tracks (id, booking_id, competition_date, letter, track_type,
                                         size, competition_type, referee, sort_order, is_relay, created_at)
         VALUES (${escNum(t.id)}, ${escNum(t.booking_id)}, ${escDate(t.competition_date)},
                 ${escSql(t.letter)}, ${escSql(t.track_type)}, ${escSql(t.size)},
                 ${escSql(t.competition_type)}, ${escSql(t.referee)},
                 ${escNum(t.sort_order || 0)}, ${escBool(t.is_relay)}, ${escDate(t.created_at)})`
      );
    }
    log(`  ✓ ${wpTracks.length} competition tracks migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 7. COMPETITORS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating competitors...");

    const [wpCompetitors] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}competitors ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM competitors");

    for (const c of wpCompetitors) {
      await newConn.execute(
        `INSERT INTO competitors (id, booking_id, handler_id, dog_id, competitor_status,
                                  needs_measurement, needs_competition_book, remarks, created_at, updated_at)
         VALUES (${escNum(c.id)}, ${escNum(c.booking_id)}, ${escNum(c.handler_id)}, ${escNum(c.dog_id)},
                 ${escSql(c.competitor_status || "PENDING")},
                 ${escBool(c.needs_measurement)}, ${escBool(c.needs_competition_book)},
                 ${escSql(c.info)}, ${escDate(c.created_at)}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpCompetitors.length} competitors migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 8. COMPETITOR TRACKS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating competitor tracks...");

    const [wpCompTracks] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}competitor_tracks ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM competitor_tracks");

    for (const ct of wpCompTracks) {
      await newConn.execute(
        `INSERT INTO competitor_tracks (id, competitor_id, competition_track_id, competition_date, size_standard, created_at)
         VALUES (${escNum(ct.id)}, ${escNum(ct.competitor_id)}, ${escNum(ct.competition_track_id)},
                 ${escDate(ct.competition_date)}, ${escSql(ct.size_standard || "EST")}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpCompTracks.length} competitor tracks migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 9. START PROTOCOL
    // ────────────────────────────────────────────────────────────────────
    log("Migrating start protocols...");

    const [wpProtocol] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}start_protocol ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM start_protocol");

    for (const sp of wpProtocol) {
      await newConn.execute(
        `INSERT INTO start_protocol (id, booking_id, competitor_id, competition_track_id,
                                     competition_date, size, start_number, sort_order, created_at)
         VALUES (${escNum(sp.id)}, ${escNum(sp.booking_id)}, ${escNum(sp.competitor_id)},
                 ${escNum(sp.competition_track_id)}, ${escDate(sp.competition_date)},
                 ${escSql(sp.size)}, ${escNum(sp.start_number)}, ${escNum(sp.sort_order || 0)},
                 ${escDate(sp.created_at)})`
      );
    }
    log(`  ✓ ${wpProtocol.length} start protocol entries migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 10. TRACK RESULTS (parameters)
    // ────────────────────────────────────────────────────────────────────
    log("Migrating track results...");

    const [wpTrackResults] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}track_results ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM track_results");

    for (const tr of wpTrackResults) {
      await newConn.execute(
        `INSERT INTO track_results (id, competition_track_id, size_group, track_length, track_speed,
                                    ideal_time, max_time, created_at, updated_at)
         VALUES (${escNum(tr.id)}, ${escNum(tr.competition_track_id)}, ${escSql(tr.size_group)},
                 ${escNum(tr.track_length)}, ${escNum(tr.track_speed)},
                 ${escNum(tr.ideal_time)}, ${escNum(tr.max_time)},
                 ${escDate(tr.created_at)}, ${escDate(tr.updated_at || now)})`
      );
    }
    log(`  ✓ ${wpTrackResults.length} track results migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 11. COMPETITOR RESULTS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating competitor results...");

    const [wpCompResults] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}competitor_results ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM competitor_results");

    for (const cr of wpCompResults) {
      await newConn.execute(
        `INSERT INTO competitor_results (id, start_protocol_id, competitor_id, competition_track_id,
                                         time_seconds, faults, is_dsq, is_dns, has_qualification,
                                         created_at, updated_at)
         VALUES (${escNum(cr.id)}, ${escNum(cr.start_protocol_id)}, ${escNum(cr.competitor_id)},
                 ${escNum(cr.competition_track_id)}, ${escNum(cr.time_seconds)}, ${escNum(cr.faults || 0)},
                 ${escBool(cr.is_dsq)}, ${escBool(cr.is_dns)}, ${escBool(cr.has_qualification)},
                 ${escDate(cr.created_at)}, ${escDate(cr.updated_at || now)})`
      );
    }
    log(`  ✓ ${wpCompResults.length} competitor results migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 12. TEAMS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating teams...");

    const [wpTeams] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}teams ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM teams");

    for (const t of wpTeams) {
      await newConn.execute(
        `INSERT INTO teams (id, booking_id, competition_date, size, track_type, team_name,
                           sort_order, created_at, updated_at)
         VALUES (${escNum(t.id)}, ${escNum(t.booking_id)}, ${escDate(t.competition_date)},
                 ${escSql(t.size)}, ${escSql(t.track_type || "")}, ${escSql(t.team_name || "")},
                 ${escNum(t.sort_order || 0)}, ${escDate(t.created_at)}, ${escDate(t.updated_at || now)})`
      );
    }
    log(`  ✓ ${wpTeams.length} teams migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 13. TEAM MEMBERS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating team members...");

    const [wpTeamMembers] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}team_members ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM team_members");

    for (const tm of wpTeamMembers) {
      await newConn.execute(
        `INSERT INTO team_members (id, team_id, competitor_id, sort_order, created_at)
         VALUES (${escNum(tm.id)}, ${escNum(tm.team_id)}, ${escNum(tm.competitor_id)},
                 ${escNum(tm.sort_order || 0)}, ${escDate(tm.created_at)})`
      );
    }
    log(`  ✓ ${wpTeamMembers.length} team members migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 14. TEAM RESULTS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating team results...");

    const [wpTeamResults] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}team_results ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM team_results");

    for (const tr of wpTeamResults) {
      await newConn.execute(
        `INSERT INTO team_results (id, team_id, competition_track_id, time_seconds, faults,
                                   is_dsq, is_dns, notes, created_at, updated_at)
         VALUES (${escNum(tr.id)}, ${escNum(tr.team_id)}, ${escNum(tr.competition_track_id)},
                 ${escNum(tr.time_seconds)}, ${escNum(tr.faults || 0)},
                 ${escBool(tr.is_dsq)}, ${escBool(tr.is_dns)}, ${escSql(tr.notes)},
                 ${escDate(tr.created_at)}, ${escDate(tr.updated_at || now)})`
      );
    }
    log(`  ✓ ${wpTeamResults.length} team results migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 15. AWARDINGS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating awardings...");

    const [wpAwardings] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}awardings ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM awardings");

    for (const a of wpAwardings) {
      await newConn.execute(
        `INSERT INTO awardings (id, booking_id, name, sort_order, created_at, updated_at)
         VALUES (${escNum(a.id)}, ${escNum(a.booking_id)}, ${escSql(a.name)},
                 ${escNum(a.sort_order || 0)}, ${escDate(a.created_at)}, ${escDate(now)})`
      );
    }
    log(`  ✓ ${wpAwardings.length} awardings migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 16. AWARDING TRACKS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating awarding tracks...");

    const [wpAwardTracks] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}awarding_tracks ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM awarding_tracks");

    for (const at of wpAwardTracks) {
      await newConn.execute(
        `INSERT INTO awarding_tracks (id, awarding_id, letter, track_type, competition_date)
         VALUES (${escNum(at.id)}, ${escNum(at.awarding_id)}, ${escSql(at.letter)},
                 ${escSql(at.track_type)}, ${escDate(at.competition_date)})`
      );
    }
    log(`  ✓ ${wpAwardTracks.length} awarding tracks migrated`);

    // ────────────────────────────────────────────────────────────────────
    // 17. DOG MEASUREMENTS
    // ────────────────────────────────────────────────────────────────────
    log("Migrating dog measurements...");

    const [wpMeasurements] = await wpConn.execute(
      `SELECT * FROM ${WP_PREFIX}dog_measurements ORDER BY id`
    ) as any[];

    await newConn.execute("DELETE FROM dog_measurements");

    for (const dm of wpMeasurements) {
      await newConn.execute(
        `INSERT INTO dog_measurements (id, dog_id, booking_id, referee, measurement, created_at)
         VALUES (${escNum(dm.id)}, ${escNum(dm.dog_id)}, ${escNum(dm.booking_id)},
                 ${escSql(dm.referee || "")}, ${escSql(dm.measurement || "")}, ${escDate(dm.created_at)})`
      );
    }
    log(`  ✓ ${wpMeasurements.length} dog measurements migrated`);

    // ────────────────────────────────────────────────────────────────────
    // Reset auto-increment counters
    // ────────────────────────────────────────────────────────────────────
    log("Resetting auto-increment counters...");

    const tables = [
      "users", "handlers", "dogs", "bookings", "competition_info",
      "competition_tracks", "competitors", "competitor_tracks",
      "start_protocol", "track_results", "competitor_results",
      "teams", "team_members", "team_results", "awardings", "awarding_tracks",
      "dog_measurements",
    ];

    for (const table of tables) {
      const [rows] = await newConn.execute(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${table}`) as any[];
      const nextId = rows[0].next_id;
      await newConn.execute(`ALTER TABLE ${table} AUTO_INCREMENT = ${nextId}`);
    }

    // Re-enable FK checks
    await newConn.execute("SET FOREIGN_KEY_CHECKS = 1");

    log("=========================================");
    log("Migration complete!");
    log(`All users have temporary password: "${TEMP_PASSWORD}"`);
    log("Send password reset emails to all users before going live.");
    log("=========================================");

  } catch (err) {
    console.error("Migration failed:", err);
    await newConn.execute("SET FOREIGN_KEY_CHECKS = 1");
    throw err;
  } finally {
    await wpConn.end();
    await newConn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
