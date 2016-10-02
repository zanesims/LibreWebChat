// Part of LibreWebChat
// Copyright (c) 2015, Zane Sims
// License details in 'license.txt'

function HashTable() {
	this.items = {};
	this.length = 0;

	this.set = function(key, value) {
		var previous = undefined;
		if(this.has(key))
			previous = this.items[key];
		else
			this.length++;
		this.items[key] = value;
		return previous;
	}

	this.get = function(key) {
		return this.has(key) ? this.items[key] : undefined;
	}

	this.has = function(key) {
		//return this.items.hasOwnProperty(key);
		return Object.prototype.hasOwnProperty.call(this.items, key);
	}

	this.remove = function(key) {
		if(this.has(key)) {
			previous = this.items[key];
			this.length--;
			delete this.items[key];
			return previous;
		}
		else
			return undefined;
	}

	this.keys = function() {
		var keys = [];
		for(var k in this.items) {
			if(this.has(k))
				keys.push(k);
		}
		return keys;
	}

	this.sorted_keys = function() {
		return this.sorted_keys_custom(function(a, b) {
			var a = a.toLowerCase();
			var b = b.toLowerCase();
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		});
	}

	this.sorted_keys_custom = function(func) {
		return this.keys().sort(func);
	}

	this.values = function() {
		var values = [];
		for(var k in this.items) {
			if(this.has(k))
				values.push(this.items[k]);
		}
		return values;
	}

	this.each = function(fn) {
		for(var k in this.items) {
			if(this.has(k))
				fn(k, this.items[k]);
		}
	}

	this.clear = function() {
		this.items = {}
		this.length = 0;
	}
}
