<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { handleTouchStart, handleTouchMove } from '$lib/touchHandler';
	import type { Grid, Direction, Cell } from '$lib/types';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { Modal } from '@skeletonlabs/skeleton';
	import type { ModalSettings } from '@skeletonlabs/skeleton';
	import { getModalStore } from '@skeletonlabs/skeleton';

	const modalStore = getModalStore();

	let grid: Grid = [];
	let score = 0;
	interface Position {
		row: number;
		col: number;
	}
	let positions = new Map<string, Position>();

	function showGameOverModal() {
		const modal: ModalSettings = {
			type: 'alert',
			title: 'Game Over',
			body: `Final Score: ${score}`,
			buttonTextConfirm: 'Play Again',
			response: (r: boolean) => {
				if (r) startNewGame();
			}
		};
		modalStore.trigger(modal);
	}

	function initializeGrid() {
		grid = Array(4)
			.fill(null)
			.map((_, row) =>
				Array(4)
					.fill(null)
					.map((_, col) => {
						const cell = {
							value: 0,
							id: crypto.randomUUID()
						};
						positions.set(cell.id, { row, col });
						return cell;
					})
			);
		addNewTile();
		addNewTile();
	}

	function addNewTile() {
		const emptyCells = grid.flat().filter((cell) => cell.value === 0);
		if (emptyCells.length === 0) return;

		const newCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
		newCell.value = Math.random() < 0.9 ? 2 : 4;
	}

	let touchStart: { x: number; y: number } | null = null;

	function handleTouch(event: TouchEvent) {
		if (event.type === 'touchstart') {
			touchStart = handleTouchStart(event);
		} else if (event.type === 'touchmove' && touchStart) {
			const direction = handleTouchMove(touchStart, event);
			if (direction) {
				event.preventDefault();
				move(direction as Direction);
				touchStart = null;
			}
		}
	}

	onMount(() => {
		initializeGrid();
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	function handleKeydown(event: KeyboardEvent) {
		const directions: Record<string, Direction> = {
			ArrowUp: 'up',
			ArrowDown: 'down',
			ArrowLeft: 'left',
			ArrowRight: 'right'
		};

		const direction = directions[event.key];
		if (direction) {
			event.preventDefault();
			move(direction);
		}
	}

	function canMove(direction: Direction): boolean {
		const testGrid = JSON.parse(JSON.stringify(grid));

		const isVertical = direction === 'up' || direction === 'down';
		const shouldReverse = direction === 'down' || direction === 'right';

		let lines = isVertical
			? Array(4)
					.fill(null)
					.map((_, i) => testGrid.map((row: number[]) => row[i]))
			: [...testGrid];

		let hasMoved = false;

		lines = lines.map((line) => {
			if (shouldReverse) line = [...line].reverse();

			const originalLine = [...line];
			let cells = line.filter((cell: Cell) => cell.value !== 0);

			// Check for merges
			for (let i = 0; i < cells.length - 1; i++) {
				if (cells[i].value === cells[i + 1].value) {
					hasMoved = true;
					break;
				}
			}

			// Check for position changes
			while (cells.length < 4) {
				cells.push({ value: 0, id: crypto.randomUUID() });
			}

			if (shouldReverse) cells.reverse();

			// Compare original and new positions
			if (!hasMoved) {
				hasMoved = cells.some(
					(cell: Cell, index: number) => cell.value !== originalLine[index].value
				);
			}

			return cells;
		});

		return hasMoved;
	}

	/**
	 * Moves the tiles on the game grid in the specified direction.
	 *
	 * @param direction - The direction to move the tiles, one of 'up', 'down', 'left', or 'right'.
	 * @returns void
	 */
	function move(direction: Direction) {
		if (!canMove(direction)) return;

		const previousGrid = JSON.stringify(grid);
		const newPositions = new Map(positions);

		// Reset merged flags
		grid = grid.map((row) => row.map((cell) => ({ ...cell, merged: false })));

		// Determine movement pattern
		const shouldReverse = direction === 'down' || direction === 'right';
		const isVertical = direction === 'up' || direction === 'down';

		// Get lines (rows or columns)
		let lines = isVertical
			? Array(4)
					.fill(null)
					.map((_, i) => grid.map((row) => row[i]))
			: [...grid];

		// Process each line
		lines = lines.map((line) => {
			// Reverse if needed
			if (shouldReverse) line = [...line].reverse();

			// Remove empty cells
			let cells = line.filter((cell) => cell.value !== 0);

			// Merge tiles
			for (let i = 0; i < cells.length - 1; i++) {
				if (cells[i].value === cells[i + 1].value && !cells[i].merged && !cells[i + 1].merged) {
					cells[i].value *= 2;
					cells[i].merged = true;
					score += cells[i].value;
					cells.splice(i + 1, 1);
				}
			}

			// Fill with empty cells
			while (cells.length < 4) {
				cells.push({
					value: 0,
					id: crypto.randomUUID()
				});
			}

			// Reverse back if needed
			if (shouldReverse) cells.reverse();

			return cells;
		});

		// Update grid
		grid = isVertical
			? Array(4)
					.fill(null)
					.map((_, i) => lines.map((line) => line[i]))
			: lines;

		// Update positions after movement
		grid.forEach((row, i) => {
			row.forEach((cell, j) => {
				newPositions.set(cell.id, { row: i, col: j });
			});
		});

		positions = newPositions;

		if (previousGrid !== JSON.stringify(grid)) {
			addNewTile();
		}

		checkGameOver();
	}

	function checkGameOver() {
		// Check for empty cells
		if (grid.flat().some((cell) => cell.value === 0)) return false;

		// Check for possible merges
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				const current = grid[i][j].value;
				const right = j < 3 ? grid[i][j + 1].value : null;
				const below = i < 3 ? grid[i + 1][j].value : null;

				if ((right && current === right) || (below && current === below)) {
					return false;
				}
			}
		}
		showGameOverModal();
		return true;
	}

	function startNewGame() {
		score = 0;
		initializeGrid();
	}
