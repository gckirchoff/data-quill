export const ensureTargetIsArray = <T>(target: T | T[]): T[] => {
	if (!target) return [];

	return Array.isArray(target) ? target : [target];
};

export const slugify = (str: string): string =>
	str
		.normalize('NFKD') // split accented characters into their base characters and diacritical marks
		.replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
		.trim() // trim leading or trailing whitespace
		.toLowerCase() // convert to lowercase
		.replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
		.replace(/\s+/g, '-') // replace spaces with hyphens
		.replace(/-+/g, '-'); // remove consecutive hyphens

export const escapeRegExp = (text: string): string =>
	text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export const escapeComponents = (str: string): string =>
	str.replace(/<[^>]+\/>/gm, (match) => match.replace(/^</, '$-'));

export const unescapeComponents = (str: string): string =>
	str.replace(/\$-[^>]+\/>/gm, (match) => match.replace(/^\$-/, '<'));

export const prettyDate = (date?: Date) => {
	const myDate = date ?? new Date();
	const offset = myDate.getTimezoneOffset();
	const adjustedDate = new Date(myDate.getTime() - offset * 60 * 1000);
	const finalDate = adjustedDate.toISOString().split('T')[0];
	return finalDate;
};

export const getRandomInt = (min: number, max: number): number => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const capitalize = (text: string): string => text[0].toUpperCase() + text.slice(1);

export const randomDefaultPhoto = (): string => `default-background-${getRandomInt(1, 7)}.jpg`;

export const escapeString = (str: string): string => str.replaceAll('"', '\\"');
