import { addYearsToDate } from '../common/util/time';
import type {
	Datum,
	DisabledPopulationArgs,
	ForecastDisabledPopulationArgs,
	ForecastPopulationArgs,
	ForecastPopulationWithDisabilityArgs,
	ForecastPopulationWithDisabilityOverTimeArgs,
	PopulationByYear,
	PopulationSizeArgs,
	PopulationStatus,
} from './constants';

export const getPopulationSize = ({
	year,
	initialPopulation,
	birthRate,
	deathRate,
}: PopulationSizeArgs): number =>
	initialPopulation * Math.pow(Math.E, (birthRate - deathRate) * year);

export const forecastPopulation = ({
	years,
	initialPopulation,
	birthRate,
	deathRate,
}: ForecastPopulationArgs): Datum[] => {
	const data: Datum[] = [];
	for (let i = 0; i < years + 1; i++) {
		const population = getPopulationSize({ year: i, initialPopulation, birthRate, deathRate });
		data.push({
			year: i,
			population,
		});
	}
	return data;
};

export const getDisabledPopulation = ({
	year,
	initialPopulation,
	birthRate,
	deathRate,
	infectionRate,
	longCovidRate,
}: DisabledPopulationArgs): number => {
	const growthFactor = Math.exp((birthRate - deathRate) * year);
	return (
		((infectionRate * longCovidRate * initialPopulation) / (birthRate - deathRate)) *
		(growthFactor - 1)
	);
};

export const forecastDisabledPopulation = ({
	years,
	initialPopulation,
	birthRate,
	deathRate,
	infectionRate,
	longCovidRate,
}: ForecastDisabledPopulationArgs): Datum[] => {
	const data: Datum[] = [];
	for (let i = 0; i < years + 1; i++) {
		const population = getDisabledPopulation({
			year: i,
			initialPopulation,
			birthRate,
			deathRate,
			infectionRate,
			longCovidRate,
		});
		data.push({
			year: i,
			population,
		});
	}
	return data;
};

export function forecastPopulationWithDisability({
	birthRate,
	deathRate,
	disabledDeathRate,
	initialPopulation,
	initialDisabledPopulation,
	infectionRate,
	disabilityRate,
	year,
}: ForecastPopulationWithDisabilityArgs): { totalPopulation: number; disabledPopulation: number } {
	let generalPopulation = initialPopulation;
	let disabledPopulation = initialDisabledPopulation;

	const annualBirthRate = birthRate / 100;
	const annualDeathRate = deathRate / 100;
	const annualDisabledDeathRate = disabledDeathRate / 100;
	const annualInfectionRate = infectionRate / 100;
	const annualDisabilityRate = disabilityRate / 100;

	for (let i = 0; i < year; i++) {
		// Births and deaths in general population
		const births = generalPopulation * annualBirthRate;
		const generalDeaths = generalPopulation * annualDeathRate;

		// New infections and resulting disabilities
		const newInfections = generalPopulation * annualInfectionRate;
		const newDisabilities = newInfections * annualDisabilityRate;

		// Deaths in disabled population
		const disabledDeaths = disabledPopulation * annualDisabledDeathRate;

		// Update populations
		generalPopulation += births - generalDeaths - newDisabilities;
		disabledPopulation += newDisabilities - disabledDeaths;
	}

	const totalPopulation = generalPopulation + disabledPopulation;
	return { totalPopulation, disabledPopulation };
}

export function forecastPopulationWithDisabilityV2({
	birthRate,
	deathRate,
	disabledDeathRate,
	initialPopulation,
	initialDisabledPopulation,
	infectionRate,
	disabilityRate,
	year,
}: ForecastPopulationWithDisabilityArgs): PopulationStatus {
	let nonDisabledPopulation = initialPopulation - initialDisabledPopulation;
	let disabledPopulation = initialDisabledPopulation;

	const annualBirthRate = birthRate / 100;
	const annualDeathRate = deathRate / 100;
	const annualDisabledDeathRate = disabledDeathRate / 100;
	const annualInfectionRate = infectionRate / 100;
	const annualDisabilityRate = disabilityRate / 100;

	for (let i = 0; i < year; i++) {
		// Births and deaths in non-disabled population
		const births = nonDisabledPopulation * annualBirthRate + disabledPopulation * annualBirthRate;
		const nonDisabledDeaths = nonDisabledPopulation * annualDeathRate;

		// New infections and resulting disabilities
		const newInfections = nonDisabledPopulation * annualInfectionRate;
		const newDisabilities = Math.min(newInfections * annualDisabilityRate, nonDisabledPopulation);

		// Deaths in disabled population
		const disabledDeaths = disabledPopulation * annualDisabledDeathRate;

		// Update populations
		nonDisabledPopulation += births - nonDisabledDeaths - newDisabilities;
		disabledPopulation += newDisabilities - disabledDeaths;
	}

	const totalPopulation = nonDisabledPopulation + disabledPopulation;
	return { totalPopulation, disabledPopulation };
}

export const forecastPopulationWithDisabilityOverTime = ({
	birthRate,
	deathRate,
	disabledDeathRate,
	initialPopulation,
	initialDisabledPopulation,
	infectionRate,
	disabilityRate,
	years,
}: ForecastPopulationWithDisabilityOverTimeArgs): PopulationByYear[] => {
	const data: PopulationByYear[] = [];
	for (let i = 0; i < years + 1; i++) {
		const populationStatus = forecastPopulationWithDisabilityV2({
			birthRate,
			deathRate,
			disabledDeathRate,
			initialPopulation,
			initialDisabledPopulation,
			infectionRate,
			disabilityRate,
			year: i,
		});
		data.push({
			year: i,
			populationStatus,
		});
	}
	return data;
};