</script>

<div
	class="container mx-auto p-4"
	on:touchstart|preventDefault={handleTouch}
	on:touchmove|preventDefault={handleTouch}
	on:touchend|preventDefault={() => (touchStart = null)}
>
	<div class="text-center mb-4 dark">
		<h1 class="h1">2048</h1>
		<p class="h4">
			Score:
			<span in:scale={{ duration: 200 }}>
				{score}
			</span>
		</p>
		<button class="btn variant-filled-primary mt-2" on:click={startNewGame}> New Game </button>
	</div>

	<div class="grid grid-cols-4 gap-2 bg-surface-800 p-2 rounded-lg max-w-md mx-auto">
		{#each grid as row, i (i)}
			{#each row as cell, j (cell.id)}
				<div
					class="aspect-square flex items-center justify-center rounded-md text-2xl font-bold relative"
					class:bg-surface-700={cell.value === 0}
					class:bg-primary-300={cell.value === 2}
					class:bg-primary-400={cell.value === 4}
					class:bg-primary-500={cell.value === 8}
					class:bg-primary-600={cell.value === 16}
					class:bg-primary-700={cell.value === 32}
					class:bg-secondary-500={cell.value === 64}
					class:bg-secondary-600={cell.value === 128}
					class:bg-secondary-700={cell.value === 256}
					class:bg-tertiary-500={cell.value === 512}
					class:bg-tertiary-600={cell.value === 1024}
					class:bg-tertiary-700={cell.value === 2048}
					animate:flip={{
						duration: 300,
						easing: cubicOut
					}}
				>
					{#if cell.value}
						<span
							in:scale={{ duration: 200, delay: 50 }}
							out:fade={{ duration: 150 }}
							style="display: block; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"
						>
							{cell.value}
						</span>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>
<Modal />
