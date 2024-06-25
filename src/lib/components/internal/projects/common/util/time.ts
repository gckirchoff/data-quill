export const addYearsToDate = (date: Date, years: number): Date => {
	const futureDate = new Date(date.getTime());
	futureDate.setFullYear(futureDate.getFullYear() + years);
	return futureDate;
};
