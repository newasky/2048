export type Cell = {
	value: number;
	id: string;
	merged?: boolean;
	x?: number;
	y?: number;
};

export type Grid = Cell[][];

export type Direction = 'up' | 'down' | 'left' | 'right';
