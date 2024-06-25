import { randomInt } from 'd3';

import type { Distribution, PredictedCases } from './constants';

export const getExtraCases = (hazardRatio: number, baseline: number): number =>
	baseline * (hazardRatio - 1);

export const timeBetween = (earlier: Date, later: Date): number =>
	later.getTime() - earlier.getTime();

const daysBetween = (earlier: Date, later: Date): number =>
	timeBetween(earlier, later) / (1000 * 60 * 60 * 24);

const yearsBetween = (earlier: Date, later: Date): number =>
	timeBetween(earlier, later) / (1000 * 60 * 60 * 24 * 365.25);

/**
 * Probability Density Function
 */
const pdf = (differenceFromMean: number, stdDeviation: number): number => {
	return (
		(1 / (stdDeviation * Math.sqrt(2 * Math.PI))) *
		Math.exp(-0.5 * Math.pow(differenceFromMean / stdDeviation, 2))
	);
};

/**
 * error function approximation
 */
const erf = (z: number): number => {
	// constants
	const a1 = 0.254829592;
	const a2 = -0.284496736;
	const a3 = 1.421413741;
	const a4 = -1.453152027;
	const a5 = 1.061405429;
	const p = 0.3275911;

	// Save the sign of z
	const sign = z < 0 ? -1 : 1;
	const absX = Math.abs(z);

	// A&S formula 7.1.26
	const t = 1.0 / (1.0 + p * absX);
	const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

	return sign * y;
};

/** Cumulative Density Function (CDF) for standard normal distribution */
const standardNormalCDF = (z: number): number => {
	return 0.5 * (1 + erf(z / Math.sqrt(2)));
};

export const getCasesOnDate = (
	date: Date,
	mean: Date,
	stdDeviation: number,
	totalCases: number,
): number => {
	const daysDifference = yearsBetween(date, mean);
	const probabilityDensity = pdf(daysDifference, stdDeviation);
	const estimatedCases = probabilityDensity * totalCases;
	return estimatedCases;
};

export const getCasesUpToDate = (
	date: Date,
	mean: Date,
	stdDeviation: number,
	totalCases: number,
): number => {
	const daysDifference = yearsBetween(date, mean);
	const zScore = daysDifference / stdDeviation;
	const proportionOfCasesUntilDate = standardNormalCDF(zScore);
	const estimatedCases = proportionOfCasesUntilDate * totalCases;
	return estimatedCases;
};

export const getCumulativeCasesUpToDate = (
	targetDate: Date,
	dateEstimates: PredictedCases[],
): number => {
	const index = dateEstimates.findIndex(({ date }) => date.getTime() === targetDate.getTime());
	if (!index) {
		return 0;
	}

	let total = 0;
	for (let i = 0; i < index; i++) {
		total += dateEstimates[i].cases;
	}
	return total;
};

export const addYearsToDate = (date: Date, years: number): Date => {
	const futureDate = new Date(date.getTime());
	futureDate.setFullYear(futureDate.getFullYear() + years);
	return futureDate;
};

interface CreatePredictedCasesArgs {
	infectionsBinDate: Date;
	futureMeanIncidenceDate: Date;
	finalDateToMeasureTo: Date;
	extraCases: number;
	stdDeviation: number;
}

export const createPredictedCases = ({
	infectionsBinDate,
	futureMeanIncidenceDate,
	finalDateToMeasureTo,
	extraCases,
	stdDeviation,
}: CreatePredictedCasesArgs): PredictedCases[] => {
	const casesOnDates: PredictedCases[] = [];
	const yearsUntilEndOfMeasuring =
		finalDateToMeasureTo.getFullYear() - infectionsBinDate.getFullYear();
	for (let i = 0; i <= yearsUntilEndOfMeasuring; i++) {
		const yearOfCaseOnset = infectionsBinDate.getFullYear() + i;
		const delayedOnsetBin =
			i === yearsUntilEndOfMeasuring ? finalDateToMeasureTo : new Date(yearOfCaseOnset, 11, 31);
		const cancerCasesOnDate = getCasesOnDate(
			delayedOnsetBin,
			futureMeanIncidenceDate,
			stdDeviation,
			extraCases,
		);
		casesOnDates.push({ date: delayedOnsetBin, cases: cancerCasesOnDate });
	}
	return casesOnDates;
};

interface GetDistributionsArgs {
	beginningOfPandemic: Date;
	dateOfPrevention: Date;
	finalDateToMeasureTo: Date;
	baselineCancer: number;
	hazardRatio: number;
	delay: number;
	stdDeviation: number;
}

