// src/module/constants.ts
var MODULE_ID = "pings";
var HOLD_DURATION_MS = 350;
var HOLD_CANCEL_TOLERANCE_PX = 5;
var MENU_SUMMON_PX = 25;
var FADE_IN_MS = 500;
var FADE_OUT_MS = 500;
var DEFAULT_PING_DURATION_MS = 6e3;
var DEFAULT_PING_COLOR = 11184810;
var RATE_LIMIT_CAPACITY = 3;
var RATE_LIMIT_WINDOW_MS = 5e3;

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
    case "rally":
    case "alert":
    case "text":
    case "token-attach":
      return createHereVisual(opts);
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
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    parent.removeChild(visual.container);
    visual.container.destroy({ children: true });
    opts.onDispose?.();
  };
  const cancel = runAnimation(visual.container, {
    durationMs: opts.durationMs,
    fadeInMs: FADE_IN_MS,
    fadeOutMs: FADE_OUT_MS,
    update: visual.update,
    onComplete: dispose
  });
  return {
    destroy() {
      cancel();
      dispose();
    }
  };
}

// src/module/api/validators.ts
var MAX_COLOR = 16777215;
function assertPosition(value, name = "position") {
  if (value === null || typeof value !== "object" || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new TypeError(`pings: ${name} must be { x: number, y: number } with finite values`);
  }
  return value;
}
function assertColor(value, name = "color") {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_COLOR) {
    throw new TypeError(
      `pings: ${name} must be an integer between 0x000000 and 0xffffff`
    );
  }
  return value;
}
function assertId(value, name = "id") {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`pings: ${name} must be a non-empty string`);
  }
  return value;
}
function assertPositiveInt(value, name) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`pings: ${name} must be a positive integer`);
  }
  return value;
}

// src/module/api/index.ts
function createApi(config) {
  const registry = /* @__PURE__ */ new Map();
  function displayLocally(payload) {
    const handle = createPing({
      kind: payload.kind,
      position: payload.position,
      color: payload.color,
      size: config.canvasSizeProvider(),
      durationMs: payload.durationMs ?? DEFAULT_PING_DURATION_MS,
      onDispose: () => {
        registry.delete(payload.id);
      }
    });
    registry.set(payload.id, handle);
    Hooks.callAll("pings.display", handle, payload);
    return handle;
  }
  function buildPayload(kind, position, opts) {
    assertPosition(position);
    const color = opts?.color !== void 0 ? assertColor(opts.color) : config.senderColorProvider();
    const durationMs = opts?.durationMs !== void 0 ? assertPositiveInt(opts.durationMs, "durationMs") : void 0;
    const sceneId = config.sceneIdProvider();
    const senderId = config.senderIdProvider();
    if (!sceneId || !senderId) return null;
    const payload = {
      id: foundry.utils.randomID(),
      sceneId,
      senderId,
      kind,
      position,
      color,
      moveCanvas: false
    };
    if (durationMs !== void 0) payload.durationMs = durationMs;
    return payload;
  }
  function ping(kind, position, opts) {
    const payload = buildPayload(kind, position, opts);
    if (!payload) return null;
    if (!Hooks.call("pings.preDisplay", payload)) return null;
    if (!config.socketProvider()?.broadcast({ type: "displayPing", payload })) return null;
    displayLocally(payload);
    return payload.id;
  }
  function showPing(kind, position, opts) {
    const payload = buildPayload(kind, position, opts);
    if (!payload) return null;
    if (!Hooks.call("pings.preDisplay", payload)) return null;
    displayLocally(payload);
    return payload.id;
  }
  function sendPing(kind, position, opts) {
    const payload = buildPayload(kind, position, opts);
    if (!payload) return null;
    if (!Hooks.call("pings.preDisplay", payload)) return null;
    if (!config.socketProvider()?.broadcast({ type: "displayPing", payload })) return null;
    return payload.id;
  }
  return {
    api: {
      version: config.version,
      ping,
      showPing,
      sendPing,
      here: (position, opts) => ping("here", position, opts),
      showHere: (position, opts) => showPing("here", position, opts),
      sendHere: (position, opts) => sendPing("here", position, opts),
      remove(id, opts) {
        assertId(id);
        const handle = registry.get(id);
        registry.delete(id);
        handle?.destroy();
        if (opts?.broadcast !== false) {
          const sceneId = config.sceneIdProvider();
          const socket = config.socketProvider();
          if (sceneId && socket) {
            socket.broadcast({
              type: "removePing",
              payload: { id, sceneId }
            });
          }
        }
      }
    },
    handleInboundDisplay(payload) {
      if (!Hooks.call("pings.preDisplay", payload)) return;
      displayLocally(payload);
    },
    handleInboundRemove(payload) {
      const handle = registry.get(payload.id);
      registry.delete(payload.id);
      handle?.destroy();
    }
  };
}

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

