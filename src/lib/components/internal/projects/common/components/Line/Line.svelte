<script lang="ts">
	import * as d3 from 'd3';

	type T = $$Generic;

	export let type: 'line' | 'area' = 'line';
	export let data: T[] = [];
	export let xAccessorScaled: (d: T) => number;
	export let yAccessorScaled: (d: T) => number;
	export let y0AccessorScaled: number | ((d: T) => number) = 0;
	export let interpolation = d3.curveMonotoneX;
	export let style = '';

	$: lineGenerator = d3[type]<T>().x(xAccessorScaled).y(yAccessorScaled).curve(interpolation);

	$: {
		if (type == 'area') {
			lineGenerator.y0(y0AccessorScaled).y1(yAccessorScaled);
		}
	}

	$: line = lineGenerator(data);
</script>

<path
	class={`Line Line--type-${type}`}
	d={line}
	{style}
	on:mouseover
	on:mouseleave
	on:focus
	on:blur
	role="figure"
	aria-roledescription="area"
/>

<style>
	.Line {
		transition: all 0.3s ease-out;
		outline: none;
	}

	.Line--type-line {
		fill: none;
		stroke: #9980fa;
		stroke-width: 3px;
		stroke-linecap: round;
	}

	.Line--type-area {
		fill: rgba(152, 128, 250, 0.185);
		stroke-width: 0;
	}
</style>
