<script lang="ts">
	import { scaleLinear, scaleTime, line, max, format } from 'd3';

	import { Body2 } from '../../typography';
	import AxisX from './AxisX/AxisX.svelte';
	import AxisY from './AxisY/AxisY.svelte';
	import Line from './Line/Line.svelte';
	import type {
		Distribution,
		PredictedCases,
		Mode,
		PreventionDeterminant,
		Audience,
		Variant,
	} from './constants';
	import { beginningOfPandemic, endOfChart } from './constants';
	import {
		addYearsToDate,
		getCumulativeCasesUpToDate,
		getDistributions,
		createSummedDistribution,
		integrateBaselineCases,
		createBaselineCases,
		createNoiseValues,
		noisifyBaseline,
	} from './logic';
	import { roundTo } from '../util/math';

	export let audience: Audience = 'general';
	export let variant: Variant = 'standard';

	const numberFormatter = (num: number): string => format('.2s')(num).replace('G', 'B');

	let preventionDeterminant: PreventionDeterminant = variant === 'standard' ? 'panic' : 'date';
	let yearsFromNowToStartPrevention = 5;
	let hazardRatio = 1.5;
	let delay = 20;
	let baselineCancer = 18000000;
	let baselineCancerSlope = 0;
	let baselineNoise = 0;
	let mode: Mode = 'summed';
	let realLifeMode = false;

	let panicThreshold = 0.05;
	let panicPredictionPoint: PredictedCases | null = null;

	let distributions: Distribution[] = [];
	let summedDistributions: PredictedCases[] = [];

	$: internalMode = mode as Mode;

	$: dateOfPrevention = addYearsToDate(beginningOfPandemic, yearsFromNowToStartPrevention);
	$: standardDeviation = delay / 3;
	$: finalDateToMeasureTo = addYearsToDate(dateOfPrevention, delay + 1 + standardDeviation * 3);
	$: totalExtraCases = Math.floor(summedDistributions.reduce((acc, { cases }) => acc + cases, 0));
	$: casesThatHaveOccuredSoFar = getCumulativeCasesUpToDate(
		preventionDeterminant === 'date'
			? dateOfPrevention
			: panicPredictionPoint
				? panicPredictionPoint.date
				: endOfChart,
		summedDistributions,
	);
	$: casesYetToCome = totalExtraCases - casesThatHaveOccuredSoFar;

	$: {
		if (preventionDeterminant === 'date') {
			const newDistributions = getDistributions({
				beginningOfPandemic,
				dateOfPrevention,
				finalDateToMeasureTo,
				baselineCancer,
				hazardRatio,
				delay,
				stdDeviation: standardDeviation,
			});
			distributions = newDistributions;

			const newSummedDistributions = createSummedDistribution({
				beginningOfPandemic,
				finalDateToMeasureTo,
				distributions: newDistributions,
			});
			summedDistributions = newSummedDistributions;
		} else {
			const fullScopeDate = addYearsToDate(endOfChart, 10);

			const allDistributions = getDistributions({
				beginningOfPandemic,
				dateOfPrevention: fullScopeDate,
				finalDateToMeasureTo: fullScopeDate,
				baselineCancer,
				hazardRatio,
				delay,
				stdDeviation: standardDeviation,
			});

			const worstCaseSum = createSummedDistribution({
				beginningOfPandemic,
				finalDateToMeasureTo: fullScopeDate,
				distributions: allDistributions,
			});

			const panicExtraCasesAmount = baselineCancer * (1 + panicThreshold);
			const panicIndex = worstCaseSum.findIndex(
				({ cases }) => cases + baselineCancer > panicExtraCasesAmount,
			);

			const pointOfPanic = worstCaseSum[panicIndex];

			if (!pointOfPanic) {
				panicPredictionPoint = null;
				distributions = allDistributions;
				summedDistributions = worstCaseSum;
			} else {
				const panicDateToMeasureTo = addYearsToDate(
					pointOfPanic.date,
					delay + 1 + standardDeviation * 3,
				);

				const distributionsUntilPanic = getDistributions({
					beginningOfPandemic,
					dateOfPrevention: pointOfPanic.date,
					finalDateToMeasureTo: panicDateToMeasureTo,
					baselineCancer,
					hazardRatio,
					delay,
					stdDeviation: standardDeviation,
				});

				const panicSummedDistributions = createSummedDistribution({
					beginningOfPandemic,
					finalDateToMeasureTo: panicDateToMeasureTo,
					distributions: distributionsUntilPanic,
				});

				panicPredictionPoint = pointOfPanic;
				distributions = distributionsUntilPanic;
				summedDistributions = panicSummedDistributions;
			}
		}
	}

	const xAccessor = (d: PredictedCases) => d.date;
	const yAccessor = (d: PredictedCases) => d.cases + baselineCancer;

	let width = 400;
	let height = 550;

	const margin = {
		top: 10,
		left: 45,
		bottom: 50,
		right: 35,
	};

	$: innerChartWidth = width - margin.left - margin.right;
	$: innerChartHeight = height - margin.top - margin.bottom;

	$: xDomainEnd =
		audience === 'general' || preventionDeterminant === 'date'
			? endOfChart
			: panicPredictionPoint
				? addYearsToDate(panicPredictionPoint.date, delay + standardDeviation * 3.5)
				: endOfChart;

	$: xScale = scaleTime()
		.domain([beginningOfPandemic, xDomainEnd])
		.range([0, innerChartWidth])
		.nice();

	$: indexOfLastPointToRender = summedDistributions.findIndex(
		({ date }) => date >= xScale.domain()[1],
	);
	$: renderedSummedCases = summedDistributions.slice(0, indexOfLastPointToRender);

	$: indexOfCancerSoFarEnd =
		renderedSummedCases.findIndex(({ date }) => {
			if (preventionDeterminant === 'date') {
				return dateOfPrevention.getFullYear() <= date.getFullYear();
			}
			if (!panicPredictionPoint) {
				return false;
			}
			return panicPredictionPoint.date.getFullYear() <= date.getFullYear();
		}) + 1;

	$: baseline = createBaselineCases({
		start: beginningOfPandemic,
		end: endOfChart,
		baselineCancerSlope,
		baselineCancer,
	});
	$: noiseValues = createNoiseValues(baseline, baselineNoise);
	$: baselineCancerCases = noisifyBaseline(baseline, noiseValues);

	$: cutoffAtEndOfChart = ({ date }: PredictedCases) =>
		date.getFullYear() < endOfChart.getFullYear();

	$: plottedExtraCases = integrateBaselineCases(
		renderedSummedCases,
		baselineCancerCases,
		baselineCancer,
	).filter(cutoffAtEndOfChart);
	$: plottedExtraCasesSoFarArea = integrateBaselineCases(
		renderedSummedCases.slice(0, indexOfCancerSoFarEnd),
		baselineCancerCases,
		baselineCancer,
	);

	$: lastCancerCasesLevel = baselineCancerCases[Math.floor(baselineCancerCases.length / 3)];
	$: baselineLevelForYDomain = lastCancerCasesLevel ? lastCancerCasesLevel.cases : baselineCancer;
	$: baselineDerivedYDomainMax = baselineLevelForYDomain * 3;

	$: yDomain = (
		internalMode === 'separate'
			? [0, max(distributions[0].predictedCases, yAccessor)]
			: [0, Math.max(baselineDerivedYDomainMax, max(plottedExtraCases, yAccessor) as number)]
	) as [number, number];

	$: yScale = scaleLinear().domain(yDomain).range([innerChartHeight, 0]).nice();

	$: xAccessorScaled = (d: PredictedCases) => xScale(xAccessor(d));
	$: yAccessorScaled = (d: PredictedCases) => yScale(yAccessor(d));

	$: lineGenerator = line<PredictedCases>()
		.x((d) => xScale(xAccessor(d)))
		.y((d) => yScale(yAccessor(d)));

	let preventionStartInfoBox: SVGGElement | null = null;
	let preventionStartInfoBoxXPosition = 0;

	$: {
		if (preventionDeterminant === 'panic' && preventionStartInfoBox && panicPredictionPoint) {
			const { width: boxWidth } = preventionStartInfoBox.getBoundingClientRect();
			const xPosition = xScale(panicPredictionPoint.date);
			const isOverflowingRightBoundary = xPosition + boxWidth > innerChartWidth;
			preventionStartInfoBoxXPosition = isOverflowingRightBoundary
				? xPosition - boxWidth - 20
				: xPosition;
		}
	}

	$: panicThresholdYPosition = yScale(baselineCancer * (1 + panicThreshold));

	let hoveredExtraCasesSoFar = false;
	let hoveredExtraCasesToCome = false;

	const handleShowDistributions = ({
		target,
	}: Event & {
		currentTarget: EventTarget & HTMLLabelElement;
	}) => (internalMode = (target as HTMLInputElement)?.checked ? 'both' : 'summed');
