#!/usr/bin/env node

// used documentation and initial example code from
// https://github.com/GoogleChrome/puppeteer
// and
// https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md

const puppeteer = require('puppeteer');
const logId = 'start_robot_browser.js';
const calibrateRobot = true;
const startServers = true;
const fastBoot = true;

(async () => {
    try {
	const type_delay = 1;

	const navigation_timeout_ms = 30000; //30 seconds (default is 30 seconds)
	const min_idle_time = 1000;
	var try_again = false;
	var num_tries = 0;
	var max_tries = -1; // -1 means try forever

	///////////////////////////////////////////////
	// sleep code from
	// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
	function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
	}
	///////////////////////////////////////////////

	const browser = await puppeteer.launch({
            headless: false, // default is true
	    ignoreHTTPSErrors: true, // avoid ERR_CERT_COMMON_NAME_INVALID
		defaultViewport: null,
            args: ['--use-fake-ui-for-media-stream'] //gives permission to access the robot's cameras and microphones (cleaner and simpler than changing the user directory)
	});
	const page = await browser.newPage();
	const mouse = page.mouse;
	
	// The following loop makes this script more robust, such as being
	// able to keep trying until the server comes up. It might also be
	// able to handle the WiFi network not coming up prior to this
	// script running, but I haven't tested it.    
	do {
            console.log(logId + ': trying to reach login page...');
            num_tries++; 
            await page.goto('https://localhost/login',
                            {timeout:navigation_timeout_ms
                            }
			   ).then(
                               function(response){
				   console.log(logId + ': ===================');
				   console.log(logId + ': no error caught! page reached?');
				   console.log(response);
				   if(response === null) {
                                       console.log(logId + ': page.goto returned null, so try again');
                                       try_again = true;
				   } else {
                                       console.log(logId + ': page.goto returned something other than null, so proceed with fingers crossed...');
                                       try_again = false;
				   }
				   console.log(logId + ': ===================');

                               }).catch(
				   function(error) {
                                       console.log(logId + ': ===================');
                                       console.log(logId + ': promise problem with login page goto attempt');
                                       console.log(error);
                                       try_again = true;
                                       console.log(logId + ': so going to try again...');
                                       console.log(logId + ': ===================');
				   });
            if ((max_tries != -1) && (num_tries >= max_tries)) {
		try_again = false;
            }
	} while (try_again);

	console.log(logId + ': page =');
	console.log(page);

	console.log(logId + ': type username');
	await page.type('#inputUsername', 'r1');

	console.log(logId + ': type password');
	await page.type('#inputPassword', 'NQUeUb98');

	console.log(logId + ': click submit');
	await page.click('#submitButton');
	
	console.log(logId + ': start script complete');

    } catch ( e ) {
	console.log(logId + ': *********************************************');
	console.log(logId + ': *** SCRIPT STEPS SKIPPED DUE TO AN ERROR! ***');
	console.log(logId + ': *** error =                               ***');
	console.log(logId + ': ' + e );
	console.log(logId + ': *********************************************');
    }
})();
