#!/bin/bash
# Analytics data seed — populates all 6 report tabs
# Usage: bash seed-analytics.sh

set -e

WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
BASE_URL="http://$WINDOWS_HOST:3000"

# IDs from existing demo seed
ORG1="9896398d-33fd-464c-9cb6-13010d7a79ce"  # TechCorp
ORG2="08a30e48-db96-42bf-9117-eddc4bc5fcd9"  # MedHealth
ORG3="1a8c9d5d-6a4f-4eb0-8229-3e67228143f3"  # EduLearn

EVENT_SUMMIT="bee2cbe1-4301-4c94-b1fe-ab59b82ade11"    # Tech Innovation Summit (TechCorp, ext=true)
EVENT_HEALTHFAIR="45ae8c39-18dd-45fa-ab47-bbc3a816326a" # Annual Health Fair (MedHealth, ext=true)
EVENT_MEDCONF="baa1d78f-36c5-41c0-a761-48081c3ba018"    # International Medical Conference (MedHealth, ext=true)
EVENT_EDUSUM="d91dc866-e117-473d-99e2-d3b9eae49345"     # Annual Education Summit (EduLearn, ext=true)

R4_CATERING="15b042e6-76ee-4e6f-b58e-4d61c7c147b2"     # Catering Service (consumable)
R8_MEDSUPPLIES="74ccc539-8ce9-4fe8-8c8e-75eb26f5d9f5"  # Medical Supplies Pack (consumable)
R11_STATIONERY="b6e5b622-b638-4604-a19a-1a0e7878669f"  # Stationery Bundle (consumable)

# ── helpers ──────────────────────────────────────────────────────────────────

ok() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; }
header() { echo ""; echo "=== $1 ==="; }

get_token() {
  curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))"
}

get_id() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))"; }

count() { python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 'err:'+str(d)[:60])"; }

# ── auth ─────────────────────────────────────────────────────────────────────

echo "Authenticating..."
TOK_A=$(get_token "alice@techcorp.com"  "Test@1234")
TOK_B=$(get_token "bob@medhealth.com"   "Test@1234")
TOK_C=$(get_token "carol@edulearn.com"  "Test@1234")

[ -z "$TOK_A" ] && { echo "ERROR: Alice login failed"; exit 1; }
[ -z "$TOK_B" ] && { echo "ERROR: Bob login failed"; exit 1; }
[ -z "$TOK_C" ] && { echo "ERROR: Carol login failed"; exit 1; }
echo "  ✓ Logged in as Alice, Bob, Carol"

# ── 1. EXTERNAL ATTENDEES ────────────────────────────────────────────────────
header "1. External Attendees — adding 12 per event (threshold=10)"

add_externals() {
  local tok=$1 eid=$2 prefix=$3 n=$4
  local added=0
  for i in $(seq 1 $n); do
    r=$(curl -s -X POST $BASE_URL/attendances \
      -H "Authorization: Bearer $tok" \
      -H "Content-Type: application/json" \
      -d "{\"eventId\":\"$eid\",\"userEmail\":\"${prefix}${i}@guest.com\",\"userName\":\"${prefix^} Attendee $i\"}")
    echo "$r" | grep -q '"id"' && ((added++)) || true
  done
  echo "  Added $added/$n external attendees to event $eid"
}

echo "Tech Innovation Summit (TechCorp):"
add_externals "$TOK_A" "$EVENT_SUMMIT" "summit_guest" 12

echo "International Medical Conference (MedHealth):"
add_externals "$TOK_B" "$EVENT_MEDCONF" "medconf_visitor" 12

echo "Annual Education Summit (EduLearn):"
add_externals "$TOK_C" "$EVENT_EDUSUM" "edu_external" 12

echo "Annual Health Fair (MedHealth — past event, may be blocked):"
add_externals "$TOK_B" "$EVENT_HEALTHFAIR" "healthfair_guest" 10

