// Copyright (c) 2015 Matthew Brennan Jones <matthew.brennan.jones@gmail.com>
// This software is licensed under GPL v3 or later


var BUTTON_SIZE = 15;
var g_next_id = 0;
var g_cb_table = {};
var g_element_table = {};
var g_known_elements = {};
var g_cursor_x = 0;
var g_cursor_y = 0;

var TAGS1 = {
	'a' : 'purple',
	'img' : 'blue',
	'video' : 'blue',
	'object' : 'yellow',
	'embed' : 'yellow',
	'iframe' : 'red'
};

var TAGS2 = {
	'a' : 'purple',
	'img' : 'blue',
	'video' : 'blue',
	'object' : 'yellow',
	'embed' : 'yellow'
};

var TAGS3 = {
	'img' : 'blue',
	'video' : 'blue'
};

function get_element_rect(element) {
	var rect = element.getBoundingClientRect();
	rect = {
		bottom: rect.bottom,
		height: rect.height,
		left: rect.left,
		right: rect.right,
		top: rect.top,
		width: rect.width
	};
	return rect;
}

function get_screen_shot(rect, cb) {
	var message = {
		action: 'screen_shot',
		rect: rect
	};

	// Get a screen shot from the background script
	var screen_shot = function(msg, sender, sendResponse) {
		if (msg.action === 'screen_shot') {
			// Remove the handler for this callback
			chrome.runtime.onMessage.removeListener(screen_shot);

			var dataURI = msg.data;
			var canvas = document.createElement('canvas');
			canvas.width = rect.width;
			canvas.height = rect.height;
			var ctx = canvas.getContext('2d');

			var image = new Image();
			image.width = rect.width;
			image.height = rect.height;
			image.onload = function() {
				ctx.drawImage(
					image,
                    rect.left, rect.top,
                    rect.width, rect.height,
                    0, 0,
                    rect.width, rect.height
				);
				image.onload = null;
				image.src = canvas.toDataURL();
				cb(image, dataURI);
			};
			image.src = dataURI;
		}
	};
	chrome.runtime.onMessage.addListener(screen_shot);
	chrome.runtime.sendMessage(message, function(response) {});
}

function get_element_hash(element, cb) {
	// Create a hash of the image and its src
	var hash = null;
	switch (element.tagName.toLowerCase()) {
		case 'img':
			// Copy the image to a cross origin safe one
			// then hash it
			var img = new Image;
			img.crossOrigin = 'Anonymous';
			img.onload = function() {
				// Create a hash of the image
				var temp_canvas = document.createElement('canvas');
				temp_canvas.width = img.width;
				temp_canvas.height = img.height;
				var ctx = temp_canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				var data_url = temp_canvas.toDataURL();
				hash = hex_md5(element.outerHTML + data_url);
				cb(hash, element);
			};
			img.onerror = function() {
				// Create a hash of the image
				hash = hex_md5(element.outerHTML);
				cb(hash, element);
			};
			img.src = element.src;
			break;
		case 'iframe':
			throw "Can't hash iframe";
			break;
		case 'embed':
		case 'object':
		case 'video':
		case 'a':
			hash = hex_md5(element.outerHTML);
			cb(hash, element);
			break;
		default:
			throw "Unexpected element '" + element.tagName.toLowerCase() + "' to hash.";
	}
}


window.addEventListener('message', function(event) {
	// Wait for the iframe to tell us that it has loaded
	if (event.data && event.data.message === 'iframe_loaded') {
		// FIXME: Remove the iframe if the hash is in the black list
		if (event.data.hash) {
			try {
				var element = event.source.frameElement;
				create_button(element, null);
			} catch (SecurityError) {
				// pass
			}
		}

		// Send the iframe window back the show iframe message
		var request = {
			message: 'show_iframe_body'
		};
		event.source.postMessage(request, '*');
	}
}, false);


chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	if (msg.action === 'log') {
		console.log(msg.data);
	}
});