// src/module/input/radial-menu.ts
var RADIAL_SEGMENTS = [
  { kind: "rally", angleCenter: -Math.PI / 2, label: "Rally" },
  { kind: "alert", angleCenter: 0, label: "Alert" },
  { kind: "text", angleCenter: Math.PI / 2, label: "Text" },
  { kind: "token-attach", angleCenter: Math.PI, label: "Token" }
];
function pickKindFromDelta(deltaX, deltaY, deadzonePx) {
  const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (dist < deadzonePx) return "here";
  const angle = Math.atan2(deltaY, deltaX);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) return "alert";
  if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) return "text";
  if (angle >= -(3 * Math.PI) / 4 && angle < -Math.PI / 4) return "rally";
  return "token-attach";
}
var SEGMENT_RADIUS_PX = 70;
var SEGMENT_HALF_SIZE_PX = 28;
function openRadialMenu(opts) {
  const root = document.createElement("div");
  root.className = "pings-radial-menu";
  root.style.left = `${opts.clientX}px`;
  root.style.top = `${opts.clientY}px`;
  const center = document.createElement("div");
  center.className = "pings-radial-segment pings-radial-center";
  center.textContent = "Here";
  root.appendChild(center);
  const segments = /* @__PURE__ */ new Map([["here", center]]);
  for (const seg of RADIAL_SEGMENTS) {
    const el = document.createElement("div");
    el.className = "pings-radial-segment";
    el.textContent = seg.label;
    const offsetX = Math.cos(seg.angleCenter) * SEGMENT_RADIUS_PX - SEGMENT_HALF_SIZE_PX;
    const offsetY = Math.sin(seg.angleCenter) * SEGMENT_RADIUS_PX - SEGMENT_HALF_SIZE_PX;
    el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    root.appendChild(el);
    segments.set(seg.kind, el);
  }
  document.body.appendChild(root);
  let currentHighlight = null;
  const highlight = (kind) => {
    if (currentHighlight === kind) return;
    if (currentHighlight !== null) {
      segments.get(currentHighlight)?.classList.remove("pings-radial-active");
    }
    segments.get(kind)?.classList.add("pings-radial-active");
    currentHighlight = kind;
  };
  highlight("here");
  return {
    onCursorMove(clientX, clientY) {
      highlight(pickKindFromDelta(clientX - opts.clientX, clientY - opts.clientY, opts.deadzonePx));
    },
    getSelectedKind(clientX, clientY) {
      return pickKindFromDelta(clientX - opts.clientX, clientY - opts.clientY, opts.deadzonePx);
    },
    destroy() {
      root.remove();
    }
  };
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
  const reset = () => {
    if (!hold) return;
    if (hold.timerId !== null) clearTimeout(hold.timerId);
    hold.previewDispose?.();
    hold.menu?.destroy();
    hold = null;
  };
  const onPointerDown = (ev) => {
    if (hold) return;
    if (!eventMatches(ev, config.binding)) return;
    const startClientX = ev.clientX;
    const startClientY = ev.clientY;
    const startWorld = clientToWorld(view, stage, startClientX, startClientY);
    const pointerId = ev.pointerId;
    const timerId = setTimeout(() => {
      if (!hold || hold.pointerId !== pointerId || hold.phase !== "holding") return;
      hold.phase = "preview";
      hold.timerId = null;
      hold.previewDispose = config.callbacks.showPreview(startWorld);
    }, config.holdDurationMs);
    hold = {
      phase: "holding",
      pointerId,
      startClientX,
      startClientY,
      startWorld,
      timerId,
      previewDispose: null,
      menu: null
    };
  };
  const onPointerMove = (ev) => {
    if (!hold || hold.pointerId !== ev.pointerId) return;
    const dx = ev.clientX - hold.startClientX;
    const dy = ev.clientY - hold.startClientY;
    const distSq = dx * dx + dy * dy;
    if (hold.phase === "holding") {
      if (distSq > config.holdCancelTolerancePx * config.holdCancelTolerancePx) {
        reset();
      }
      return;
    }
    if (hold.phase === "preview") {
      if (distSq > config.menuSummonPx * config.menuSummonPx) {
        hold.previewDispose?.();
        hold.previewDispose = null;
        hold.menu = config.callbacks.openMenu(
          { x: hold.startClientX, y: hold.startClientY },
          hold.startWorld
        );
        hold.phase = "menu";
        hold.menu.onCursorMove(ev.clientX, ev.clientY);
      }
      return;
    }
    hold.menu?.onCursorMove(ev.clientX, ev.clientY);
  };
  const onPointerUp = (ev) => {
    if (!hold || hold.pointerId !== ev.pointerId) return;
    let commitKind = null;
    if (hold.phase === "preview") {
      commitKind = "here";
    } else if (hold.phase === "menu" && hold.menu) {
      commitKind = hold.menu.getSelectedKind(ev.clientX, ev.clientY);
    }
    const commitPosition = hold.startWorld;
    reset();
    if (commitKind !== null) config.callbacks.commit(commitKind, commitPosition);
  };
  const onPointerCancel = (ev) => {
    if (!hold || hold.pointerId !== ev.pointerId) return;
    reset();
  };
  view.addEventListener("pointerdown", onPointerDown);
  view.addEventListener("pointermove", onPointerMove);
  view.addEventListener("pointerup", onPointerUp);
  view.addEventListener("pointercancel", onPointerCancel);
  return () => {
    reset();
    view.removeEventListener("pointerdown", onPointerDown);
    view.removeEventListener("pointermove", onPointerMove);
    view.removeEventListener("pointerup", onPointerUp);
    view.removeEventListener("pointercancel", onPointerCancel);
  };
}

