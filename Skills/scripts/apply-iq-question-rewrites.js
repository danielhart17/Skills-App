/**
 * Rewrites IQ lesson questions to be briefer and easier to digest.
 * Keeps "What is this action called?" question text unchanged.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/apply-iq-question-rewrites.js
 *
 * Or run the generated SQL in Supabase SQL Editor:
 *   supabase/migrations/rewrite_iq_questions_brief.sql
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dadyciqoypfdeotuspms.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const KEEP_ACTION_CALLED = "What is this action called?";

/** @type {Record<string, Partial<{ question_text: string, explanation: string, option_a: string, option_b: string, option_c: string, option_d: string }>>} */
const UPDATES = {
  // Understanding Court Spacing
  "3e4dd58a-115b-4197-ac9a-757ab05d02f1": {
    question_text: "Why is good spacing important?",
  },
  "77666706-f4a6-4e7b-89f2-ab948cfd1e13": {
    question_text: "What happens to the defense when spacing is good?",
  },
  "5aaee7ab-a837-4184-be80-da1b42d35364": {
    question_text: "Good spacing or bad spacing?",
    explanation:
      "Players are too close together. That clogs driving lanes and makes help defense easier.",
  },

  // Basic Actions — keep "What is this action called?" text; trim explanation
  "a3bb56b7-7eff-4009-bfd7-2bd6dbc5d6ae": {
    explanation:
      "A screen blocks or slows a defender to create space for a teammate.",
  },
  "a83953ec-afae-4356-8790-ccab958a2ed7": {
    question_text: "What action is this?",
  },
  "584e5a7b-7e55-49be-b4da-dcc0026c72fb": {
    question_text: "Which area is a trap zone against a press?",
    explanation:
      "The sideline and half-court line trap you with limited escape options.",
  },

  // Advanced Actions — keep action-called questions; update others
  "7127d31a-c34e-4151-948c-86bef92c10de": {
    question_text: "What cut is this?",
  },
  "18b32adb-6806-4c13-9156-66bcc8fd19cd": {
    question_text: "What screen is this?",
  },
  "3c07396d-0504-4f05-94f7-52e6d0d2a868": {
    explanation:
      "A veer screen fakes a screen, then the cutter uses a different screen to get open.",
  },
  "b6646074-f000-427c-9b19-a13c148f2d5e": {
    question_text: "What screen is this?",
    explanation:
      "An off-ball screen near the block that frees a cutter to the wing or slot.",
  },
  "a32f1e94-2957-45fd-896c-e0de34a5c267": {
    explanation:
      "The ball handler dribbles into a hand-off and uses their body like a screen.",
  },

  // Court Awareness
  "d1789455-4803-4073-8759-f0798ed52849": {
    question_text: "What court area is this?",
    explanation:
      "Baseline area behind the backboard for drop-off passes.",
  },
  "812040a8-cdc8-4a6d-beb9-9318943506d8": {
    question_text: "What court area is this?",
    explanation:
      "Center of the floor above the free-throw circle.",
  },
  "efd4427c-0ed8-48a9-98b5-e7f65d8ea141": {
    question_text: "What court area is this?",
    explanation:
      "Perimeter area between the top of the key and the corner.",
  },
  "edbad164-6f96-48a2-b702-d43a50e2c755": {
    question_text: "What court area is this?",
    explanation:
      "Area between the top of the key and the wing, near the free-throw line extended.",
  },

  // Defensive Sets and Positioning
  "35cb3505-d92a-4eb3-b1e1-c67798dbb1c9": {
    question_text: "What defense is this?",
    explanation:
      "Three defenders up top and two on the bottom — a 3-2 zone.",
  },
  "9a20305d-7422-4fcc-aede-f23c19c93078": {
    question_text: "What defensive position is this?",
    explanation:
      "One pass away from the ball, in the passing lane — that's deny.",
  },
  "b91d4200-faa9-42bf-a606-cab553c72aa5": {
    question_text: "What defense is this?",
    explanation:
      "Two defenders on the perimeter and three protecting the paint.",
  },

  // Defensive Sets and Rotations
  "05043054-6501-4d41-a996-28e62b9d60cf": {
    question_text: "What is the midline?",
    explanation:
      "Imaginary line from basket to basket. It splits ball-side and help-side.",
  },
  "690faf93-73f3-4255-97a8-1900a440e2f8": {
    question_text: "What is tagging the roller?",
    explanation:
      "Help-side defender bumps the roller to slow them down.",
  },
  "812eb77d-915e-42c4-9334-790aeb5dadd9": {
    question_text: "What is a closeout?",
    explanation:
      "Sprint in, then use short choppy steps so you can contest and slide.",
  },

  // Pick & Roll Defense
  "c4a86a8c-a32f-45f7-b89a-7d3958359033": {
    question_text: "What does drop coverage protect?",
    explanation:
      "The big stays deep in the paint to protect the rim.",
  },
  "3a9c7548-36a5-4454-8977-26a2ff48813c": {
    question_text: "When blitzing a pick and roll, what's the goal?",
    explanation:
      "Double the ball handler to force a turnover or bad pass.",
  },
  "de486d86-e818-482c-9f9d-cbaef3d07276": {
    question_text: "After a hard hedge, what must the big do next?",
    explanation:
      "Sprint back to the roller once the on-ball defender recovers.",
  },
  "b5e83f1c-cad7-4d3d-a273-ee92804cadeb": {
    question_text: "What's the main risk of switching a pick and roll?",
  },

  // Pick & Roll Reads
  "ad22c81a-bdff-4bfd-88e1-4699f711071f": {
    question_text: "Best read vs drop coverage?",
  },
  "ec0371e2-0a84-41fe-89cc-0766a5f671f0": {
    question_text: "Best read vs a hard hedge?",
    explanation:
      "Retreat to create space, then re-attack or hit the roller late.",
  },
  "ddd7eb7d-31ee-40e3-aa3f-59b82f7c205a": {
    question_text: "Best pass when the roll is tagged?",
    explanation:
      "The tagger left a shooter open — kick it out.",
  },
  "89e752c4-688f-476a-b20b-3b4d58f872b8": {
    question_text: "Best pass to the roller vs a hedge?",
    explanation:
      "Bounce pass into the pocket between the hedging big and recovering guard.",
  },
  "504c0e4b-4472-4e28-bd54-c78a54394208": {
    question_text: "Best read if the defender goes over the screen?",
  },

  // Help Defense Reads
  "a25fd55e-46f4-48e5-aeda-9651424e5c21": {
    question_text: "Best read?",
    explanation: "Help came late — finish at the rim.",
  },
  "d3a7c755-4627-457c-b39a-2dfd84d0154c": {
    question_text: "Best next move?",
    explanation: "Hard closeout — swing the extra pass.",
  },
  "ac41d578-6fd3-444c-a032-38b8977a8c6f": {
    question_text: "Best decision?",
    explanation: "Help opened up a shooter — kick it out.",
  },

  // Offensive Sets
  "140b3b27-54b2-4813-8046-ba96778db96f": {
    question_text: "What set is this?",
    explanation: "Four players on the perimeter, one in the post.",
  },
  "b156bdde-b2b5-41fe-a409-ad5fb039de5d": {
    question_text: "What set is this?",
    explanation: "All five players around the perimeter.",
  },
  "f653268e-3b15-4962-a9e3-16aaac6c1730": {
    question_text: "What set is this?",
    explanation: "Two bigs at the elbows in a 2-1-2 look.",
  },
  "66b723a6-50eb-48a7-8d70-1fbc968ea0ca": {
    question_text: "What set is this?",
    explanation: "Balanced formation around the lane.",
  },

  // Game Day Prep: City Giants
  "dad173e0-c0ab-435d-ba34-5fc2d6f4595b": {
    question_text:
      "Defender is overplaying the passing lane. What cut should the shooter make?",
  },
  "a0fc39d9-1a59-4504-b4fe-2604dc027c6d": {
    question_text: "Defender is trailing off a pin-down. Best read?",
  },
  "de20fb6a-119b-4b4b-a87b-061f0e8e9cf4": {
    question_text: "Vs a hard hedge, what pass hits the roller?",
  },
  "6ed95bd7-7eec-452b-a0d6-463bfc62b524": {
    question_text: "Why is the center in the dunker spot on a drive?",
  },
  "c961f9ea-9a82-4239-9987-60e7c0a0255b": {
    question_text: "When we reject the screen, where do we force the ball handler?",
  },
  "bcc839db-2d15-4b65-89d0-4fffd056d7d6": {
    question_text: "On help-side defense, where should you be vs the midline?",
    option_a: "One foot on or across the midline",
  },
  "eb1b7fd5-0716-4310-817b-2e9bf855541b": {
    question_text: "In 5-out vs a clogged defense, where should the slot players be?",
  },
  "6967d97c-88e9-4373-8afc-09f8fb974236": {
    question_text: "If the defense jumps the DHO, what should the ball handler do?",
    option_a: "Fake the hand-off and drive",
  },

  // Position Labels
  "d15db06b-67e9-4508-8ed4-5347caafa0bd": {
    question_text: "What number is the point guard?",
  },
  "56da3234-992f-444c-818b-14e8eb481395": {
    question_text: "What number is the shooting guard?",
  },
  "d72471fc-7cba-4ad2-a2ce-0fa685330424": {
    question_text: "What number is the small forward?",
  },
  "d3b1102e-34b6-46ce-9552-948cf2170276": {
    question_text: "What number is the power forward?",
  },
  "f3deddaa-5467-4754-8502-0396b8aaab09": {
    question_text: "What number is the center?",
  },

  // Rules of the Game
  "a8b320a8-aa75-46eb-9074-cb4a37c42c36": {
    question_text: "How many fouls before you foul out?",
  },
  "ff38a925-4346-436e-be10-4aa069ffc107": {
    question_text: "How long do you have to inbound the ball?",
    explanation: "You have 5 seconds or it's a turnover.",
  },
  "81ec3c08-8fb6-4f71-8a5d-d3f2fab711cb": {
    question_text: "How many seconds can you stay in the paint?",
    explanation:
      "Three seconds in the paint is a violation. Move in and out to avoid it.",
  },
  "028faae4-d2f5-4ad3-8510-5e878ea07d85": {
    question_text: "What is it called if you take more than 2 steps without dribbling?",
  },
  "12ca0120-86e1-46cd-994d-c0d26b46531b": {
    question_text: "You try to take a charge inside the restricted area. What's the call?",
    explanation:
      "Defenders inside the arc can't draw a charge.",
  },
};