function generate_random_id() {
	// Get a 20 character id
	var code_table = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var id = [];
	for (var i = 0; i < 20; ++i) {
		// Get a random number between 0 and 35
		var num = Math.floor((Math.random() * 36));

		// Get the character that corresponds to the number
		id.push(code_table[num]);
	}

	return id.join('');
}


document.addEventListener('mousemove', function(e) {
	g_cursor_x = e.pageX;
	g_cursor_y = e.pageY;
}, false);

function create_button(element, container_element) {
	// Add a button when the mouse is over the element
	var mouse_enter = function(e) {
		var node = e.path[0];

		// Just return if there is already a canvas
		if (node.canvas !== null && node.canvas !== undefined) {
			return;
		}

		var tag = node.tagName.toLowerCase();
		var color = TAGS1[(container_element ? container_element.tagName : node.tagName).toLowerCase()];
		var rect = get_element_rect(node);

		// Create a button over the bottom right of the element
		var canvas = document.createElement('canvas');
		canvas.width = BUTTON_SIZE;
		canvas.height = BUTTON_SIZE;
		canvas.style.width = BUTTON_SIZE + 'px';
		canvas.style.height = BUTTON_SIZE + 'px';
		canvas.style.position = 'absolute';
		canvas.style.left = rect.left + window.pageXOffset + (rect.width - BUTTON_SIZE) + 'px';
		canvas.style.top = rect.top + window.pageYOffset + (rect.height - BUTTON_SIZE) + 'px';
		canvas.style.zIndex = 100000;
		document.body.appendChild(canvas);

		// Make the button a color
		var context = canvas.getContext('2d');
		context.rect(0, 0, BUTTON_SIZE, BUTTON_SIZE);
		context.fillStyle = color;
		context.fill();

		// Connect the canvas to the element
		node.canvas = canvas;
		canvas.node = node;
		canvas.container_element = container_element;

		// Keep checking the mouse position. If it moves out of the element, remove the button
		var rect_interval = setInterval(function() {
			if (g_cursor_x < rect.left + window.pageXOffset || g_cursor_x > rect.left + window.pageXOffset + rect.width ||
				g_cursor_y < rect.top + window.pageYOffset || g_cursor_y > rect.top + window.pageYOffset + rect.height) {
				node.canvas = null;
				document.body.removeChild(canvas);
				clearInterval(rect_interval);
				rect_interval = null;
			}
		}, 100);

		// Remove the element when the button is clicked
		canvas.addEventListener('click', function(e) {
			var canvas = e.path[0];
			var node = canvas.node;
			var container_element = canvas.container_element;

			// Remove the button
			element.removeEventListener('mouseenter', mouse_enter);
			node.canvas = null;
			document.body.removeChild(canvas);
			if (rect_interval) {
				clearInterval(rect_interval);
				rect_interval = null;
			}

			// Remove the border around the element
			node.style['border'] = '';

			// Wait for the next set of DOM events, so the element's border will be removed
			setTimeout(function() {
				// Get a screen shot from the background script
				rect = get_element_rect(node);
				get_screen_shot(rect, function(image, dataURI) {
					document.body.appendChild(image);

					// If there is a container element, remove that instead
					if (container_element) {
						node = container_element;
					}

					// Hide the element
					node.style.display = 'none';

					// Get a hash of the element
					get_element_hash(node, function(hash, node) {
						console.log(hash);

						// Remove the element
						node.parentElement.removeChild(node);
					});
				});
			}, 100);

		}, false);
	};

	element.addEventListener('mouseenter', mouse_enter, false);
}

function is_inside_link_element(element) {
	var parent = element.parentElement;
	while (parent) {
		if (parent.tagName.toLowerCase() === 'a') {
			return true;
		}
		parent = parent.parentElement;
	}
	return false;
}

function is_too_small(element) {
	var rect = get_element_rect(element);
	return (rect.width < 20 || rect.height < 20);
}

function to_array(obj) {
	var retval = [];
	for (var i=0; i<obj.length; ++i) {
		retval.push(obj[0]);
	}
	return retval;
}