# ── 2. PARENT-CHILD VIOLATIONS ───────────────────────────────────────────────
header "2. Parent-Child Violations"

echo "Creating DevCon 2026 parent event (TechCorp)..."
PARENT_A=$(curl -s -X POST $BASE_URL/events \
  -H "Authorization: Bearer $TOK_A" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"DevCon 2026",
    "description":"Annual developer conference",
    "startTime":"2026-09-15T09:00:00.000Z",
    "endTime":"2026-09-17T18:00:00.000Z",
    "capacity":300,
    "status":"published",
    "allowExternalAttendees":true,
    "organizationId":"'"$ORG1"'"
  }')
PA_ID=$(echo "$PARENT_A" | get_id)

if [ -z "$PA_ID" ]; then
  fail "DevCon 2026 creation failed: $(echo $PARENT_A | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','unknown'))")"
else
  ok "DevCon 2026 parent: $PA_ID"

  echo "  Creating child: Opening Keynote (valid, 09:00–12:00 day 1)..."
  C1=$(curl -s -X POST $BASE_URL/events \
    -H "Authorization: Bearer $TOK_A" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"DevCon Opening Keynote\",\"description\":\"Opening keynote\",
         \"startTime\":\"2026-09-15T09:00:00.000Z\",\"endTime\":\"2026-09-15T12:00:00.000Z\",
         \"capacity\":300,\"status\":\"published\",\"allowExternalAttendees\":false,
         \"organizationId\":\"$ORG1\",\"parentEventId\":\"$PA_ID\"}")
  echo "$C1" | grep -q '"id"' && ok "Opening Keynote: $(echo $C1 | get_id)" || fail "Failed: $(echo $C1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','?'))")"

  echo "  Creating child: Day 3 Workshop (valid, day 3 09:00–17:00)..."
  C2=$(curl -s -X POST $BASE_URL/events \
    -H "Authorization: Bearer $TOK_A" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"DevCon Day 3 Workshop\",\"description\":\"Final day workshop\",
         \"startTime\":\"2026-09-17T09:00:00.000Z\",\"endTime\":\"2026-09-17T17:00:00.000Z\",
         \"capacity\":150,\"status\":\"published\",\"allowExternalAttendees\":false,
         \"organizationId\":\"$ORG1\",\"parentEventId\":\"$PA_ID\"}")
  echo "$C2" | grep -q '"id"' && ok "Day 3 Workshop: $(echo $C2 | get_id)" || fail "Failed: $(echo $C2 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','?'))")"

  echo "  PATCH parent start → 2026-09-15T12:00 (Opening Keynote starts at 09:00 → CHILD_STARTS_BEFORE_PARENT)..."
  PATCH_A=$(curl -s -X PATCH $BASE_URL/events/$PA_ID \
    -H "Authorization: Bearer $TOK_A" \
    -H "Content-Type: application/json" \
    -d '{"startTime":"2026-09-15T12:00:00.000Z","endTime":"2026-09-17T18:00:00.000Z"}')
  echo "$PATCH_A" | grep -q '"id"' && ok "Parent narrowed (start: 12:00)" || fail "PATCH failed: $(echo $PATCH_A | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','?'))")"
fi

echo ""
echo "Creating MedHealth Annual Summit parent (MedHealth)..."
PARENT_B=$(curl -s -X POST $BASE_URL/events \
  -H "Authorization: Bearer $TOK_B" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"MedHealth Annual Summit 2026",
    "description":"Annual medical leadership summit",
    "startTime":"2026-10-10T09:00:00.000Z",
    "endTime":"2026-10-12T18:00:00.000Z",
    "capacity":200,
    "status":"published",
    "allowExternalAttendees":true,
    "organizationId":"'"$ORG2"'"
  }')
PB_ID=$(echo "$PARENT_B" | get_id)

if [ -z "$PB_ID" ]; then
  fail "MedHealth Summit creation failed: $(echo $PARENT_B | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','unknown'))")"