function sqlEscape(value) {
  return value.replace(/'/g, "''");
}

function buildSql() {
  const lines = [
    "-- Rewrite IQ lesson questions: briefer, easier to digest",
    "-- Keeps 'What is this action called?' question text unchanged",
    "-- Run in Supabase SQL Editor",
    "",
  ];

  for (const [id, fields] of Object.entries(UPDATES)) {
    const sets = Object.entries(fields).map(
      ([col, val]) => `${col} = '${sqlEscape(val)}'`
    );
    sets.push("updated_at = NOW()");
    lines.push(
      `UPDATE public.questions SET ${sets.join(", ")} WHERE id = '${id}';`
    );
  }

  lines.push("");
  return lines.join("\n");
}

async function applyViaApi() {
  if (!SERVICE_KEY) {
    console.log("No SUPABASE_SERVICE_ROLE_KEY — SQL migration written only.");
    return false;
  }

  let updated = 0;
  for (const [id, fields] of Object.entries(UPDATES)) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(fields),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update ${id}: ${res.status} ${text}`);
    }

    const rows = await res.json();
    if (rows.length === 0) {
      throw new Error(`No row updated for ${id}`);
    }
    updated += 1;
  }

  console.log(`Updated ${updated} questions via Supabase API.`);
  return true;
}

const sqlPath = join(__dirname, "../supabase/migrations/rewrite_iq_questions_brief.sql");
const sql = buildSql();
writeFileSync(sqlPath, sql);
console.log(`Wrote ${Object.keys(UPDATES).length} updates to ${sqlPath}`);

applyViaApi().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