function check_elements_that_may_be_ads() {
	for (var tag in TAGS2) {
		var elements = document.getElementsByTagName(tag);
		for (var i=0; i<elements.length; ++i) {
			var element = elements[i];

			// If the element does not have an id, generate a random one
			if (element.id === '' || element.id === undefined) {
				element.id = generate_random_id();
			}

			// Only look at elements that have not already been examined
			if (! g_known_elements.hasOwnProperty(element.id)) {
				var name = element.tagName.toLowerCase();

				// Skip the element if it is inside a link
				if (TAGS3.hasOwnProperty(name)) {
					if (is_inside_link_element(element)) {
						g_known_elements[element.id] = 1;
						element.style.opacity = 1.0;
						continue;
					}
				}

				// Element image has a source
				switch (name) {
					case 'img':
						if (element.src && element.src.length > 0) {
							g_known_elements[element.id] = 1;
							console.log(element);

							// Element's image has not loaded yet
							if (element.clientWidth === 0) {
								var load_cb = function(evt) {
									var node = evt.path[0];
									node.removeEventListener('load', load_cb);

									get_element_hash(node, function(hash, n) {
										// Set the opacity to 1.0
										n.style.opacity = 1.0;
										if (! is_too_small(n)) {
											n.style.border = '5px solid blue';
											create_button(n, null);
										} else {
//											n.style.border = '5px solid green';
										}
									});
								};

								element.addEventListener('load', load_cb, false);
							// Element's image has already loaded
							} else {
								var node = element;

								get_element_hash(node, function(hash, n) {
									// Set the opacity to 1.0
									n.style.opacity = 1.0;
									if (! is_too_small(n)) {
										n.style.border = '5px solid blue';
										create_button(n, null);
									} else {
//										n.style.border = '5px solid green';
									}
								});
							}
						}
						break;
					case 'a':
						g_known_elements[element.id] = 1;

						// Anchor has a background image
						var bg = window.getComputedStyle(element)['background-image'];
						if (bg && bg !== 'none' && bg.length > 0) {
							console.log(element);

							// FIXME: This does not hash the image
							get_element_hash(element, function(hash, n) {
								// Set the opacity to 1.0
								n.style.opacity = 1.0;
								if (! is_too_small(n)) {
									n.style.border = '5px solid purple';
									create_button(n, null);
								} else {
//									n.style.border = '5px solid green';
								}
							});
						// Anchor has children
						} else if (element.children.length > 0) {
							console.log(element);

							get_element_hash(element, function(hash, n) {
								// Add a button to the link
								n.style.opacity = 1.0;
								if (! is_too_small(n)) {
									n.style.border = '5px solid purple';
									create_button(n, null);
								}

								// Add buttons to any children that are big enough
								var cs = to_array(n.children);
								while (cs.length > 0) {
									var c = cs.pop();
									cs = cs.concat(to_array(c.children));
									if (c.tagName.toLowerCase() in TAGS2) {
										c.style.opacity = 1.0;
										if (! is_too_small(c)) {
											c.style.border = '5px solid purple';
											create_button(c, n);
										}
									}
								}
							});
						// Anchor is just text
						} else {
							// Set the opacity to 1.0
							element.style.opacity = 1.0;
						}
						break;
					// FIXME: None of these elements can be properly hashed yet
					case 'object':
					case 'embed':
						g_known_elements[element.id] = 1;
						console.log(element);

						// Set the opacity to 1.0
						element.style.opacity = 1.0;
						element.style.border = '5px solid yellow';
						create_button(element, null);
						break;
					case 'video':
						g_known_elements[element.id] = 1;
						console.log(element);

						// Set the opacity to 1.0
						element.style.opacity = 1.0;
						if (! is_too_small(element)) {
							element.style.border = '5px solid blue';
							create_button(element, null);
						} else {
//							element.style.border = '5px solid green';
						}
						break;
					default:
						throw "Unexpected element '" + element.tagName.toLowerCase() + "' to check for ads.";
				}
			}
		}
	}
}


// Keep looking at page elements, and add buttons to ones that loaded
var check_elements_loop = function() {
//	console.log('called check_elements_loop ...');

	check_elements_that_may_be_ads();

	setTimeout(check_elements_loop, 500);
};
check_elements_loop();

