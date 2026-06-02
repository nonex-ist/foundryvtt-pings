// src/module/constants.ts
var MODULE_ID = "nonex-ist-pings";
var HOLD_DURATION_MS = 350;
var HOLD_CANCEL_TOLERANCE_PX = 5;
var MENU_SUMMON_PX = 25;
var FADE_IN_MS = 500;
var FADE_OUT_MS = 500;
var DEFAULT_PING_COLOR = 11184810;
var KIND_DEFAULT_DURATION_MS = {
  here: 6e3,
  rally: 6e3,
  alert: 5e3,
  text: 6e3,
  "token-attach": 4e3
};
var ALERT_COLOR = 16724787;
var RALLY_COLOR = 16762432;
var MIN_RALLY_ROLE = 2;
var MIN_ALERT_ROLE = 3;
var RATE_LIMIT_CAPACITY = 3;
var RATE_LIMIT_WINDOW_MS = 5e3;
var AUDIO_ENABLED_DEFAULT = true;
var AUDIO_VOLUME_DEFAULT = 0.5;
var AUDIO_PATH_PREFIX = `modules/${MODULE_ID}/sounds`;

// src/module/settings/keys.ts
var SETTING_KEYS = {
  rateLimitCapacity: "rateLimitCapacity",
  rateLimitWindowMs: "rateLimitWindowMs",
  minRallyRole: "minRallyRole",
  minAlertRole: "minAlertRole",
  triggerBinding: "triggerBinding",
  holdDurationMs: "holdDurationMs",
  holdCancelTolerancePx: "holdCancelTolerancePx",
  menuSummonPx: "menuSummonPx",
  audioEnabled: "audioEnabled",
  audioVolume: "audioVolume"
};
var SCENE_FLAG_DISABLED = "disabled";

