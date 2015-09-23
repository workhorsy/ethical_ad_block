// Copyright (c) 2015 Matthew Brennan Jones <matthew.brennan.jones@gmail.com>
// This software is licensed under GPL v3 or later


var BLACKLIST = [
	'connect.facebook.net',
	'platform.twitter.com',
	'apis.google.com',
	'plus.google.com',
	'google-analytics.com',

	'tribalfusion.com',
	'kontera.com',
	'admarketplace.net',
	'exponential.com',
	'cpmstar.com'
];
// NOTE: Ignore the black list for now
BLACKLIST = [];


var active_url = null;
var g_user_id = generateRandomId();


// Watch each request and block the ones that are in the black list
chrome.webRequest.onBeforeRequest.addListener(function(info) {
	if (active_url !== null) {
		for (var i=0; i<BLACKLIST.length; ++i) {
			var entry = BLACKLIST[i];
			// Block the request if it is to a black listed site,
			// But not if the current page is the black listed site
			if (info.url.indexOf(entry) !== -1 && active_url.indexOf(entry) === -1) {
				var message = 'Blocked: ' + info.url + ', ' + active_url;
				console.log(message);

				return {cancel: true};
			}
		}
	}

	return {cancel: false};
}, { urls: ['<all_urls>'] }, ['blocking']);


chrome.runtime.onMessage.addListener(function(msg, sender, send_response) {
	if (msg.action === 'screen_shot') {
		var rect = msg.rect;

		// Screen capture the tab and send it to the tab's console
		chrome.tabs.captureVisibleTab(
			null,
			{'format': 'png'},
			function(data_url) {
				var message = {
					action: 'screen_shot',
					data: data_url
				};
				chrome.tabs.sendMessage(sender.tab.id, message, function(response) {});
			}
		);
	} else if (msg.action === 'get_g_user_id') {
		var message = {
			action: 'get_g_user_id',
			data: g_user_id
		};
		chrome.tabs.sendMessage(sender.tab.id, message, function(response) {});
	}

	return false; // FIXME: Update this to use send_response instead of sending another message
});