// src/module/network/rate-limit.ts
function createRateLimit(config) {
  const { capacity, windowMs } = config;
  const clock = config.now ?? (() => performance.now());
  const log = /* @__PURE__ */ new Map();
  return {
    allow(senderId, isGM) {
      if (isGM) return true;
      const now = clock();
      const cutoff = now - windowMs;
      const prior = log.get(senderId);
      const fresh = prior ? prior.filter((t) => t > cutoff) : [];
      if (fresh.length >= capacity) {
        if (fresh !== prior) log.set(senderId, fresh);
        return false;
      }
      fresh.push(now);
      log.set(senderId, fresh);
      return true;
    }
  };
}

// src/module/network/messages.ts
var SOCKET_NAME = "module.pings";
var KINDS = /* @__PURE__ */ new Set([
  "here",
  "rally",
  "alert",
  "text",
  "token-attach"
]);
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isWorldPosition(value) {
  return isObject(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}
function isDisplayPayload(value) {
  if (!isObject(value)) return false;
  return typeof value.id === "string" && typeof value.sceneId === "string" && typeof value.senderId === "string" && typeof value.kind === "string" && KINDS.has(value.kind) && isWorldPosition(value.position) && typeof value.color === "number" && Number.isFinite(value.color) && typeof value.moveCanvas === "boolean" && (value.durationMs === void 0 || typeof value.durationMs === "number" && Number.isInteger(value.durationMs) && value.durationMs > 0) && (value.text === void 0 || typeof value.text === "string") && (value.tokenId === void 0 || typeof value.tokenId === "string");
}
function isRemovePayload(value) {
  return isObject(value) && typeof value.id === "string" && typeof value.sceneId === "string";
}
function parseSocketMessage(raw) {
  if (!isObject(raw)) return null;
  if (raw.type === "displayPing" && isDisplayPayload(raw.payload)) {
    return { type: "displayPing", payload: raw.payload };
  }
  if (raw.type === "removePing" && isRemovePayload(raw.payload)) {
    return { type: "removePing", payload: raw.payload };
  }
  return null;
}

// src/module/network/socket.ts
function installSocket(config) {
  const socket = game.socket;
  const { handlers, rateLimit, sceneIdProvider, isUserGM } = config;
  const onMessage = (raw) => {
    const message = parseSocketMessage(raw);
    if (!message) {
      console.warn(`${MODULE_ID} | dropped malformed socket payload`);
      return;
    }
    const currentSceneId = sceneIdProvider();
    if (currentSceneId === null || message.payload.sceneId !== currentSceneId) {
      return;
    }
    if (message.type === "displayPing") {
      if (!rateLimit.allow(message.payload.senderId, isUserGM(message.payload.senderId))) {
        console.warn(
          `${MODULE_ID} | rate-limited inbound displayPing from ${message.payload.senderId}`
        );
        return;
      }
      handlers.onDisplay(message.payload);
    } else {
      handlers.onRemove(message.payload);
    }
  };
  socket?.on(SOCKET_NAME, onMessage);
  return {
    broadcast(message) {
      if (message.type === "displayPing") {
        if (!rateLimit.allow(message.payload.senderId, isUserGM(message.payload.senderId))) {
          return false;
        }
      }
      socket?.emit(SOCKET_NAME, message);
      return true;
    },
    teardown() {
      socket?.off(SOCKET_NAME, onMessage);
    }
  };
}

// src/module/pings.ts
var teardownTrigger = null;
var socketHandle = null;
var apiBundle = null;
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
function showPreviewPing(position) {
  const id = apiBundle?.api.showHere(position) ?? null;
  return () => {
    if (id !== null) apiBundle?.api.remove(id, { broadcast: false });
  };
}
function commitPing(kind, position) {
  if (kind === "here") {
    apiBundle?.api.sendHere(position);
  } else {
    apiBundle?.api.ping(kind, position);
  }
}
function reinstallTrigger() {
  teardownTrigger?.();
  teardownTrigger = installTrigger({
    binding: parseBinding("LeftClick"),
    holdDurationMs: HOLD_DURATION_MS,
    holdCancelTolerancePx: HOLD_CANCEL_TOLERANCE_PX,
    menuSummonPx: MENU_SUMMON_PX,
    callbacks: {
      showPreview: showPreviewPing,
      openMenu: (clientPosition) => openRadialMenu({
        clientX: clientPosition.x,
        clientY: clientPosition.y,
        deadzonePx: MENU_SUMMON_PX
      }),
      commit: commitPing
    }
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
  apiBundle = createApi({
    version,
    sceneIdProvider: () => canvas.scene?.id ?? null,
    senderIdProvider: () => game.user?.id ?? null,
    senderColorProvider: resolveUserColor,
    canvasSizeProvider: () => canvas.dimensions.size,
    socketProvider: () => socketHandle
  });
  socketHandle = installSocket({
    handlers: {
      onDisplay: apiBundle.handleInboundDisplay,
      onRemove: apiBundle.handleInboundRemove
    },
    rateLimit: createRateLimit({
      capacity: RATE_LIMIT_CAPACITY,
      windowMs: RATE_LIMIT_WINDOW_MS
    }),
    sceneIdProvider: () => canvas.scene?.id ?? null,
    isUserGM: (userId) => game.users?.get(userId)?.isGM ?? false
  });
  const api = apiBundle.api;
  const moduleEntry = game.modules?.get(MODULE_ID);
  if (moduleEntry) {
    moduleEntry.api = api;
  }
  const globals = window;
  globals.NonexIst = globals.NonexIst ?? {};
  globals.NonexIst.Pings = api;
  Hooks.callAll("pingsReady", api);
  console.log(`${MODULE_ID} | ready`);
});
//# sourceMappingURL=pings.js.map
