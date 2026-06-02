// src/module/constants.ts
var MODULE_ID = "pings";
var HOLD_DURATION_MS = 350;
var HOLD_CANCEL_TOLERANCE_PX = 5;
var FADE_IN_MS = 500;
var FADE_OUT_MS = 500;
var DEFAULT_PING_DURATION_MS = 6e3;
var DEFAULT_PING_COLOR = 11184810;

// src/module/input/binding.ts
var BUTTONS = {
  leftclick: 0,
  middleclick: 1,
  rightclick: 2
};
var MODIFIERS = {
  shift: "shift",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  super: "meta"
};
function parseBinding(input) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new Error(`pings: empty binding string`);
  }
  const tokens = input.split("+").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);
  const spec = {
    button: 0,
    shift: false,
    ctrl: false,
    alt: false,
    meta: false
  };
  let buttonSeen = false;
  for (const token of tokens) {
    if (token in BUTTONS) {
      if (buttonSeen) {
        throw new Error(`pings: binding "${input}" contains multiple buttons`);
      }
      spec.button = BUTTONS[token];
      buttonSeen = true;
    } else if (token in MODIFIERS) {
      spec[MODIFIERS[token]] = true;
    } else {
      throw new Error(`pings: unknown binding token "${token}" in "${input}"`);
    }
  }
  if (!buttonSeen) {
    throw new Error(`pings: binding "${input}" has no button`);
  }
  return spec;
}
function eventMatches(event, spec) {
  return event.button === spec.button && event.shiftKey === spec.shift && event.ctrlKey === spec.ctrl && event.altKey === spec.alt && event.metaKey === spec.meta;
}

// src/module/input/trigger.ts
function clientToWorld(view, stage, clientX, clientY) {
  const rect = view.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const { worldTransform: t, scale } = stage;
  return {
    x: (localX - t.tx) / scale.x,
    y: (localY - t.ty) / scale.y
  };
}
function installTrigger(config) {
  const view = canvas.app.view;
  const stage = canvas.app.stage;
  let hold = null;
  const cancelHold = () => {
    if (hold) {
      clearTimeout(hold.timerId);
      hold = null;
    }
  };
  const onPointerDown = (ev) => {
    if (hold) return;
    if (!eventMatches(ev, config.binding)) return;
    const pointerId = ev.pointerId;
    const startClientX = ev.clientX;
    const startClientY = ev.clientY;
    const timerId = setTimeout(() => {
      if (!hold || hold.pointerId !== pointerId) return;
      hold.committed = true;
      const position = clientToWorld(view, stage, startClientX, startClientY);
      config.onIntent({ kind: "here", position });
    }, config.holdDurationMs);
    hold = {
      pointerId,
      startClientX,
      startClientY,
      timerId,
      committed: false
    };
  };
  const onPointerMove = (ev) => {
    if (!hold || hold.pointerId !== ev.pointerId) return;
    if (hold.committed) return;
    const dx = ev.clientX - hold.startClientX;
    const dy = ev.clientY - hold.startClientY;
    if (dx * dx + dy * dy > config.holdCancelTolerancePx * config.holdCancelTolerancePx) {
      cancelHold();
    }
  };
  const onPointerUp = (ev) => {
    if (!hold || hold.pointerId !== ev.pointerId) return;
    cancelHold();
  };
  const onPointerCancel = (ev) => {
    if (!hold || hold.pointerId !== ev.pointerId) return;
    cancelHold();
  };
  view.addEventListener("pointerdown", onPointerDown);
  view.addEventListener("pointermove", onPointerMove);
  view.addEventListener("pointerup", onPointerUp);
  view.addEventListener("pointercancel", onPointerCancel);
  return () => {
    cancelHold();
    view.removeEventListener("pointerdown", onPointerDown);
    view.removeEventListener("pointermove", onPointerMove);
    view.removeEventListener("pointerup", onPointerUp);
    view.removeEventListener("pointercancel", onPointerCancel);
  };
}

// src/module/render/animation.ts
function runAnimation(container, config) {
  const { durationMs, fadeInMs, fadeOutMs, update, onComplete } = config;
  const ticker = canvas.app.ticker;
  const startMs = performance.now();
  const totalMs = fadeInMs + durationMs + fadeOutMs;
  let canceled = false;
  const tick = () => {
    if (canceled) return;
    const elapsed = performance.now() - startMs;
    let alpha = 1;
    if (elapsed < fadeInMs) {
      alpha = elapsed / fadeInMs;
    } else if (elapsed > fadeInMs + durationMs) {
      const fadeOutElapsed = elapsed - fadeInMs - durationMs;
      alpha = Math.max(0, 1 - fadeOutElapsed / fadeOutMs);
    }
    container.alpha = alpha;
    update(elapsed);
    if (elapsed >= totalMs) {
      canceled = true;
      ticker.remove(tick);
      onComplete();
    }
  };
  ticker.add(tick);
  return () => {
    if (canceled) return;
    canceled = true;
    ticker.remove(tick);
  };
}

