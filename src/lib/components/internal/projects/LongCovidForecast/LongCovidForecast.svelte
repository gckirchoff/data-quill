<script lang="ts">
	import { scaleLinear, scaleTime, extent, max } from 'd3';

	import { Body2 } from '../../typography';
	import AxisX from '../common/components/AxisX/AxisX.svelte';
	import AxisY from '../common/components/AxisY/AxisY.svelte';
	import Line from '../common/components/Line/Line.svelte';
	import { margin } from './constants';
	import type { PopulationByYear } from './constants';
	import { forecastPopulationWithDisabilityOverTime } from './logic';

	const initialPopulation = 330e6;
	let initialLongCovidPopulation = 0;
	let years = 10;

	let birthRate = 2.212;
	let deathRate = 0.727272727;
	let longCovidDeathRate = 1;

	let infectionRate = 130;
	let longCovidRate = 10;

	let width = 400;
	let height = 400;

	$: innerChartWidth = width - margin.left - margin.right;
	$: innerChartHeight = height - margin.top - margin.bottom;

	const xAccessor = (d: PopulationByYear) => d.year;
	const yAccessorTotalPopulation = (d: PopulationByYear) => d.populationStatus.totalPopulation;
	const yAccessorDisabledPopulation = (d: PopulationByYear) =>
		d.populationStatus.disabledPopulation;

	$: populationOverTime = forecastPopulationWithDisabilityOverTime({
		birthRate,
		deathRate,
		disabledDeathRate: deathRate * longCovidDeathRate,
		initialPopulation,
		initialDisabledPopulation: initialLongCovidPopulation,
		infectionRate,
		disabilityRate: longCovidRate,
		years,
	});

	$: xScale = scaleLinear().domain([0, years]).range([0, innerChartWidth]);
	$: yScale = scaleLinear()
		.domain([0, 360e6])
		.range([innerChartHeight, 0]);
</script>

<div class="inputs-container">
	<label class="range-input">
		<Body2>
			{infectionRate / 100} Covid infection rate:
		</Body2>
		<input bind:value={infectionRate} type="range" min={0} max={200} step={10} />
	</label>
	<label class="range-input">
		<Body2>
			{longCovidRate}% Long Covid Rate:
		</Body2>
		<input bind:value={longCovidRate} type="range" min={0} max={100} step={1} />
	</label>
	<label class="range-input">
		<Body2>
			{longCovidDeathRate}X Long Covid Death Rate:
		</Body2>
		<input bind:value={longCovidDeathRate} type="range" min={1} max={30} step={0.1} />
	</label>
</div>
<div class="chart-container" bind:clientWidth={width} role="application">
	<svg {width} {height}>
		<g style="transform: translate({margin.left}px, {margin.top}px)">
			<AxisX {xScale} {innerChartWidth} {innerChartHeight} />
			<AxisY {yScale} {innerChartWidth} />
			<Line
				type="area"
				data={populationOverTime}
				xAccessorScaled={(d) => xScale(xAccessor(d))}
				yAccessorScaled={(d) => yScale(yAccessorTotalPopulation(d))}
				y0AccessorScaled={innerChartHeight}
			/>
			<Line
				data={populationOverTime}
				xAccessorScaled={(d) => xScale(xAccessor(d))}
				yAccessorScaled={(d) => yScale(yAccessorTotalPopulation(d))}
			/>
			<Line
				type="area"
				data={populationOverTime}
				xAccessorScaled={(d) => xScale(xAccessor(d))}
				yAccessorScaled={(d) => yScale(yAccessorDisabledPopulation(d))}
				y0AccessorScaled={innerChartHeight}
				style="fill: orangered; opacity: 0.5;"
			/>
			<Line
				data={populationOverTime}
				xAccessorScaled={(d) => xScale(xAccessor(d))}
				yAccessorScaled={(d) => yScale(yAccessorDisabledPopulation(d))}
				style="stroke: red;"
			/>
		</g>
	</svg>
</div>

<style lang="scss">
	@import '/src/styles/mixins.scss';

	label {
		cursor: pointer;
		user-select: none;
		input {
			cursor: pointer;
		}
	}

	.inputs-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		row-gap: var(--spacing-8);
		column-gap: var(--spacing-16);
		margin-top: var(--spacing-8);
		margin-bottom: var(--spacing-32);

		@include respond('mobile') {
			margin-bottom: 0;
		}

		.range-input {
			display: flex;
			flex-direction: column;
			align-items: center;
			row-gap: var(--spacing-4);
			cursor: pointer;
		}
	}
</style>