else
  ok "MedHealth Annual Summit parent: $PB_ID"

  echo "  Creating child: Summit Morning Session (valid, day 1 09:00–12:00)..."
  curl -s -X POST $BASE_URL/events \
    -H "Authorization: Bearer $TOK_B" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Summit Morning Session\",\"description\":\"Morning presentations\",
         \"startTime\":\"2026-10-10T09:00:00.000Z\",\"endTime\":\"2026-10-10T12:00:00.000Z\",
         \"capacity\":200,\"status\":\"published\",\"allowExternalAttendees\":false,
         \"organizationId\":\"$ORG2\",\"parentEventId\":\"$PB_ID\"}" | grep -q '"id"' \
    && ok "Summit Morning Session created" || fail "Failed to create morning session"

  echo "  Creating child: Summit Closing Ceremony (valid, day 3 14:00–18:00)..."
  curl -s -X POST $BASE_URL/events \
    -H "Authorization: Bearer $TOK_B" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Summit Closing Ceremony\",\"description\":\"Closing dinner\",
         \"startTime\":\"2026-10-12T14:00:00.000Z\",\"endTime\":\"2026-10-12T18:00:00.000Z\",
         \"capacity\":200,\"status\":\"published\",\"allowExternalAttendees\":false,
         \"organizationId\":\"$ORG2\",\"parentEventId\":\"$PB_ID\"}" | grep -q '"id"' \
    && ok "Summit Closing Ceremony created" || fail "Failed to create closing ceremony"

  echo "  PATCH parent end → 2026-10-12T15:00 (Closing Ceremony ends at 18:00 → CHILD_ENDS_AFTER_PARENT)..."
  PATCH_B=$(curl -s -X PATCH $BASE_URL/events/$PB_ID \
    -H "Authorization: Bearer $TOK_B" \
    -H "Content-Type: application/json" \
    -d '{"startTime":"2026-10-10T09:00:00.000Z","endTime":"2026-10-12T15:00:00.000Z"}')
  echo "$PATCH_B" | grep -q '"id"' && ok "Parent narrowed (end: 15:00)" || fail "PATCH failed: $(echo $PATCH_B | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','?'))")"
fi

echo ""
echo "Creating EduLearn Academic Conference parent (EduLearn)..."
PARENT_C=$(curl -s -X POST $BASE_URL/events \
  -H "Authorization: Bearer $TOK_C" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"EduLearn Academic Conference 2026",
    "description":"Annual academic conference",
    "startTime":"2026-11-05T09:00:00.000Z",
    "endTime":"2026-11-07T18:00:00.000Z",
    "capacity":400,
    "status":"published",
    "allowExternalAttendees":true,
    "organizationId":"'"$ORG3"'"
  }')
PC_ID=$(echo "$PARENT_C" | get_id)

if [ -z "$PC_ID" ]; then
  fail "EduLearn Conference creation failed"
else
  ok "EduLearn Academic Conference parent: $PC_ID"

  curl -s -X POST $BASE_URL/events \
    -H "Authorization: Bearer $TOK_C" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Research Presentations Day 1\",\"description\":\"Day 1 presentations\",
         \"startTime\":\"2026-11-05T09:00:00.000Z\",\"endTime\":\"2026-11-05T17:00:00.000Z\",
         \"capacity\":400,\"status\":\"published\",\"allowExternalAttendees\":false,
         \"organizationId\":\"$ORG3\",\"parentEventId\":\"$PC_ID\"}" | grep -q '"id"' \
    && ok "Research Presentations Day 1 created" || fail "Failed"

  curl -s -X POST $BASE_URL/events \
    -H "Authorization: Bearer $TOK_C" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Conference Gala Dinner\",\"description\":\"Closing gala\",
         \"startTime\":\"2026-11-07T17:00:00.000Z\",\"endTime\":\"2026-11-07T18:00:00.000Z\",
         \"capacity\":400,\"status\":\"published\",\"allowExternalAttendees\":false,
         \"organizationId\":\"$ORG3\",\"parentEventId\":\"$PC_ID\"}" | grep -q '"id"' \
    && ok "Conference Gala Dinner created" || fail "Failed"

  echo "  PATCH parent end → 2026-11-07T16:00 (Gala ends at 18:00 → CHILD_ENDS_AFTER_PARENT)..."
  curl -s -X PATCH $BASE_URL/events/$PC_ID \
    -H "Authorization: Bearer $TOK_C" \
    -H "Content-Type: application/json" \
    -d '{"startTime":"2026-11-05T09:00:00.000Z","endTime":"2026-11-07T16:00:00.000Z"}' | grep -q '"id"' \
    && ok "Parent narrowed" || fail "PATCH failed"