export const getDistributions = ({
	beginningOfPandemic,
	dateOfPrevention,
	finalDateToMeasureTo,
	baselineCancer,
	hazardRatio,
	delay,
	stdDeviation,
}: GetDistributionsArgs): Distribution[] => {
	const extraCases = getExtraCases(hazardRatio, baselineCancer);
	const yearsDifference = dateOfPrevention.getFullYear() - beginningOfPandemic.getFullYear();
	const newDistributions: Distribution[] = [];
	for (let i = 0; i <= yearsDifference; i++) {
		const yearOfInfections = beginningOfPandemic.getFullYear() + i;
		const infectionsBinDate =
			i === yearsDifference ? dateOfPrevention : new Date(yearOfInfections, 11, 31);
		const futureMeanIncidenceDate = addYearsToDate(infectionsBinDate, delay);

		const casesOnDates = createPredictedCases({
			infectionsBinDate,
			futureMeanIncidenceDate,
			finalDateToMeasureTo,
			extraCases,
			stdDeviation,
		});

		const distribution: Distribution = {
			start: infectionsBinDate,
			mean: futureMeanIncidenceDate,
			predictedCases: casesOnDates,
			standardDeviation: stdDeviation,
		};

		newDistributions.push(distribution);
	}
	return newDistributions;
};

interface CreateSummedDistributionArgs {
	beginningOfPandemic: Date;
	finalDateToMeasureTo: Date;
	distributions: Distribution[];
}

export const createSummedDistribution = ({
	beginningOfPandemic,
	finalDateToMeasureTo,
	distributions,
}: CreateSummedDistributionArgs): PredictedCases[] => {
	const newSummedDistributions: PredictedCases[] = [];
	const yearsOfEntireChart = finalDateToMeasureTo.getFullYear() - beginningOfPandemic.getFullYear();
	for (let i = 0; i <= yearsOfEntireChart; i++) {
		const yearOfCurrentDate = beginningOfPandemic.getFullYear() + i;
		const currentDate =
			i === yearsOfEntireChart ? finalDateToMeasureTo : new Date(yearOfCurrentDate, 11, 31);

		const totalCases = distributions.reduce((acc: number, distribution) => {
			const predictedCases = distribution.predictedCases.find(
				({ date }) => date.getTime() === currentDate.getTime(),
			);
			acc += predictedCases?.cases ?? 0;
			return acc;
		}, 0);
		newSummedDistributions.push({ date: currentDate, cases: totalCases });
	}
	return newSummedDistributions;
};

interface CreateBaselineCasesArgs {
	start: Date;
	end: Date;
	baselineCancerSlope: number;
	baselineCancer: number;
}

export const createBaselineCases = ({
	start,
	end,
	baselineCancerSlope,
	baselineCancer,
}: CreateBaselineCasesArgs) => {
	const years = end.getFullYear() - start.getFullYear();
	const percentModifier = 1 + baselineCancerSlope;

	const baselineCancerCases: PredictedCases[] = [];
	for (let i = 0; i < years; i++) {
		const date = new Date(start.getFullYear() + i, 11, 31);
		const prevLevel = baselineCancerCases[i - 1]?.cases ?? baselineCancer;
		const nextLevel = prevLevel * percentModifier;

		baselineCancerCases.push({
			date,
			cases: nextLevel,
		});
	}
	return baselineCancerCases;
};

export const createNoiseValues = (
	baselineCancerCases: PredictedCases[],
	baselineNoise: number,
): number[] => {
	return baselineCancerCases.map((baselinePoint) => {
		const randNoiseNum = randomInt(baselinePoint.cases * baselineNoise);
		const sign = Math.random() > 0.5 ? 1 : -1;
		return randNoiseNum() * sign;
	});
};

export const noisifyBaseline = (
	baselineCancerCases: PredictedCases[],
	noiseValues: number[],
): PredictedCases[] => {
	return baselineCancerCases.map((baselinePoint, i) => {
		const noiseValue = noiseValues[i] ?? 0;
		return {
			...baselinePoint,
			cases: baselinePoint.cases + noiseValue,
		};
	});
};

export const integrateBaselineCases = (
	casesToRender: PredictedCases[],
	baselineCancerCases: PredictedCases[],
	baselineCancer: number,
) => {
	return casesToRender.map((point, i) => {
		const overallCancerLevel = baselineCancerCases[i]?.cases ?? baselineCancer;
		return {
			...point,
			cases: point.cases + overallCancerLevel - baselineCancer,
		};
	});
};