// src/module/settings/register.ts
var ROLE_CHOICES = {
  "0": "NONE",
  "1": "PLAYER",
  "2": "TRUSTED",
  "3": "ASSISTANT",
  "4": "GAMEMASTER"
};
function registerSettings(reactivity) {
  if (!game.settings) return;
  const s = game.settings;
  const triggerReinstall = () => reactivity.onTriggerChanged();
  s.register(MODULE_ID, SETTING_KEYS.rateLimitCapacity, {
    name: `${MODULE_ID}.settings.rateLimitCapacity.name`,
    hint: `${MODULE_ID}.settings.rateLimitCapacity.hint`,
    scope: "world",
    config: true,
    type: Number,
    default: RATE_LIMIT_CAPACITY,
    range: { min: 1, max: 100, step: 1 },
    requiresReload: true
  });
  s.register(MODULE_ID, SETTING_KEYS.rateLimitWindowMs, {
    name: `${MODULE_ID}.settings.rateLimitWindowMs.name`,
    hint: `${MODULE_ID}.settings.rateLimitWindowMs.hint`,
    scope: "world",
    config: true,
    type: Number,
    default: RATE_LIMIT_WINDOW_MS,
    range: { min: 1e3, max: 6e4, step: 500 },
    requiresReload: true
  });
  s.register(MODULE_ID, SETTING_KEYS.minRallyRole, {
    name: `${MODULE_ID}.settings.minRallyRole.name`,
    hint: `${MODULE_ID}.settings.minRallyRole.hint`,
    scope: "world",
    config: true,
    type: Number,
    default: MIN_RALLY_ROLE,
    choices: ROLE_CHOICES,
    requiresReload: false
  });
  s.register(MODULE_ID, SETTING_KEYS.minAlertRole, {
    name: `${MODULE_ID}.settings.minAlertRole.name`,
    hint: `${MODULE_ID}.settings.minAlertRole.hint`,
    scope: "world",
    config: true,
    type: Number,
    default: MIN_ALERT_ROLE,
    choices: ROLE_CHOICES,
    requiresReload: false
  });
  s.register(MODULE_ID, SETTING_KEYS.triggerBinding, {
    name: `${MODULE_ID}.settings.triggerBinding.name`,
    hint: `${MODULE_ID}.settings.triggerBinding.hint`,
    scope: "client",
    config: true,
    type: String,
    default: "LeftClick",
    onChange: triggerReinstall
  });
  s.register(MODULE_ID, SETTING_KEYS.holdDurationMs, {
    name: `${MODULE_ID}.settings.holdDurationMs.name`,
    hint: `${MODULE_ID}.settings.holdDurationMs.hint`,
    scope: "client",
    config: true,
    type: Number,
    default: HOLD_DURATION_MS,
    range: { min: 100, max: 2e3, step: 50 },
    onChange: triggerReinstall
  });
  s.register(MODULE_ID, SETTING_KEYS.holdCancelTolerancePx, {
    name: `${MODULE_ID}.settings.holdCancelTolerancePx.name`,
    hint: `${MODULE_ID}.settings.holdCancelTolerancePx.hint`,
    scope: "client",
    config: true,
    type: Number,
    default: HOLD_CANCEL_TOLERANCE_PX,
    range: { min: 1, max: 50, step: 1 },
    onChange: triggerReinstall
  });
  s.register(MODULE_ID, SETTING_KEYS.menuSummonPx, {
    name: `${MODULE_ID}.settings.menuSummonPx.name`,
    hint: `${MODULE_ID}.settings.menuSummonPx.hint`,
    scope: "client",
    config: true,
    type: Number,
    default: MENU_SUMMON_PX,
    range: { min: 5, max: 200, step: 5 },
    onChange: triggerReinstall
  });
  s.register(MODULE_ID, SETTING_KEYS.audioEnabled, {
    name: `${MODULE_ID}.settings.audioEnabled.name`,
    hint: `${MODULE_ID}.settings.audioEnabled.hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: AUDIO_ENABLED_DEFAULT,
    onChange: (value) => reactivity.onAudioEnabledChanged(value)
  });
  s.register(MODULE_ID, SETTING_KEYS.audioVolume, {
    name: `${MODULE_ID}.settings.audioVolume.name`,
    hint: `${MODULE_ID}.settings.audioVolume.hint`,
    scope: "client",
    config: true,
    type: Number,
    default: AUDIO_VOLUME_DEFAULT,
    range: { min: 0, max: 1, step: 0.05 },
    onChange: (value) => reactivity.onAudioVolumeChanged(value)
  });
}
function getOr(key, fallback) {
  if (!game.settings) return fallback;
  try {
    const value = game.settings.get(MODULE_ID, key);
    return value === void 0 || value === null ? fallback : value;
  } catch {
    return fallback;
  }
}
function getRateLimitCapacity() {
  return getOr(SETTING_KEYS.rateLimitCapacity, RATE_LIMIT_CAPACITY);
}
function getRateLimitWindowMs() {
  return getOr(SETTING_KEYS.rateLimitWindowMs, RATE_LIMIT_WINDOW_MS);
}
function getMinRallyRole() {
  return getOr(SETTING_KEYS.minRallyRole, MIN_RALLY_ROLE);
}
function getMinAlertRole() {
  return getOr(SETTING_KEYS.minAlertRole, MIN_ALERT_ROLE);
}
function getTriggerBinding() {
  return getOr(SETTING_KEYS.triggerBinding, "LeftClick");
}
function getHoldDurationMs() {
  return getOr(SETTING_KEYS.holdDurationMs, HOLD_DURATION_MS);
}
function getHoldCancelTolerancePx() {
  return getOr(SETTING_KEYS.holdCancelTolerancePx, HOLD_CANCEL_TOLERANCE_PX);
}
function getMenuSummonPx() {
  return getOr(SETTING_KEYS.menuSummonPx, MENU_SUMMON_PX);
}
function getAudioEnabled() {
  return getOr(SETTING_KEYS.audioEnabled, AUDIO_ENABLED_DEFAULT);
}
function getAudioVolume() {
  return getOr(SETTING_KEYS.audioVolume, AUDIO_VOLUME_DEFAULT);
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
var RALLY_ARROW_COUNT = 4;
var RALLY_CYCLE_MS = 1100;
var RALLY_LINE_WIDTH = 4;
var RALLY_BASE_ALPHA = 0.95;
var RALLY_OUTER_RATIO = 0.85;
var RALLY_INNER_RATIO = 0.1;
var RALLY_ARROW_HALF_SPAN = 0.18;
function createRallyVisual({ color, size }) {
  const container = new PIXI.Container();
  const outerR = size * RALLY_OUTER_RATIO;
  const innerR = size * RALLY_INNER_RATIO;
  const armLen = size * RALLY_ARROW_HALF_SPAN;
  const arrows = [];
  for (let i = 0; i < RALLY_ARROW_COUNT; i++) {
    const g = new PIXI.Graphics();
    g.rotation = i / RALLY_ARROW_COUNT * Math.PI * 2;
    container.addChild(g);
    arrows.push(g);
  }
  function update(elapsedMs) {
    for (let i = 0; i < RALLY_ARROW_COUNT; i++) {
      const phase = (elapsedMs / RALLY_CYCLE_MS + i / RALLY_ARROW_COUNT) % 1;
      const radius = outerR - (outerR - innerR) * phase;
      const safeArm = Math.min(armLen, radius * 0.85);
      const fade = phase < 0.15 ? phase / 0.15 : 1 - (phase - 0.15) / 0.85;
      const alpha = RALLY_BASE_ALPHA * fade;
      const g = arrows[i];
      g.clear();
      g.lineStyle(RALLY_LINE_WIDTH, color, alpha);
      g.moveTo(radius, -safeArm);
      g.lineTo(radius - safeArm, 0);
      g.lineTo(radius, safeArm);
    }
  }
  update(0);
  return { container, update };
}
var ALERT_LINE_WIDTH = 3;
var ALERT_ROTATION_PERIOD_MS = 3e3;
var ALERT_PULSE_PERIOD_MS = 250;
var ALERT_PULSE_SCALE = 1.2;
function createAlertVisual({ color, size }) {
  const container = new PIXI.Container();
  const chevronDist = size * 0.35;
  const chevronHalfWidth = size * 0.15;
  const chevronDepth = size * 0.15;
  const shape = new PIXI.Graphics();
  shape.lineStyle(ALERT_LINE_WIDTH, color, 1);
  shape.moveTo(-chevronHalfWidth, -chevronDist);
  shape.lineTo(0, -chevronDist - chevronDepth);
  shape.lineTo(chevronHalfWidth, -chevronDist);
  shape.moveTo(chevronDist, -chevronHalfWidth);
  shape.lineTo(chevronDist + chevronDepth, 0);
  shape.lineTo(chevronDist, chevronHalfWidth);
  shape.moveTo(-chevronHalfWidth, chevronDist);
  shape.lineTo(0, chevronDist + chevronDepth);
  shape.lineTo(chevronHalfWidth, chevronDist);
  shape.moveTo(-chevronDist, -chevronHalfWidth);
  shape.lineTo(-chevronDist - chevronDepth, 0);
  shape.lineTo(-chevronDist, chevronHalfWidth);
  container.addChild(shape);
  function update(elapsedMs) {
    container.rotation = elapsedMs / ALERT_ROTATION_PERIOD_MS * Math.PI * 2;
    const pulseCycle = elapsedMs / ALERT_PULSE_PERIOD_MS % 2;
    const scale = pulseCycle < 1 ? 1 : ALERT_PULSE_SCALE;
    container.scale.x = scale;
    container.scale.y = scale;
  }
  update(0);
  return { container, update };
}
var TEXT_PADDING_PX = 8;
var TEXT_CORNER_RADIUS_PX = 6;
var TEXT_FONT_SIZE = 18;
var TEXT_BG_ALPHA = 0.65;
var TEXT_MAX_WIDTH_PX = 320;
var TEXT_OFFSET_Y = 14;
function createTextVisual({ color, text }) {
  const container = new PIXI.Container();
  const label = new PIXI.Text(text ?? "", {
    fontFamily: "Signika, sans-serif",
    fontSize: TEXT_FONT_SIZE,
    fill: 16777215,
    stroke: 0,
    strokeThickness: 4,
    align: "center",
    wordWrap: true,
    wordWrapWidth: TEXT_MAX_WIDTH_PX
  });
  label.anchor.x = 0.5;
  label.anchor.y = 0.5;
  const labelHeight = label.height;
  const tagHalfHeight = labelHeight / 2 + TEXT_PADDING_PX;
  const offsetY = -tagHalfHeight - TEXT_OFFSET_Y;
  label.y = offsetY;
  const bg = new PIXI.Graphics();
  bg.beginFill(color, TEXT_BG_ALPHA);
  bg.drawRoundedRect(
    -label.width / 2 - TEXT_PADDING_PX,
    offsetY - labelHeight / 2 - TEXT_PADDING_PX,
    label.width + TEXT_PADDING_PX * 2,
    labelHeight + TEXT_PADDING_PX * 2,
    TEXT_CORNER_RADIUS_PX
  );
  bg.endFill();
  container.addChild(bg);
  container.addChild(label);
  function update(_elapsedMs) {
  }
  return { container, update };
}
var TOKEN_FRAME_COUNT = 3;
var TOKEN_CYCLE_MS = 1400;
var TOKEN_LINE_WIDTH = 3;
var TOKEN_BASE_ALPHA = 0.95;
var TOKEN_OUTER_RATIO = 0.55;
var TOKEN_INNER_RATIO = 0.22;
var TOKEN_ARM_RATIO = 0.18;
function createTokenAttachVisual({ color, size }) {
  const container = new PIXI.Container();
  const outerOffset = size * TOKEN_OUTER_RATIO;
  const innerOffset = size * TOKEN_INNER_RATIO;
  const baseArmLen = size * TOKEN_ARM_RATIO;
  const frames = [];
  for (let i = 0; i < TOKEN_FRAME_COUNT; i++) {
    const g = new PIXI.Graphics();
    container.addChild(g);
    frames.push(g);
  }
  function drawFrame(g, offset, alpha) {
    const armLen = Math.min(baseArmLen, offset * 0.7);
    g.clear();
    g.lineStyle(TOKEN_LINE_WIDTH, color, alpha);
    g.moveTo(-offset, -offset + armLen);
    g.lineTo(-offset, -offset);
    g.lineTo(-offset + armLen, -offset);
    g.moveTo(offset - armLen, -offset);
    g.lineTo(offset, -offset);
    g.lineTo(offset, -offset + armLen);
    g.moveTo(offset, offset - armLen);
    g.lineTo(offset, offset);
    g.lineTo(offset - armLen, offset);
    g.moveTo(-offset + armLen, offset);
    g.lineTo(-offset, offset);
    g.lineTo(-offset, offset - armLen);
  }
  function update(elapsedMs) {
    for (let i = 0; i < TOKEN_FRAME_COUNT; i++) {
      const phase = (elapsedMs / TOKEN_CYCLE_MS + i / TOKEN_FRAME_COUNT) % 1;
      const offset = outerOffset - (outerOffset - innerOffset) * phase;
      const fade = phase < 0.15 ? phase / 0.15 : 1 - (phase - 0.15) / 0.85;
      const alpha = TOKEN_BASE_ALPHA * fade;
      drawFrame(frames[i], offset, alpha);
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
      return createRallyVisual(opts);
    case "alert":
      return createAlertVisual(opts);
    case "text":
      return createTextVisual(opts);
    case "token-attach":
      return createTokenAttachVisual(opts);
  }
}

// src/module/render/ping.ts
function createPing(opts) {
  const parent = canvas.controls.pings;
  const visual = createPingVisual(opts.kind, {
    color: opts.color,
    size: opts.size,
    text: opts.text
  });
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
  const { positionProvider } = opts;
  const frameUpdate = positionProvider ? (elapsedMs) => {
    const pos = positionProvider();
    visual.container.x = pos.x;
    visual.container.y = pos.y;
    visual.update(elapsedMs);
  } : visual.update;
  const cancel = runAnimation(visual.container, {
    durationMs: opts.durationMs,
    fadeInMs: FADE_IN_MS,
    fadeOutMs: FADE_OUT_MS,
    update: frameUpdate,
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
var VALID_KINDS = /* @__PURE__ */ new Set([
  "here",
  "rally",
  "alert",
  "text",
  "token-attach"
]);
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
function assertKind(value, name = "kind") {
  if (typeof value !== "string" || !VALID_KINDS.has(value)) {
    const allowed = [...VALID_KINDS].join(", ");
    throw new TypeError(`pings: ${name} must be one of: ${allowed}`);
  }
  return value;
}

// src/module/api/index.ts
function warnUser(message) {
  if (typeof ui !== "undefined" && ui?.notifications) {
    ui.notifications.warn(message);
  } else {
    console.warn(`${MODULE_ID} | ${message}`);
  }
}
function i18n(key, fallback, data) {
  const localized = game.i18n?.localize(key, data);
  if (!localized || localized === key) {
    if (!data) return fallback;
    return fallback.replace(/\{(\w+)\}/g, (_, k) => String(data[k] ?? ""));
  }
  return localized;
}
function isCurrentSceneDisabled() {
  return canvas.scene?.getFlag(MODULE_ID, SCENE_FLAG_DISABLED) === true;
}
function createApi(config) {
  const registry = /* @__PURE__ */ new Map();
  const attachedTokens = /* @__PURE__ */ new Map();
  const trackAttach = (tokenId) => {
    attachedTokens.set(tokenId, (attachedTokens.get(tokenId) ?? 0) + 1);
  };
  const untrackAttach = (tokenId) => {
    const next = (attachedTokens.get(tokenId) ?? 0) - 1;
    if (next <= 0) attachedTokens.delete(tokenId);
    else attachedTokens.set(tokenId, next);
  };
  Hooks.on("preUpdateToken", (...args) => {
    const tokenDoc = args[0];
    const changes = args[1];
    if (!tokenDoc?.id || !changes) return void 0;
    const moves = changes.x !== void 0 || changes.y !== void 0 || changes.rotation !== void 0;
    if (!moves) return void 0;
    if (!attachedTokens.has(tokenDoc.id)) return void 0;
    ui.notifications?.warn(
      i18n(
        "nonex-ist-pings.notifications.tokenMovementBlocked",
        "Pings: {name} is marked \u2014 movement blocked until the marker fades.",
        { name: tokenDoc.name ?? "token" }
      )
    );
    return false;
  });
  function displayLocally(payload) {
    let positionProvider;
    if (payload.kind === "token-attach" && payload.tokenId) {
      const tokenId = payload.tokenId;
      const fallback = payload.position;
      positionProvider = () => canvas.tokens?.get(tokenId)?.center ?? fallback;
      trackAttach(tokenId);
    }
    const handle = createPing({
      kind: payload.kind,
      position: payload.position,
      color: payload.color,
      size: config.canvasSizeProvider(),
      durationMs: payload.durationMs ?? KIND_DEFAULT_DURATION_MS[payload.kind],
      text: payload.text,
      positionProvider,
      onDispose: () => {
        registry.delete(payload.id);
        if (payload.kind === "token-attach" && payload.tokenId) {
          untrackAttach(payload.tokenId);
        }
      }
    });
    if (payload.kind === "rally" && payload.moveCanvas && config.userRoleProvider() >= getMinRallyRole()) {
      void canvas.animatePan({ x: payload.position.x, y: payload.position.y, duration: 250 });
    }
    if (payload.kind !== "rally" && canvas.controls?.drawOffscreenPing) {
      try {
        canvas.controls.drawOffscreenPing(payload.position, {
          color: payload.color,
          duration: payload.durationMs ?? KIND_DEFAULT_DURATION_MS[payload.kind]
        });
      } catch (err) {
        console.warn(`${MODULE_ID} | drawOffscreenPing failed`, err);
      }
    }
    registry.set(payload.id, handle);
    Hooks.callAll("nonex-ist-pings.display", handle, payload);
    return handle;
  }
  function buildPayload(kind, position, opts) {
    assertKind(kind);
    assertPosition(position);
    let color;
    if (opts?.color !== void 0) {
      color = assertColor(opts.color);
    } else if (kind === "alert") {
      color = ALERT_COLOR;
    } else if (kind === "rally") {
      color = RALLY_COLOR;
    } else {
      color = config.senderColorProvider();
    }
    const durationMs = opts?.durationMs !== void 0 ? assertPositiveInt(opts.durationMs, "durationMs") : KIND_DEFAULT_DURATION_MS[kind];
    let moveCanvas;
    if (opts?.moveCanvas !== void 0) {
      if (typeof opts.moveCanvas !== "boolean") {
        throw new TypeError("pings: moveCanvas must be a boolean");
      }
      moveCanvas = opts.moveCanvas;
    } else {
      moveCanvas = kind === "rally";
    }
    if (opts?.text !== void 0 && typeof opts.text !== "string") {
      throw new TypeError("pings: text must be a string");
    }
    if (opts?.tokenId !== void 0 && (typeof opts.tokenId !== "string" || opts.tokenId.length === 0)) {
      throw new TypeError("pings: tokenId must be a non-empty string");
    }
    if (kind === "text" && (opts?.text === void 0 || opts.text.length === 0)) {
      throw new TypeError("pings: kind 'text' requires a non-empty `text` option");
    }
    if (kind === "token-attach" && opts?.tokenId === void 0) {
      throw new TypeError("pings: kind 'token-attach' requires a `tokenId` option");
    }
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
      durationMs,
      moveCanvas
    };
    if (opts?.text !== void 0) payload.text = opts.text;
    if (opts?.tokenId !== void 0) payload.tokenId = opts.tokenId;
    return payload;
  }
  function checkSenderRole(kind) {
    if (kind === "alert" && config.userRoleProvider() < getMinAlertRole()) {
      warnUser(
        i18n(
          "nonex-ist-pings.notifications.alertRoleRequired",
          "Alert pings require Assistant role or higher."
        )
      );
      return false;
    }
    return true;
  }
  function ping(kind, position, opts) {
    if (isCurrentSceneDisabled()) return null;
    if (!checkSenderRole(kind)) return null;
    const payload = buildPayload(kind, position, opts);
    if (!payload) return null;
    if (!Hooks.call("nonex-ist-pings.preDisplay", payload)) return null;
    if (!config.socketProvider()?.broadcast({ type: "displayPing", payload })) return null;
    displayLocally(payload);
    return payload.id;
  }
  function showPing(kind, position, opts) {
    if (isCurrentSceneDisabled()) return null;
    if (!checkSenderRole(kind)) return null;
    const payload = buildPayload(kind, position, opts);
    if (!payload) return null;
    if (!Hooks.call("nonex-ist-pings.preDisplay", payload)) return null;
    displayLocally(payload);
    return payload.id;
  }
  function sendPing(kind, position, opts) {
    if (isCurrentSceneDisabled()) return null;
    if (!checkSenderRole(kind)) return null;
    const payload = buildPayload(kind, position, opts);
    if (!payload) return null;
    if (!Hooks.call("nonex-ist-pings.preDisplay", payload)) return null;
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
      isSceneDisabled: isCurrentSceneDisabled,
      async setSceneDisabled(disabled) {
        if (!canvas.scene) return;
        await canvas.scene.setFlag(MODULE_ID, SCENE_FLAG_DISABLED, disabled);
      },
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
      if (isCurrentSceneDisabled()) return;
      if (!Hooks.call("nonex-ist-pings.preDisplay", payload)) return;
      displayLocally(payload);
    },
    handleInboundRemove(payload) {
      const handle = registry.get(payload.id);
      registry.delete(payload.id);
      handle?.destroy();
    }
  };
}

// src/module/audio/play.ts
function createAudioController() {
  let enabled = AUDIO_ENABLED_DEFAULT;
  let volume = AUDIO_VOLUME_DEFAULT;
  return {
    play(kind) {
      if (!enabled) return;
      try {
        const audio2 = new Audio(`${AUDIO_PATH_PREFIX}/${kind}.ogg`);
        audio2.volume = volume;
        const result = audio2.play();
        if (result instanceof Promise) {
          result.catch(() => {
          });
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | audio playback failed for kind=${kind}`, err);
      }
    },
    setEnabled(value) {
      enabled = value;
    },
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
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
  { kind: "rally", angleCenter: -Math.PI / 2, i18n: "nonex-ist-pings.radial.rally", fallback: "Rally" },
  { kind: "alert", angleCenter: 0, i18n: "nonex-ist-pings.radial.alert", fallback: "Alert" },
  { kind: "text", angleCenter: Math.PI / 2, i18n: "nonex-ist-pings.radial.text", fallback: "Text" },
  { kind: "token-attach", angleCenter: Math.PI, i18n: "nonex-ist-pings.radial.token", fallback: "Token" }
];
function tr(key, fallback) {
  const out = game.i18n?.localize(key);
  return out && out !== key ? out : fallback;
}
function colorToHex(value) {
  return `#${Math.max(0, Math.min(16777215, value)).toString(16).padStart(6, "0")}`;
}
function darken(color, ratio) {
  const r = Math.max(0, Math.min(255, Math.floor((color >> 16 & 255) * ratio)));
  const g = Math.max(0, Math.min(255, Math.floor((color >> 8 & 255) * ratio)));
  const b = Math.max(0, Math.min(255, Math.floor((color & 255) * ratio)));
  return r << 16 | g << 8 | b;
}
function lighten(color, amount) {
  const r = color >> 16 & 255;
  const g = color >> 8 & 255;
  const b = color & 255;
  const nr = Math.floor(r + (255 - r) * amount);
  const ng = Math.floor(g + (255 - g) * amount);
  const nb = Math.floor(b + (255 - b) * amount);
  return nr << 16 | ng << 8 | nb;
}
var GRADIENT_INNER_RATIO = 0.4;
function buildRadialGradient(id, color) {
  const grad = document.createElementNS(SVG_NS, "radialGradient");
  grad.setAttribute("id", id);
  grad.setAttribute("cx", "0");
  grad.setAttribute("cy", "0");
  grad.setAttribute("r", `${OUTER_RADIUS_PX}`);
  grad.setAttribute("gradientUnits", "userSpaceOnUse");
  const dark = document.createElementNS(SVG_NS, "stop");
  dark.setAttribute("offset", "0%");
  dark.setAttribute("stop-color", colorToHex(darken(color, GRADIENT_INNER_RATIO)));
  grad.appendChild(dark);
  const bright = document.createElementNS(SVG_NS, "stop");
  bright.setAttribute("offset", "100%");
  bright.setAttribute("stop-color", colorToHex(color));
  grad.appendChild(bright);
  return grad;
}
function pickKindFromDelta(deltaX, deltaY, deadzonePx) {
  const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (dist < deadzonePx) return "here";
  const angle = Math.atan2(deltaY, deltaX);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) return "alert";
  if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) return "text";
  if (angle >= -(3 * Math.PI) / 4 && angle < -Math.PI / 4) return "rally";
  return "token-attach";
}
var SVG_NS = "http://www.w3.org/2000/svg";
var INNER_RADIUS_PX = 32;
var OUTER_RADIUS_PX = 108;
var CENTER_RADIUS_PX = 28;
var LABEL_RADIUS_PX = (INNER_RADIUS_PX + OUTER_RADIUS_PX) / 2;
var SVG_HALF_SIZE_PX = OUTER_RADIUS_PX + 12;
var SVG_SIZE_PX = SVG_HALF_SIZE_PX * 2;
function arcPath(innerR, outerR, startAngle, endAngle) {
  const x1i = innerR * Math.cos(startAngle);
  const y1i = innerR * Math.sin(startAngle);
  const x1o = outerR * Math.cos(startAngle);
  const y1o = outerR * Math.sin(startAngle);
  const x2o = outerR * Math.cos(endAngle);
  const y2o = outerR * Math.sin(endAngle);
  const x2i = innerR * Math.cos(endAngle);
  const y2i = innerR * Math.sin(endAngle);
  return `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${outerR} ${outerR} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${innerR} ${innerR} 0 0 0 ${x1i} ${y1i} Z`;
}
function openRadialMenu(opts) {
  const root = document.createElement("div");
  root.className = "nonex-ist-pings-radial-menu nonex-ist-pings-radial-menu--passive";
  root.style.left = `${opts.clientX}px`;
  root.style.top = `${opts.clientY}px`;
  const userBase = opts.userColor;
  const userLight = lighten(opts.userColor, 0.4);
  const userDark = darken(opts.userColor, 0.55);
  root.style.setProperty("--nonex-ist-pings-user-base", colorToHex(userBase));
  root.style.setProperty("--nonex-ist-pings-user-light", colorToHex(userLight));
  root.style.setProperty("--nonex-ist-pings-user-dark", colorToHex(userDark));
  const disabledKinds = new Set(opts.disabledKinds ?? []);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "nonex-ist-pings-radial-svg");
  svg.setAttribute("width", `${SVG_SIZE_PX}`);
  svg.setAttribute("height", `${SVG_SIZE_PX}`);
  svg.setAttribute(
    "viewBox",
    `${-SVG_HALF_SIZE_PX} ${-SVG_HALF_SIZE_PX} ${SVG_SIZE_PX} ${SVG_SIZE_PX}`
  );
  root.appendChild(svg);
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.appendChild(buildRadialGradient("nonex-ist-pings-grad-rally", 16762432));
  defs.appendChild(buildRadialGradient("nonex-ist-pings-grad-alert", 16724787));
  defs.appendChild(buildRadialGradient("nonex-ist-pings-grad-text", userLight));
  defs.appendChild(buildRadialGradient("nonex-ist-pings-grad-token", userDark));
  svg.appendChild(defs);
  const segments = /* @__PURE__ */ new Map();
  for (const seg of RADIAL_SEGMENTS) {
    const path = document.createElementNS(SVG_NS, "path");
    let className = "nonex-ist-pings-radial-segment";
    if (disabledKinds.has(seg.kind)) className += " nonex-ist-pings-radial-disabled";
    path.setAttribute("class", className);
    path.dataset.kind = seg.kind;
    const half = Math.PI / 4;
    path.setAttribute(
      "d",
      arcPath(
        INNER_RADIUS_PX,
        OUTER_RADIUS_PX,
        seg.angleCenter - half,
        seg.angleCenter + half
      )
    );
    svg.appendChild(path);
    segments.set(seg.kind, path);
  }
  const center = document.createElementNS(SVG_NS, "circle");
  center.setAttribute("class", "nonex-ist-pings-radial-segment nonex-ist-pings-radial-center");
  center.dataset.kind = "here";
  center.setAttribute("cx", "0");
  center.setAttribute("cy", "0");
  center.setAttribute("r", `${CENTER_RADIUS_PX}`);
  svg.appendChild(center);
  segments.set("here", center);
  const centerRing = document.createElementNS(SVG_NS, "circle");
  centerRing.setAttribute("class", "nonex-ist-pings-radial-center-ring");
  centerRing.setAttribute("cx", "0");
  centerRing.setAttribute("cy", "0");
  centerRing.setAttribute("r", `${CENTER_RADIUS_PX + 3.5}`);
  svg.appendChild(centerRing);
  const outerRing = document.createElementNS(SVG_NS, "circle");
  outerRing.setAttribute("class", "nonex-ist-pings-radial-outer-ring");
  outerRing.setAttribute("cx", "0");
  outerRing.setAttribute("cy", "0");
  outerRing.setAttribute("r", `${OUTER_RADIUS_PX + 0.5}`);
  svg.appendChild(outerRing);
  for (const seg of RADIAL_SEGMENTS) {
    const label = document.createElementNS(SVG_NS, "text");
    let labelClass = "nonex-ist-pings-radial-label";
    if (disabledKinds.has(seg.kind)) labelClass += " nonex-ist-pings-radial-disabled";
    label.setAttribute("class", labelClass);
    label.setAttribute("x", `${LABEL_RADIUS_PX * Math.cos(seg.angleCenter)}`);
    label.setAttribute("y", `${LABEL_RADIUS_PX * Math.sin(seg.angleCenter)}`);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = tr(seg.i18n, seg.fallback);
    svg.appendChild(label);
  }
  const centerLabel = document.createElementNS(SVG_NS, "text");
  centerLabel.setAttribute("class", "nonex-ist-pings-radial-label nonex-ist-pings-radial-center-label");
  centerLabel.setAttribute("x", "0");
  centerLabel.setAttribute("y", "0");
  centerLabel.setAttribute("text-anchor", "middle");
  centerLabel.setAttribute("dominant-baseline", "middle");
  centerLabel.textContent = tr("nonex-ist-pings.radial.ping", "Ping");
  svg.appendChild(centerLabel);
  document.body.appendChild(root);
  let active = false;
  let currentHighlight = null;
  const clearHighlight = () => {
    if (currentHighlight !== null) {
      const el = segments.get(currentHighlight);
      if (el) el.classList.remove("nonex-ist-pings-radial-active");
      currentHighlight = null;
    }
  };
  const highlight = (kind) => {
    if (!active) return;
    const effective = disabledKinds.has(kind) ? "here" : kind;
    if (currentHighlight === effective) return;
    clearHighlight();
    const el = segments.get(effective);
    if (el) el.classList.add("nonex-ist-pings-radial-active");
    currentHighlight = effective;
  };
  return {
    setActive(value) {
      if (active === value) return;
      active = value;
      if (active) {
        root.classList.remove("nonex-ist-pings-radial-menu--passive");
      } else {
        root.classList.add("nonex-ist-pings-radial-menu--passive");
        clearHighlight();
      }
    },
    onCursorMove(clientX, clientY) {
      if (!active) return;
      highlight(
        pickKindFromDelta(clientX - opts.clientX, clientY - opts.clientY, opts.deadzonePx)
      );
    },
    getSelectedKind(clientX, clientY) {
      if (!active) return "here";
      const picked = pickKindFromDelta(
        clientX - opts.clientX,
        clientY - opts.clientY,
        opts.deadzonePx
      );
      return disabledKinds.has(picked) ? "here" : picked;
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
      try {
        canvas.currentMouseManager?.cancel();
      } catch (err) {
        console.warn("pings | could not cancel native interaction", err);
      }
      hold.phase = "preview";
      hold.timerId = null;
      const bundle = config.callbacks.showPreview(startWorld, {
        x: startClientX,
        y: startClientY
      });
      hold.previewDispose = bundle.previewDispose;
      hold.menu = bundle.menu;
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
      if (distSq >= config.menuSummonPx * config.menuSummonPx) {
        hold.menu?.setActive(true);
        hold.menu?.onCursorMove(ev.clientX, ev.clientY);
        hold.phase = "menu";
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
    const previewDispose = hold.previewDispose;
    hold.previewDispose = null;
    reset();
    if (commitKind !== null) {
      config.callbacks.commit(commitKind, commitPosition, previewDispose);
    } else if (previewDispose) {
      previewDispose();
    }
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

// src/module/native-ping.ts
var restore = null;
function suppressNativeLongPress() {
  if (restore) return;
  const proto = foundry.canvas?.layers?.ControlsLayer?.prototype;
  if (!proto || typeof proto._onLongPress !== "function") {
    console.warn(
      `${MODULE_ID} | could not locate ControlsLayer._onLongPress \u2014 native long-press ping may still fire`
    );
    return;
  }
  const original = proto._onLongPress;
  proto._onLongPress = function noop() {
  };
  restore = () => {
    proto._onLongPress = original;
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
var SOCKET_NAME = `module.${MODULE_ID}`;
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
var audio = null;
var previewExpiresAt = 0;
function tr2(key, fallback) {
  const out = game.i18n?.localize(key);
  return out && out !== key ? out : fallback;
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}
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
function findTokenIdAt(position) {
  const placeables = canvas.tokens?.placeables ?? [];
  for (const token of placeables) {
    if (token.bounds.contains(position.x, position.y)) return token.id;
  }
  return null;
}
function showPreviewBundle(worldPosition, clientPosition) {
  const previewDurationMs = KIND_DEFAULT_DURATION_MS.here;
  const handle = createPing({
    kind: "here",
    position: worldPosition,
    color: resolveUserColor(),
    size: canvas.dimensions.size,
    durationMs: previewDurationMs
  });
  previewExpiresAt = Date.now() + previewDurationMs + FADE_IN_MS + FADE_OUT_MS;
  const disabledKinds = findTokenIdAt(worldPosition) ? [] : ["token-attach"];
  const menu = openRadialMenu({
    clientX: clientPosition.x,
    clientY: clientPosition.y,
    deadzonePx: getMenuSummonPx(),
    userColor: resolveUserColor(),
    disabledKinds
  });
  return {
    previewDispose: () => handle.destroy(),
    menu
  };
}
async function promptForTextPing(position) {
  const dialog = foundry.applications?.api?.DialogV2;
  if (!dialog) {
    const text2 = window.prompt(tr2("nonex-ist-pings.dialog.textPrompt", "Ping text:"));
    if (text2) apiBundle?.api.ping("text", position, { text: text2 });
    return;
  }
  const title = tr2("nonex-ist-pings.dialog.textTitle", "Pings \u2014 text");
  const label = tr2("nonex-ist-pings.dialog.textLabel", "Text");
  const confirm = tr2("nonex-ist-pings.dialog.textConfirm", "Ping");
  const result = await dialog.input({
    window: { title },
    content: `<div class="form-group"><label>${escapeHtml(label)}</label><input type="text" name="text" autofocus required maxlength="200" /></div>`,
    ok: { label: confirm, icon: "fa-solid fa-location-crosshairs" }
  });
  const text = result?.text?.trim();
  if (!text) return;
  apiBundle?.api.ping("text", position, { text });
}
function commitPing(kind, position, previewDispose) {
  if (!apiBundle) {
    previewDispose?.();
    return;
  }
  const previewAlive = previewDispose !== null && Date.now() < previewExpiresAt;
  if (kind === "here" && previewAlive) {
    audio?.play("here");
    apiBundle.api.sendHere(position);
    return;
  }
  previewDispose?.();
  if (kind === "text") {
    void promptForTextPing(position);
    return;
  }
  if (kind === "token-attach") {
    const tokenId = findTokenIdAt(position);
    if (!tokenId) {
      ui?.notifications?.warn(
        tr2("nonex-ist-pings.notifications.noTokenUnderCursor", "Pings: no token under the cursor.")
      );
      return;
    }
    apiBundle.api.ping("token-attach", position, { tokenId });
    return;
  }
  apiBundle.api.ping(kind, position);
}
function reinstallTrigger() {
  teardownTrigger?.();
  if (!canvas.app?.view) return;
  let binding;
  try {
    binding = parseBinding(getTriggerBinding());
  } catch (err) {
    console.warn(`${MODULE_ID} | invalid trigger binding, falling back to LeftClick`, err);
    binding = parseBinding("LeftClick");
  }
  teardownTrigger = installTrigger({
    binding,
    holdDurationMs: getHoldDurationMs(),
    holdCancelTolerancePx: getHoldCancelTolerancePx(),
    menuSummonPx: getMenuSummonPx(),
    callbacks: {
      showPreview: showPreviewBundle,
      commit: commitPing
    }
  });
}
Hooks.once("init", () => {
  registerSettings({
    onTriggerChanged: () => {
      if (canvas.ready) reinstallTrigger();
    },
    onAudioEnabledChanged: (enabled) => audio?.setEnabled(enabled),
    onAudioVolumeChanged: (volume) => audio?.setVolume(volume)
  });
  suppressNativeLongPress();
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
  audio = createAudioController();
  audio.setEnabled(getAudioEnabled());
  audio.setVolume(getAudioVolume());
  Hooks.on("nonex-ist-pings.display", (_handle, payload) => {
    const kind = payload?.kind;
    if (kind) audio?.play(kind);
  });
  apiBundle = createApi({
    version,
    sceneIdProvider: () => canvas.scene?.id ?? null,
    senderIdProvider: () => game.user?.id ?? null,
    senderColorProvider: resolveUserColor,
    userRoleProvider: () => game.user?.role ?? 0,
    canvasSizeProvider: () => canvas.dimensions.size,
    socketProvider: () => socketHandle
  });
  socketHandle = installSocket({
    handlers: {
      onDisplay: apiBundle.handleInboundDisplay,
      onRemove: apiBundle.handleInboundRemove
    },
    rateLimit: createRateLimit({
      capacity: getRateLimitCapacity(),
      windowMs: getRateLimitWindowMs()
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
  Hooks.callAll("nonex-ist-pings.ready", api);
  console.log(`${MODULE_ID} | ready`);
});
//# sourceMappingURL=pings.js.map
