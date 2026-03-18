export type Screen = 'lock' | 'frames' | 'camera' | 'result';

export interface Frame {
    id: string;
    image: string;
    label: string;
}

export interface Shot {
    id: number;
    status: 'pending' | 'current' | 'done';
}
