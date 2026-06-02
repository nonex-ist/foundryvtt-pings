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

interface FoundryCanvas {
    ready: boolean;
    app: PixiAppLike;
    stage: PixiStageLike;
    controls: FoundryControlsLayer;
    dimensions: FoundryCanvasDimensions;
    scene: FoundryScene | null;
    tokens: FoundryTokenLayer;
    animatePan(opts: { x?: number; y?: number; scale?: number; duration?: number }): Promise<unknown>;
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

interface FoundryGame {
    user?: FoundryUser;
    users?: { get(id: string): FoundryUser | undefined };
    modules?: { get(id: string): FoundryGameModule | undefined };
    socket?: FoundrySocket;
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
declare const foundry: {
    utils: {
        randomID(length?: number): string;
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
