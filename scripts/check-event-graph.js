const path = require("path");

const { EVENTS } = require(path.join(__dirname, "..", "events.js"));

function fail(message) {
  console.error(`Event graph check failed: ${message}`);
  process.exit(1);
}

const eventMap = new Map();
for (const event of EVENTS) {
  if (eventMap.has(event.id)) {
    fail(`duplicate event id "${event.id}"`);
  }
  eventMap.set(event.id, event);
}

if (!eventMap.has("start")) {
  fail('missing required "start" event');
}

for (const event of EVENTS) {
  if (event.death) {
    continue;
  }

  if (!Array.isArray(event.choices) || event.choices.length === 0) {
    fail(`non-death event "${event.id}" has no choices`);
  }

  for (const choice of event.choices) {
    if (!choice.next || !eventMap.has(choice.next)) {
      fail(`event "${event.id}" has choice with unknown next target "${choice.next}"`);
    }
  }
}

const visited = new Set();
const visiting = [];
const onStack = new Set();

function dfs(eventId) {
  if (onStack.has(eventId)) {
    const cycleStart = visiting.indexOf(eventId);
    const cyclePath = visiting.slice(cycleStart).concat(eventId);
    fail(`reachable cycle detected: ${cyclePath.join(" -> ")}`);
  }

  if (visited.has(eventId)) {
    return;
  }

  visited.add(eventId);
  onStack.add(eventId);
  visiting.push(eventId);

  const event = eventMap.get(eventId);
  if (!event.death) {
    for (const choice of event.choices) {
      dfs(choice.next);
    }
  }

  visiting.pop();
  onStack.delete(eventId);
}

dfs("start");

const unreachableDeaths = EVENTS
  .filter((event) => event.death && !visited.has(event.id))
  .map((event) => event.id);

if (unreachableDeaths.length) {
  fail(`unreachable death endings detected: ${unreachableDeaths.join(", ")}`);
}

console.log("Event graph check passed.");