</script>

<div class="widget-container">
	<div class="distributions-toggle">
		{#if variant === 'standard'}
			<label on:change={handleShowDistributions}>
				Show Latency Distributions
				<input type="checkbox" />
			</label>
		{:else}
			<label>
				Real Life View
				<input type="checkbox" bind:checked={realLifeMode} />
			</label>
		{/if}
	</div>
	<div class="inputs-container">
		<label class="range-input">
			<div class="determinant-selector">
				{#if preventionDeterminant === 'date'}
					<Body2>
						{dateOfPrevention.toLocaleDateString()}
						{#if variant === 'noisePlusSlope'}
							prevention
						{/if}
					</Body2>
				{:else}
					<Body2>{Math.round(panicThreshold * 100)}%</Body2>
				{/if}
				{#if variant === 'standard'}
					<select bind:value={preventionDeterminant}>
						<option value="panic">extra cases panic threshold</option>
						<option value="date">date of prevention</option>
					</select>
				{/if}
			</div>
			{#if preventionDeterminant === 'date'}
				<input bind:value={yearsFromNowToStartPrevention} type="range" min={0} max={30} step={1} />
			{:else}
				<input bind:value={panicThreshold} type="range" min={0} max={3} step={0.01} />
			{/if}
		</label>
		<label class="range-input">
			<Body2>
				{hazardRatio} Hazard Ratio:
			</Body2>
			<input bind:value={hazardRatio} type="range" min={1} max={10} step={0.1} />
		</label>
		<label class="range-input">
			<Body2>
				{delay} year delay:
			</Body2>
			<input bind:value={delay} type="range" min={1} max={30} step={1} />
		</label>
		{#if variant === 'standard'}
			<label class="range-input">
				<Body2>
					{numberFormatter(baselineCancer)} baseline incidence:
				</Body2>
				<input
					bind:value={baselineCancer}
					type="range"
					min={1000000}
					max={100000000}
					step={1000000}
				/>
			</label>
		{/if}
		{#if variant === 'noisePlusSlope'}
			<label class="range-input">
				<Body2>
					{roundTo(baselineCancerSlope * 100, 2)}% baseline increase:
				</Body2>
				<input bind:value={baselineCancerSlope} type="range" min={0} max={0.02} step={0.0005} />
			</label>
			<label class="range-input">
				<Body2>
					{Math.round(baselineNoise * 100)}% baseline noise:
				</Body2>
				<input bind:value={baselineNoise} type="range" min={0} max={0.5} step={0.05} />
			</label>
		{/if}
	</div>
	<div class="chart-container" bind:clientWidth={width}>
		<svg {width} {height}>
			<g style:transform="translate({margin.left}px, {margin.top}px)">
				<AxisX {xScale} width={innerChartWidth} height={innerChartHeight} />
				<AxisY {yScale} />
				{#if internalMode === 'summed' || internalMode === 'both'}
					<!-- <path
					d={lineGenerator(summedDistributions)}
					stroke-width="2"
					fill="transparent"
					stroke="blue"
				/> -->
					<Line
						type="area"
						data={plottedExtraCases}
						{xAccessorScaled}
						{yAccessorScaled}
						y0AccessorScaled={yScale(0)}
						style="fill: #7DB2E9; transition: none; filter: brightness({hoveredExtraCasesToCome
							? 1.08
							: 1});"
						on:mouseover={() => (hoveredExtraCasesToCome = true)}
						on:mouseleave={() => (hoveredExtraCasesToCome = false)}
					/>
					{#if !realLifeMode}
						<Line
							type="area"
							data={plottedExtraCasesSoFarArea}
							{xAccessorScaled}
							{yAccessorScaled}
							y0AccessorScaled={yScale(0)}
							style="fill: {hoveredExtraCasesSoFar ? '#ffabab' : '#ff7a7a'}; transition: none;"
							on:mouseover={() => (hoveredExtraCasesSoFar = true)}
							on:mouseleave={() => (hoveredExtraCasesSoFar = false)}
						/>
					{/if}
					<Line
						data={plottedExtraCases}
						{xAccessorScaled}
						{yAccessorScaled}
						style="stroke: #67a4e0; transition: none;"
					/>
				{/if}
				{#if internalMode === 'separate' || internalMode === 'both'}
					{#each distributions as distribution}
						<path
							d={lineGenerator(
								integrateBaselineCases(
									distribution.predictedCases,
									baselineCancerCases,
									baselineCancer,
								).filter(cutoffAtEndOfChart),
							)}
							stroke-width="2"
							fill="transparent"
							stroke="#005CC8"
						/>
						<!-- {#each distribution.predictedCases as predictionPoint}
							<circle
								cx={xScale(xAccessor(predictionPoint))}
								cy={yScale(yAccessor(predictionPoint))}
								r="4"
								fill="blue"
							/>
						{/each} -->
					{/each}
				{/if}
				<Line
					type="area"
					data={baselineCancerCases}
					{xAccessorScaled}
					yAccessorScaled={(d) => yScale(d.cases)}
					y0AccessorScaled={innerChartHeight}
					style="fill: {realLifeMode ? '#7DB2E9' : '#E2DFA5'};"
					on:mouseover={() => (hoveredExtraCasesToCome = true)}
					on:mouseleave={() => (hoveredExtraCasesToCome = false)}
				/>
				{#if !realLifeMode}
					<Line
						data={baselineCancerCases}
						{xAccessorScaled}
						yAccessorScaled={(d) => yScale(d.cases)}
						y0AccessorScaled={innerChartHeight}
						style="stroke: #FF8C00;"
						on:mouseover={() => (hoveredExtraCasesToCome = true)}
						on:mouseleave={() => (hoveredExtraCasesToCome = false)}
					/>
					<text
						x={innerChartWidth - 10}
						y={yScale(baselineCancer) + 20}
						text-anchor="end"
						class="baseline-text yellow"
					>
						Baseline Incidence
					</text>
				{/if}
				{#if preventionDeterminant === 'date'}
					<line
						x1={xScale(dateOfPrevention)}
						y1={15}
						x2={xScale(dateOfPrevention)}
						y2={yScale(0)}
						stroke-width={2}
						stroke="red"
					/>
					<g style:transform="translate({xScale(dateOfPrevention)}px, 25px)">
						<text x={10} y={0} dominant-baseline="middle">
							{numberFormatter(casesThatHaveOccuredSoFar)} extra cases so far
						</text>
						<text x={10} y={25} dominant-baseline="middle">
							{numberFormatter(casesYetToCome)} extra cases to come
						</text>
						<text x={10} y={50} dominant-baseline="middle">
							{numberFormatter(totalExtraCases)} total extra cases
						</text>
					</g>
				{:else}
					<line
						x1={0}
						y1={panicThresholdYPosition}
						x2={innerChartWidth}
						y2={panicThresholdYPosition}
						stroke-width={2}
						stroke="red"
						style="pointer-events: none;"
					/>
					{#if panicPredictionPoint}
						<line
							x1={xScale(panicPredictionPoint.date)}
							y1={Math.min(panicThresholdYPosition, 125)}
							x2={xScale(panicPredictionPoint.date)}
							y2={yScale(0)}
							stroke-width={2}
							stroke="grey"
						/>
						<g
							style:transform="translate({preventionStartInfoBoxXPosition}px, 135px)"
							bind:this={preventionStartInfoBox}
						>
							<text x={10} y={0} dominant-baseline="middle" style="pointer-events: none;"
								>Prevention starts:</text
							>
							<text x={10} y={18} dominant-baseline="middle" style="pointer-events: none;">
								{panicPredictionPoint.date.toLocaleDateString()}
							</text>
						</g>
					{/if}
					<g style:transform="translate(50px, 25px)">
						{#if panicPredictionPoint}
							<text
								x={10}
								y={0}
								dominant-baseline="middle"
								style="text-decoration: {hoveredExtraCasesSoFar ? 'underline' : 'none'};"
								on:mouseover={() => (hoveredExtraCasesSoFar = true)}
								on:mouseleave={() => (hoveredExtraCasesSoFar = false)}
								on:focus={() => (hoveredExtraCasesSoFar = true)}
								on:blur={() => (hoveredExtraCasesSoFar = false)}
								role="figure"
							>
								• {numberFormatter(casesThatHaveOccuredSoFar)} extra cases so far
							</text>
							<text
								x={10}
								y={25}
								dominant-baseline="middle"
								style="text-decoration: {hoveredExtraCasesToCome ? 'underline' : 'none'};"
								on:mouseover={() => (hoveredExtraCasesToCome = true)}
								on:mouseleave={() => (hoveredExtraCasesToCome = false)}
								on:focus={() => (hoveredExtraCasesToCome = true)}
								on:blur={() => (hoveredExtraCasesToCome = false)}
								role="figure"
							>
								• {numberFormatter(casesYetToCome)} extra cases to come
							</text>
							<text x={10} y={50} dominant-baseline="middle">
								• {numberFormatter(totalExtraCases)} total extra cases
							</text>
						{:else}
							<text x={0} y={0} dominant-baseline="middle">
								We will have {numberFormatter(
									Math.floor(renderedSummedCases.reduce((acc, { cases }) => acc + cases, 0)),
								)} extra cases by {renderedSummedCases.at(-1)?.date.toLocaleDateString()}
							</text>
							{#if hazardRatio > 1 && audience === 'general'}
								<text x={0} y={25}>This is the new normal</text>
							{/if}
						{/if}
					</g>
				{/if}
				{#if preventionDeterminant === 'panic'}
					<text
						x={innerChartWidth - 10}
						y={yScale(baselineCancer * (1 + panicThreshold)) - 10}
						text-anchor="end"
						class="baseline-text"
					>
						Panic Threshold
					</text>
				{/if}
			</g>
		</svg>
	</div>
</div>

<style lang="scss">
	@import '/src/styles/mixins.scss';

	:global(.tick text) {
		font-weight: 500;
		font-size: 15px;
		fill: var(--clr-text-on-surface-900);
		user-select: none;
	}

	label {
		cursor: pointer;
		user-select: none;
		input {
			cursor: pointer;
		}
	}
	.widget-container {
		margin-top: var(--spacing-16);
		margin-bottom: var(--spacing-32);

		.distributions-toggle {
			display: flex;
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: var(--spacing-16);
			margin-bottom: var(--spacing-32);

			label {
				display: flex;
				gap: var(--spacing-4);
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

				.determinant-selector {
					display: flex;
					gap: var(--spacing-8);
				}
			}
		}

		.baseline-text {
			font-size: 1.2rem;
			fill: var(--clr-txt-500);

			&.yellow {
				fill: var(--clr-text-on-warning-500);
			}
		}

		text {
			outline: none;
			cursor: default;
			user-select: none;
			fill: var(--clr-txt-500);
		}
	}
</style>