// src/module/render/graphics.ts
var HERE_RING_COUNT = 3;
var HERE_CYCLE_MS = 2e3;
var HERE_LINE_WIDTH = 2;
var HERE_BASE_ALPHA = 0.55;
var HERE_INNER_RATIO = 0.15;
function createHereVisual({ color, size }) {
  const container = new PIXI.Container();
  const outerR = size / 2;
  const innerR = size * HERE_INNER_RATIO;
  const rings = [];
  for (let i = 0; i < HERE_RING_COUNT; i++) {
    const ring = new PIXI.Graphics();
    container.addChild(ring);
    rings.push(ring);
  }
  function update(elapsedMs) {
    for (let i = 0; i < HERE_RING_COUNT; i++) {
      const phase = (elapsedMs / HERE_CYCLE_MS + i / HERE_RING_COUNT) % 1;
      const radius = outerR + (innerR - outerR) * phase;
      const alpha = HERE_BASE_ALPHA * (1 - phase * 0.85);
      const ring = rings[i];
      ring.clear();
      ring.lineStyle(HERE_LINE_WIDTH, color, alpha);
      ring.drawCircle(0, 0, radius);
    }
  }
  update(0);
  return { container, update };
}
function createPingVisual(kind, opts) {
  switch (kind) {
    case "here":
      return createHereVisual(opts);
    case "rally":
    case "alert":
    case "text":
    case "token-attach":
      throw new Error(`pings: visual for "${kind}" not yet implemented`);
  }
}

// src/module/render/ping.ts
function createPing(opts) {
  const parent = canvas.controls.pings;
  const visual = createPingVisual(opts.kind, { color: opts.color, size: opts.size });
  visual.container.x = opts.position.x;
  visual.container.y = opts.position.y;
  visual.container.alpha = 0;
  parent.addChild(visual.container);
  const cleanup = () => {
    parent.removeChild(visual.container);
    visual.container.destroy({ children: true });
  };
  const cancel = runAnimation(visual.container, {
    durationMs: opts.durationMs,
    fadeInMs: FADE_IN_MS,
    fadeOutMs: FADE_OUT_MS,
    update: visual.update,
    onComplete: cleanup
  });
  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancel();
      cleanup();
    }
  };
}

// src/module/pings.ts
var teardownTrigger = null;
function resolveUserColor() {
  const c = game.user?.color;
  if (typeof c === "number") return c;
  if (typeof c === "string") {
    const hex = c.startsWith("#") ? c.slice(1) : c;
    const n = parseInt(hex, 16);
    return Number.isNaN(n) ? DEFAULT_PING_COLOR : n;
  }
  if (c && typeof c.valueOf === "function") {
    const n = c.valueOf();
    return typeof n === "number" ? n : DEFAULT_PING_COLOR;
  }
  return DEFAULT_PING_COLOR;
}
function onIntent(intent) {
  createPing({
    kind: intent.kind,
    position: intent.position,
    color: resolveUserColor(),
    size: canvas.dimensions.size,
    durationMs: DEFAULT_PING_DURATION_MS
  });
}
function reinstallTrigger() {
  teardownTrigger?.();
  teardownTrigger = installTrigger({
    binding: parseBinding("LeftClick"),
    holdDurationMs: HOLD_DURATION_MS,
    holdCancelTolerancePx: HOLD_CANCEL_TOLERANCE_PX,
    onIntent
  });
}
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
});
Hooks.on("canvasReady", () => {
  reinstallTrigger();
});
Hooks.on("canvasTearDown", () => {
  teardownTrigger?.();
  teardownTrigger = null;
});
Hooks.once("ready", () => {
  const version = game.modules?.get(MODULE_ID)?.version ?? "0.0.0";
  const api = { version };
  const globals = window;
  globals.NonexIst = globals.NonexIst ?? {};
  globals.NonexIst.Pings = api;
  Hooks.callAll("pingsReady", api);
  console.log(`${MODULE_ID} | ready`);
});
//# sourceMappingURL=pings.js.map
