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
    beginFill(color: number, alpha?: number): PixiGraphics;
    endFill(): PixiGraphics;
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
}

interface FoundryCanvasDimensions {
    size: number;
}

interface FoundryScene {
    id: string;
}

interface FoundryCanvas {
    ready: boolean;
    app: PixiAppLike;
    stage: PixiStageLike;
    controls: FoundryControlsLayer;
    dimensions: FoundryCanvasDimensions;
    scene: FoundryScene | null;
}

declare const PIXI: {
    Container: new () => PixiContainer;
    Graphics: new () => PixiGraphics;
};

interface FoundryUser {
    id: string;
    isGM: boolean;
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

declare const game: FoundryGame;
declare const foundry: {
    utils: {
        randomID(length?: number): string;
    };
};
declare const canvas: FoundryCanvas;
declare const ui: unknown;
declare const CONFIG: unknown;
declare const CONST: unknown;

declare const Hooks: {
    on(hook: string, fn: (...args: unknown[]) => unknown): number;
    once(hook: string, fn: (...args: unknown[]) => unknown): number;
    off(hook: string, id: number): void;
    callAll(hook: string, ...args: unknown[]): boolean;
    call(hook: string, ...args: unknown[]): boolean;
};
