// Copyright (c) 2015 Matthew Brennan Jones <matthew.brennan.jones@gmail.com>
// This software is licensed under GPL v3 or later

var DEBUG = true;

function show_element(element) {
	element.style.position = 'static';
	element.style.top = '';
	element.style.left = '';
	element.style.opacity = 1.0;
	element.style.pointerEvents = 'all';
}

function set_border(element, color) {
	if (DEBUG) {
		element.style.border = '5px solid ' + color;
	}
}