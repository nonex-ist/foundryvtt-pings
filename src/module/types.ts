export type PingKind = 'here' | 'rally' | 'alert' | 'text' | 'token-attach';

export interface BindingSpec {
    button: 0 | 1 | 2;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
}

export interface WorldPosition {
    x: number;
    y: number;
}

export interface PingIntent {
    kind: PingKind;
    position: WorldPosition;
}
