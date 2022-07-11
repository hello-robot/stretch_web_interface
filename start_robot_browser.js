#!/usr/bin/env node

const { chromium } = require('playwright');
const logId = 'start_robot_browser.js';

// You may want to change this to test that the
// robot is using certificates that are valid for its real hostname
let robotHostname = "localhost";
if (process.argv.length > 2) {
	robotHostname = process.argv[2]
}

(async () => {
	const navigation_timeout_ms = 30000; //30 seconds (default is 30 seconds)
	const min_idle_time = 1000;
	var try_again = true;
	var num_tries = 0;
	var max_tries = 50; // -1 means try forever

	///////////////////////////////////////////////
	// sleep code from
	// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	///////////////////////////////////////////////

	const browser = await chromium.launch({
		headless: true, // default is true
		ignoreHTTPSErrors: true, // avoid ERR_CERT_COMMON_NAME_INVALID
		defaultViewport: null,
		args: ['--use-fake-ui-for-media-stream', //gives permission to access the robot's cameras and microphones (cleaner and simpler than changing the user directory)
			'--disable-features=WebRtcHideLocalIpsWithMdns'] // Disables mDNS hostname use in local network P2P discovery. Necessary for enterprise networks that don't forward mDNS traffic
	});
	const page = await browser.newPage();

	while (try_again) {
		try {
			await page.goto(`https://${robotHostname}/login`);
			console.log(logId + ': finished loading');
			try_again = false;
		} catch (e) {
			console.log(logId + ': trying again');
			console.log(e);
			await sleep(200);
			try_again = true;
		}
	}


	console.log(logId + ': type username');
	await page.$eval('#inputUsername', el => el.value = 'r1');

	console.log(logId + ': type password');
	await page.$eval('#inputPassword', el => el.value = 'NQUeUb98');

	console.log(logId + ': click submit');

	let robotPage = await Promise.all([
		page.click('#submitButton'),
		page.waitForNavigation({ waitUntil: 'networkidle' })
	]);

	let is404 = robotPage[1]._status == 404;

	while (is404) {
		is404 = (await page.goto(`https://${robotHostname}/robot`, { timeout: navigation_timeout_ms }))._status == 404;
	}

	console.log(logId + ': start script complete');
})();
