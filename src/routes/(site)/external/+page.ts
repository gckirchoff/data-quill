import { redirect } from '@sveltejs/kit';

export const prerender = true;

export const load = async (req) => {
	redirect(301, `/tools`);
};
