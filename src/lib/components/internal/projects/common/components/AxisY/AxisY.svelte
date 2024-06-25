<script lang="ts">
	import { format } from 'd3';
	import type { ScaleLinear } from 'd3';

	export let yScale: ScaleLinear<number, number, never>;
	export let innerChartWidth: number;

	const numberFormatter = (num: number): string => format('.2s')(num).replace('G', 'B');

	$: yTicks = yScale.ticks(6);
</script>

<g class="axis y">
	{#each yTicks as tick, index}
		<g class="tick" transform="translate(0, {yScale(tick)})">
			<line x1={0} y1={0} y2={0} x2={innerChartWidth} stroke="#b1b1b1" />
			<text x={-45} y={0} dominant-baseline="middle">
				{numberFormatter(tick)}
			</text>
		</g>
	{/each}
	<text
		style="transform: translate(-60px, {yScale.range()[0] * 0.5}px) rotate(-90deg);"
		text-anchor="middle"
	>
		Population
	</text>
</g>

<style lang="scss">
	.tick {
		transition: all 500ms ease;
	}

	text {
		font-size: 1.4rem;
		font-family: var(--font-base);
		user-select: none;
		fill: var(--clr-text-on-surface-1000);
	}
</style>