fi

# ── 3. RESOURCE UTILIZATION ──────────────────────────────────────────────────
header "3. Resource Utilization — refreshing materialized view"

REFRESH=$(curl -s -X POST $BASE_URL/reports/refresh-utilization-view \
  -H "Authorization: Bearer $TOK_A")
echo "  Refresh result: $REFRESH"

# ── 4. SHOW-UP RATE BOOST — add check-ins to upcoming events ─────────────────
header "4. Show-Up Rate — adding check-ins to future events for better chart variety"

checkin() {
  local tok=$1 aid=$2
  curl -s -X POST "$BASE_URL/attendances/$aid/checkin" \
    -H "Authorization: Bearer $tok" -H "Content-Type: application/json" | grep -q '"id"' \
    && echo "  ✓ Checked in attendance $aid" || echo "  - Skipped $aid (already checked in or error)"
}

# Get existing attendance IDs for upcoming events and do check-ins
ATTS_MEDCONF=$(curl -s "$BASE_URL/attendances?eventId=$EVENT_MEDCONF" \
  -H "Authorization: Bearer $TOK_B")
echo "$ATTS_MEDCONF" | python3 -c "
import sys,json
data=json.load(sys.stdin)
print(f'  Medical Conference attendees: {len(data) if isinstance(data,list) else \"err\"}')
" 2>/dev/null || true

# ── 5. VERIFY ALL REPORTS ────────────────────────────────────────────────────
header "5. Verification"

echo "Double-Booked Users:"
curl -s "$BASE_URL/reports/double-booked-users" \
  -H "Authorization: Bearer $TOK_A" | count

echo "Violated Constraints:"
curl -s "$BASE_URL/reports/violated-constraints" \
  -H "Authorization: Bearer $TOK_A" | count

echo "Resource Utilization (TechCorp):"
curl -s "$BASE_URL/reports/resource-utilization?organizationId=$ORG1" \
  -H "Authorization: Bearer $TOK_A" | count

echo "Parent-Child Violations (TechCorp):"
curl -s "$BASE_URL/reports/parent-child-violations" \
  -H "Authorization: Bearer $TOK_A" | count

echo "Parent-Child Violations (MedHealth):"
curl -s "$BASE_URL/reports/parent-child-violations" \
  -H "Authorization: Bearer $TOK_B" | count

echo "External Attendees threshold=10 (TechCorp):"
curl -s "$BASE_URL/reports/external-attendees?threshold=10" \
  -H "Authorization: Bearer $TOK_A" | count

echo "External Attendees threshold=10 (MedHealth):"
curl -s "$BASE_URL/reports/external-attendees?threshold=10" \
  -H "Authorization: Bearer $TOK_B" | count

echo "External Attendees threshold=10 (EduLearn):"
curl -s "$BASE_URL/reports/external-attendees?threshold=10" \
  -H "Authorization: Bearer $TOK_C" | count

echo "Show-Up Rate (TechCorp):"
curl -s "$BASE_URL/reports/show-up-rate?organizationId=$ORG1" \
  -H "Authorization: Bearer $TOK_A" | count

echo ""
echo "Done."
