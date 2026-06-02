// src/module/constants.ts
var MODULE_ID = "pings";
var HOLD_DURATION_MS = 350;
var HOLD_CANCEL_TOLERANCE_PX = 5;

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

// src/module/pings.ts
var teardownTrigger = null;
function reinstallTrigger() {
  teardownTrigger?.();
  teardownTrigger = installTrigger({
    binding: parseBinding("LeftClick"),
    holdDurationMs: HOLD_DURATION_MS,
    holdCancelTolerancePx: HOLD_CANCEL_TOLERANCE_PX,
    onIntent: (intent) => {
      console.log(`${MODULE_ID} | intent`, intent);
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
  const api = { version };
  const globals = window;
  globals.NonexIst = globals.NonexIst ?? {};
  globals.NonexIst.Pings = api;
  Hooks.callAll("pingsReady", api);
  console.log(`${MODULE_ID} | ready`);
});
//# sourceMappingURL=pings.js.map
