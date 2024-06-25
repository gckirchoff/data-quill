import { dev } from '$app/environment';

import type { SiteConfig } from './types/config';

// Main config for entire website
export const siteConfig: SiteConfig = {
	title: 'Peer to Public Sandbox',
	description: 'Simple, visual explanations about SARS-CoV-2',
	url: 'https://www.peertopublic.com/',
	link: 'https://github.com/gckirchoff/peer-to-public',
	author: 'Peer to Public',
	pages: {
		landing: {
			miniAboutMe: {
				img: 'me.svg',
				quickDescription:
					'Explore key insights into the ongoing SARS-CoV-2 pandemic through interactive, visual articles. We are scientists and data visualization experts with an aim to inform both the public and government officials by contributing to a deeper understanding of the current health landscape.',
			},
			welcome: {
				header: 'Peer to Public',
				description: 'Simple, visual explanations',
			},
		},
		about: {
			img: 'me.svg',
			content: [
				`Peer to Public is the result of the collaborative efforts of scientists and data visualization developers.`,
				`The purpose of this site is to make difficult-to-understand yet important issues feel intuitive
				through the use of engaging, interactive articles.`,
				`Our primary goal is to educate the public and government about the importance of stopping SARS-CoV-2 infections.`,
				`SARS-CoV-2 is not the common cold and never will be. It is a SARS coronavirus. The implications of this
				are major and require prevention measures to be taken.`,
				`To reach out for further information or collaboration, please use the contact form to get in touch.`,
			],
		},
		contact: {
			formAccessKey: 'df313bb6-814b-48fc-a917-a40b8f839417', // go to https://www.staticforms.xyz/ to get this. It's free!
			links: [
				{
					type: 'Twitter',
					href: 'https://twitter.com/gckirchoff',
				},
				{
					type: 'Github',
					href: 'https://github.com/gckirchoff/peer-to-public',
				},
			],
		},
	},
};

// Controls how many posts are shown per page on the main blog index pages
export const postsPerPage = 10;

// Edit this to alter the main nav menu. (Also used by the footer).
export const navItems = [
	{
		title: 'Articles',
		route: '/posts',
	},
	// {
	// 	title: 'Gallery',
	// 	route: '/gallery',
	// },
	{
		title: 'About',
		route: '/about',
	},
	{
		title: 'Contact',
		route: '/contact',
	},
];

if (dev) {
	navItems.push({
		title: 'Dev',
		route: '/dev',
	});
}
