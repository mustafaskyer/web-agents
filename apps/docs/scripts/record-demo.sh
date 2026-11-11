#!/bin/zsh
# Re-record a clip for the Demos page (apps/docs/public/demo/<demo>.{webm,mp4,jpg}) with agent-browser driving an example
# app's own WebMCP tools. One argument, the demo:
#
#   scripts/record-demo.sh skyline-booking        # needs `pnpm --filter @webmcp-agents/example-flights dev` (:5175)
#   scripts/record-demo.sh field-store-checkout   # needs `pnpm --filter @webmcp-agents/example-ecommerce dev` (:5174)
#
# Also needs agent-browser (npm i -g agent-browser) and ffmpeg. agent-browser's Chrome has native WebMCP; the apps'
# tools are `useWebTool` / catalog tools, so a confirm-gated one (book_flight, checkout) parks the cursor on the control
# it found by name (`[data-agent-active]`) and the final click there is a trusted one: the booking or the order goes
# through only because a "person" clicked. `window.agent` comes from the devtools, which <WebAgentsProvider> installs in development.
# The data is the same person in both clips (Mustafa Elsayed, Riyadh); everything is the apps' mock data, offline.
set -e
DEMO=${1:?usage: record-demo.sh skyline-booking|field-store-checkout}
HERE=${0:a:h}
OUT=$HERE/../public/demo
RAW=${TMPDIR:-/tmp}/$DEMO-raw.webm
# A session of its own: the default agent-browser session is shared with every other agent on the machine.
export AGENT_BROWSER_SESSION=${AGENT_BROWSER_SESSION:-record-demo}
ab() { agent-browser "$@"; }
run() { ab eval "(async () => { try { const r = await window.agent.invoke('$1', $2); return r?.content?.map(c => c.text ?? '').join(' ') ?? ''; } catch (e) { return 'ERR ' + e.message; } })()"; }
until_true() { for i in {1..80}; do ab eval "$1" | grep -q true && return 0; sleep 0.25; done; echo "timed out: $1" >&2; return 1; }
has_tool() { until_true "(async () => (await window.agent.list()).some(t => t.name === '$1'))()"; }
# Parked: the cursor waits on the tool's control (`.agent-cursor.is-waiting`, the control `[data-agent-active]`), after it
# typed every field and the tool's `fill` ran.
parked() { until_true "!!document.querySelector('.agent-cursor.is-waiting, .agent-ring.is-waiting') && !!document.querySelector('[data-agent-active]')"; }
# Start a confirm-gated tool without waiting for it: it only answers after the click.
start() { ab eval "window.__gated = window.agent.invoke('$1', $2); 'started'" >/dev/null; }
finish() { ab eval "(async () => { const r = await window.__gated; return r?.content?.map(c => c.text ?? '').join(' '); })()"; }

# Chrome draws no frames when it thinks no one is looking (a headless window, a sleeping display): requestAnimationFrame
# never fires, the cursor never moves, a gated tool never parks and `record start` hangs. Software compositing without
# vsync keeps it drawing.
FRAMES="--disable-gpu,--disable-gpu-vsync,--disable-frame-rate-limit,--disable-backgrounding-occluded-windows,--disable-renderer-backgrounding,--disable-background-timer-throttling"

open_app() {
  ab --args "$FRAMES" open "$1" >/dev/null
  ab set viewport 1600 800 >/dev/null # 2:1, the frames on the Demos page are wide and short
  sleep 2
  ab record start "$RAW" --fps 30 --cursor
  sleep 1.2
}

skyline_booking() {
  open_app "http://localhost:5175/?latency=0"
  run search_flights '{ from: "RUH", to: "DXB", date: "2027-03-12", adults: 1 }' >/dev/null
  has_tool select_flight
  sleep 1.2
  local id=$(run list_results '{ limit: 1 }' | grep -o 'F-[A-Za-z0-9-]*' | head -1)
  run select_flight "{ flightId: \"$id\" }" >/dev/null
  until_true "location.pathname.endsWith('/booking')"
  sleep 1.2
  run fill_traveler_details '{ firstName: "Mustafa", lastName: "Elsayed", email: "mustafa@mail.test", phone: "+966567891011", firstName_1: "Mustafa", lastName_1: "Elsayed", dob_1: "2000-01-01", document_1: "A12345678" }' >/dev/null
  sleep 0.8
  start book_flight '{ acceptTerms: true }'
  parked
  sleep 2.5                                 # the parked cursor, waiting for the person
  ab click "[data-agent-active]"            # the person's click, on the button the cursor parked on
  finish
  sleep 2.5
}

field_store_checkout() {
  open_app "http://localhost:5174/"
  run search_products '{ query: "bag" }' >/dev/null
  sleep 1
  run open_product '{ slug: "canvas-tote" }' >/dev/null
  has_tool add_to_cart
  sleep 1
  run add_to_cart '{ qty: 1 }' >/dev/null   # the cart drawer opens with the line
  sleep 1.6
  run go_to_page '{ page: "checkout" }' >/dev/null
  has_tool checkout
  sleep 1
  start checkout '{ email: "mustafa@mail.test", name: "Mustafa Elsayed", address: "King Fahd Road 2411, Al Olaya", city: "Riyadh", postcode: "12214", country: "Saudi Arabia" }'
  parked
  sleep 2.5                                 # the parked cursor on Place order, waiting for the person
  ab click "[data-agent-active]"            # the person's click, on Place order where the cursor parked
  finish
  sleep 2.5
}

ab close >/dev/null 2>&1 || true            # a fresh browser: an empty cart, no earlier tabs
case $DEMO in
  skyline-booking) skyline_booking ;;
  field-store-checkout) field_store_checkout ;;
  *) echo "unknown demo: $DEMO (skyline-booking or field-store-checkout)" >&2; exit 1 ;;
esac
ab record stop
ab close >/dev/null 2>&1 || true

mkdir -p "$OUT"
ffmpeg -y -hide_banner -loglevel error -ss 0.8 -i "$RAW" -vf "scale='min(1600,iw)':-2" -c:v libvpx-vp9 -crf 33 -b:v 0 -r 30 -an "$OUT/$DEMO.webm"
ffmpeg -y -hide_banner -loglevel error -ss 0.8 -i "$RAW" -vf "scale='min(1600,iw)':-2,format=yuv420p" -c:v libx264 -crf 24 -preset slow -movflags +faststart -r 30 -an "$OUT/$DEMO.mp4"
# the poster the frame shows before the clip plays: its first frame
ffmpeg -y -hide_banner -loglevel error -i "$OUT/$DEMO.mp4" -frames:v 1 -q:v 6 "$OUT/$DEMO.jpg"
ls -la "$OUT"
