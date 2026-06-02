/**
 * Minimal Foundry VTT v14 ambient stubs covering the surfaces this module
 * actually touches. Swap in @league-of-foundry-developers/foundry-vtt-types
 * once the module grows further.
 */

interface PixiPointLike {
    x: number;
    y: number;
}

interface PixiMatrixLike {
    tx: number;
    ty: number;
}

interface PixiContainer {
    x: number;
    y: number;
    alpha: number;
    rotation: number;
    visible: boolean;
    scale: PixiPointLike;
    children: ReadonlyArray<PixiContainer>;
    addChild<T extends PixiContainer>(child: T): T;
    removeChild(child: PixiContainer): PixiContainer | undefined;
    destroy(options?: { children?: boolean }): void;
}

interface PixiGraphics extends PixiContainer {
    clear(): PixiGraphics;
    lineStyle(width: number, color?: number, alpha?: number): PixiGraphics;
    drawCircle(x: number, y: number, radius: number): PixiGraphics;
    drawRoundedRect(
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
    ): PixiGraphics;
    beginFill(color: number, alpha?: number): PixiGraphics;
    endFill(): PixiGraphics;
    moveTo(x: number, y: number): PixiGraphics;
    lineTo(x: number, y: number): PixiGraphics;
}

interface PixiTextStyle {
    fontFamily: string;
    fontSize: number;
    fill: number | string;
    stroke: number | string;
    strokeThickness: number;
    align: string;
    wordWrap: boolean;
    wordWrapWidth: number;
}

interface PixiText extends PixiContainer {
    text: string;
    anchor: PixiPointLike;
    style: Partial<PixiTextStyle>;
    readonly width: number;
    readonly height: number;
}

interface PixiStageLike extends PixiContainer {
    worldTransform: PixiMatrixLike;
}

interface PixiTickerCallback {
    (): void;
}

interface PixiTicker {
    add(fn: PixiTickerCallback, context?: unknown): PixiTicker;
    remove(fn: PixiTickerCallback, context?: unknown): PixiTicker;
}

interface PixiAppLike {
    view: HTMLCanvasElement;
    stage: PixiStageLike;
    ticker: PixiTicker;
}

interface FoundryControlsLayer extends PixiContainer {
    pings: PixiContainer;
    drawOffscreenPing(
        pos: PixiPointLike,
        opts?: { style?: string; color?: number; duration?: number },
    ): unknown;
}

interface FoundryCanvasDimensions {
    size: number;
}

interface FoundryScene {
    id: string;
    getFlag(scope: string, key: string): unknown;
    setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
}

interface FoundryToken {
    id: string;
    center: PixiPointLike;
    bounds: { contains(x: number, y: number): boolean };
}

interface FoundryTokenLayer {
    get(id: string): FoundryToken | undefined;
    placeables: ReadonlyArray<FoundryToken>;
}

interface FoundryMouseInteractionManager {
    /**
     * Cancel the manager's current interaction (drag, click, etc.) and
     * reset its state to HOVER. If a drag was in progress the dragged
     * target snaps back to its original position. Safe to call when no
     * interaction is in flight — it short-circuits via state check.
     * Event arg is optional; if omitted, Foundry synthesizes one.
     */
    cancel(event?: unknown): void;
}

interface FoundryCanvas {
    ready: boolean;
    app: PixiAppLike;
    stage: PixiStageLike;
    controls: FoundryControlsLayer;
    dimensions: FoundryCanvasDimensions;
    scene: FoundryScene | null;
    tokens: FoundryTokenLayer;
    animatePan(opts: { x?: number; y?: number; scale?: number; duration?: number }): Promise<unknown>;
    /** Set when a layer's MouseInteractionManager is mid-interaction. Null otherwise. */
    currentMouseManager: FoundryMouseInteractionManager | null;
}

declare const PIXI: {
    Container: new () => PixiContainer;
    Graphics: new () => PixiGraphics;
    Text: new (text: string, style?: Partial<PixiTextStyle>) => PixiText;
};

interface FoundryUser {
    id: string;
    isGM: boolean;
    role: number;
    color: { valueOf(): number } | number | string;
}

interface FoundryGameModule {
    version?: string;
}

type FoundrySocketHandler = (data: unknown) => void;

interface FoundrySocket {
    emit(event: string, data: unknown): void;
    on(event: string, handler: FoundrySocketHandler): void;
    off(event: string, handler: FoundrySocketHandler): void;
}

interface FoundrySettingRegistration<T> {
    name?: string;
    hint?: string;
    scope: 'world' | 'client';
    config: boolean;
    type: NumberConstructor | StringConstructor | BooleanConstructor | ObjectConstructor;
    default: T;
    choices?: Record<string, string>;
    range?: { min: number; max: number; step?: number };
    requiresReload?: boolean;
    onChange?(value: T): void;
}

interface FoundrySettings {
    register<T>(namespace: string, key: string, options: FoundrySettingRegistration<T>): void;
    get<T = unknown>(namespace: string, key: string): T;
    set<T>(namespace: string, key: string, value: T): Promise<T>;
}

interface FoundryGame {
    user?: FoundryUser;
    users?: { get(id: string): FoundryUser | undefined };
    modules?: { get(id: string): FoundryGameModule | undefined };
    socket?: FoundrySocket;
    settings?: FoundrySettings;
    i18n?: {
        /**
         * Look up a translation by key, optionally interpolating `{name}`-
         * style placeholders from `data`. Returns the key itself if no
         * translation is found, so calls are safe in worlds whose lang
         * file doesn't ship our strings yet.
         */
        localize(key: string, data?: Record<string, unknown>): string;
    };
}

interface FoundryNotifications {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

interface FoundryUI {
    notifications: FoundryNotifications;
}

declare const game: FoundryGame;
interface FoundryControlsLayerCtor {
    prototype: {
        _onLongPress?: (...args: unknown[]) => unknown;
    };
}

interface FoundryDialogV2Button {
    label?: string;
    icon?: string;
    default?: boolean;
    action?: string;
}

interface FoundryDialogV2Config {
    window?: { title?: string };
    content?: string;
    ok?: FoundryDialogV2Button;
    rejectClose?: boolean;
    position?: { width?: number };
}

declare const foundry: {
    utils: {
        randomID(length?: number): string;
    };
    canvas?: {
        layers?: {
            ControlsLayer?: FoundryControlsLayerCtor;
        };
    };
    applications?: {
        api?: {
            DialogV2?: {
                /** Form-input dialog. Resolves to the form's parsed values (`{ [name]: value }`), or `null` if the user dismissed the dialog. */
                input(config: FoundryDialogV2Config): Promise<Record<string, unknown> | null>;
                /** Plain prompt dialog. Resolves to whatever the OK button's callback returned, or `null` on dismiss. */
                prompt(config: FoundryDialogV2Config): Promise<unknown>;
            };
        };
    };
};
declare const canvas: FoundryCanvas;
declare const ui: FoundryUI;
declare const CONFIG: unknown;
declare const CONST: {
    USER_ROLES: {
        NONE: 0;
        PLAYER: 1;
        TRUSTED: 2;
        ASSISTANT: 3;
        GAMEMASTER: 4;
    };
};

declare const Hooks: {
    on(hook: string, fn: (...args: unknown[]) => unknown): number;
    once(hook: string, fn: (...args: unknown[]) => unknown): number;
    off(hook: string, id: number): void;
    callAll(hook: string, ...args: unknown[]): boolean;
    call(hook: string, ...args: unknown[]): boolean;
};
