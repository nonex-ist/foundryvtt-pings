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

interface PixiStageLike {
    worldTransform: PixiMatrixLike;
    scale: PixiPointLike;
}

interface PixiAppLike {
    view: HTMLCanvasElement;
    stage: PixiStageLike;
}

interface FoundryCanvas {
    ready: boolean;
    app: PixiAppLike;
    stage: PixiStageLike;
}

interface FoundryUser {
    id: string;
    isGM: boolean;
}

interface FoundryGameModule {
    version?: string;
}

interface FoundryGame {
    user?: FoundryUser;
    modules?: { get(id: string): FoundryGameModule | undefined };
}

declare const game: FoundryGame;
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
