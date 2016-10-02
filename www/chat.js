// Part of LibreWebChat
// Copyright (c) 2015, Zane Sims
// License details in 'license.txt'

var ws = null; //The webSocket
var MOD = false;
var FREEZE_SCROLLING = false;
var SYSTEM_SCROLL = false;
var SHOW_EMOTICONS = true;
var FONT_B = false;
var FONT_I = false;
var FONT_U = false;
var FONT_COLOR = "black";
var CONV_MAX_MSGS = 200;
var ROOM_CONV = '';//empty string means current room
var EMOTICONS = new Array();
var NEW_MSG_IMG = '';
var rooms = new HashTable();
var convs = new HashTable();
var ignores = new HashTable();
var active_conv = ROOM_CONV;
var current_room = 'Main Lobby';


window.onload = page_loaded;
window.onresize = page_resized;
document.onkeypress = key_pressed;

//Shorthand to get elements
function E(id) {return document.getElementById(id);}

function page_loaded() {
	var emot_box = E('emoticon_box');
	var input_box = E('input_box');
	var i = 1;
		
	EMOTICONS[':)'] = 'imgs/smilies/smile.svg';
	EMOTICONS[':D'] = 'imgs/smilies/happy.svg';
	EMOTICONS['[grin]'] = 'imgs/smilies/grin.svg';
	EMOTICONS['[laugh]'] = 'imgs/smilies/laugh.svg';
	EMOTICONS[':|'] = 'imgs/smilies/blank.svg';
	EMOTICONS[':('] = 'imgs/smilies/sad.svg';
	EMOTICONS['[angry]'] = 'imgs/smilies/angry.svg';
	EMOTICONS['[grr]'] = 'imgs/smilies/grr.svg';
	EMOTICONS['[cry]'] = 'imgs/smilies/cry.svg';
	EMOTICONS[':S'] = 'imgs/smilies/confused.svg';
	EMOTICONS[':p'] = 'imgs/smilies/tongue.svg';
	EMOTICONS['[shades]'] = 'imgs/smilies/shades.svg';
	EMOTICONS['[nerd]'] = 'imgs/smilies/nerd.svg';
	EMOTICONS['[derp]'] = 'imgs/smilies/derp.svg';
	EMOTICONS['[drool]'] = 'imgs/smilies/drool.svg';
	EMOTICONS['[shy]'] = 'imgs/smilies/shy.svg';
	EMOTICONS['[shysmile]'] = 'imgs/smilies/shysmile.svg';
	EMOTICONS['[emb]'] = 'imgs/smilies/embarrassed.svg';
	EMOTICONS['[wink]'] = 'imgs/smilies/wink.svg';
	EMOTICONS['[saywhat]'] = 'imgs/smilies/saywhat.svg';
	EMOTICONS['[umm]'] = 'imgs/smilies/umm.svg';
	EMOTICONS['[whoa]'] = 'imgs/smilies/whoa.svg';
	EMOTICONS['[devil]'] = 'imgs/smilies/devil.svg';
	EMOTICONS['[idea]'] = 'imgs/smilies/idea.svg';
	
	for(var e in EMOTICONS) {
		emot_box.innerHTML += '<img src="'+EMOTICONS[e]+'" title="'+e+'">';
		if(i%5 == 0)
			emot_box.innerHTML += '<br>';
		i++;
	}
	
	emot_box.onclick = emoticon_selected;
	document.body.onclick = body_clicked;
	document.body.oncontextmenu = body_context_menu;

	E('ss_hcw').disabled = true;
	E('ss_hcb').disabled = true;

	load_cookies();

	refresh_theme();
			
	page_resized();
	input_box.value = '';
	input_box.focus();
	add_conv(ROOM_CONV);
	connect();
}

function connect() {
	add_sys_msg('Connecting...');
	ws = new WebSocket(CHATADDR);
	ws.onmessage = recv_msg;
	ws.onclose = conn_closed;
}

function conn_closed() {
	add_sys_msg('You have disconnected');
	if(E('audio_opt_connection').checked)
		play_sound('audio_disconnected');
}

function recv_msg(e) {
	var d = e.data.split("\n");

// DEBUGGING STUFF
//console.log('MSG RECEIVED---->');
//for(var ti=0;ti<d.length;ti++)
//	console.log('\t'+d[ti]);

	if(d[0] == 'rmsg') {
		if(ignores.has(d[1]))
			return;
		if(d[4].lastIndexOf('/a',0) > -1)
			add_action_msg(ROOM_CONV, d[1], d[4].substring(3));
		else
			add_user_msg(ROOM_CONV, d[1], d[2], d[3], d[4]);
		if(ROOM_CONV != active_conv && !convs.get(ROOM_CONV).new) {
			convs.get(ROOM_CONV).new = true;
			refresh_convs();
		}
		if(ROOM_CONV==active_conv && E('audio_opt_active_conv').checked)
			play_sound('audio_msg_active');
		else if(ROOM_CONV!=active_conv && E('audio_opt_inactive_room').checked)
			play_sound('audio_msg_inactive');
	}
	else if(d[0]=='pmsg' || d[0]=='pmsg-echo') {
		var puser = d[1];
		if(d[0]=='pmsg-echo')
			puser = USERNAME;
		if(ignores.has(puser))
			return;
		if(!convs.has(d[1]))
			add_conv(d[1]);
		if(d[4].lastIndexOf('/a',0) > -1)
			add_action_msg(d[1], puser, d[4].substring(3));
		else
			add_user_msg(d[1], puser, d[2], d[3], d[4]);
		if(d[1]!=active_conv && !convs.get(d[1]).new) {
			convs.get(d[1]).new = true;
			refresh_convs();
		}
		if(d[1]==active_conv && E('audio_opt_active_conv').checked)
			play_sound('audio_msg_active');
		else if(d[1]!=active_conv && E('audio_opt_inactive_im').checked)
			play_sound('audio_msg_inactive');
	}
	else if(d[0] == 'join') {
		add_user('Main Lobby', d[1], d[2], d[3]);
		refresh_users();
		refresh_convs();
		add_sys_msg(d[1] + ' has joined.', ROOM_CONV);
		if(convs.has(d[1]))
			add_sys_msg(d[1] + ' has joined.', d[1]);
		if(E('audio_opt_sign').checked)
			play_sound('audio_sign_in');
	}
	else if(d[0] == 'disconnect') {
		if(d[1] != USERNAME) {
			remove_user(d[1]);
			refresh_users();
			add_sys_msg(d[1] + ' has signed out of chat.', ROOM_CONV);
			if(convs.has(d[1]))
				add_sys_msg(d[1] + ' has signed out of chat.', d[1]);
			if(E('audio_opt_sign').checked)
				play_sound('audio_sign_out');
		}
	}
	else if(d[0] == 'move') {
		if(rooms.has(d[2]) && rooms.get(d[2]).users.has(d[1])) {
			if(!rooms.has(d[3]))//add 'to' room if doesn't exist
				add_room(d[3], d[4]);
			rooms.get(d[3]).users.set( d[1], rooms.get(d[2]).users.get(d[1]) );
			rooms.get(d[2]).users.remove(d[1]);
			//delete room if empty
			if(d[2]!='Main Lobby' && rooms.get(d[2]).users.length < 1)
				rooms.remove(d[2]);
			if(d[1] == USERNAME) { //if this client that moved
				switch_room(d[3]);
				switch_conv(ROOM_CONV);
				add_sys_msg('You have moved to ' + d[3] + '.', ROOM_CONV);
			}
			else if(d[1]==current_room || d[2]==current_room)
				add_sys_msg(d[1] + ' has moved to ' + d[3] + '.', ROOM_CONV);
			refresh_users();
			refresh_convs();
		}
	}
	else if(d[0] == 'move-fail-password')
		add_sys_msg('Could not join room. The room password does not match.', null);
	else if(d[0] == 'move-fail-length')
		add_sys_msg('Could not join room. Room names and passwords must not be longer than 20 characters.', null);
	else if(d[0] == 'smsg')
		add_sys_msg(d[1])
	else if(d[0]=='kicked') {
		remove_user(d[1]);
		refresh_users();
		add_sys_msg(d[1] + ' has been kicked from chat for ' + d[3] + ' hour(s) by ' + d[2] + '.', ROOM_CONV);
		if(convs.has(d[1]))
			add_sys_msg(d[1] + ' has been kicked from chat for ' + d[3] + ' hour(s) by ' + d[2] + '.', d[1]);
		if(E('audio_opt_mod').checked)
			play_sound('audio_mod_action');
	}
	else if(d[0]=='banned') {
		remove_user(d[1]);
		refresh_users();
		add_sys_msg(d[1] + ' has been banned from chat by ' + d[2] + '.', ROOM_CONV);
		if(convs.has(d[1]))
			add_sys_msg(d[1] + ' has been banned from chat by ' + d[2] + '.', d[1]);
		if(E('audio_opt_mod').checked)
			play_sound('audio_mod_action');
	}
	else if(d[0] == 'droom') {
		if(rooms.has(d[1])) {
			var keys = rooms.get(d[1]).users.keys();
			for(var i=0;i<keys.length;i++) {
				rooms.get('Main Lobby').users.set( keys[i], rooms.get(d[1]).users.get(keys[i]));
				if(keys[i] == USERNAME)
					switch_room('Main Lobby');
			}
			rooms.remove(d[1]);
			refresh_users();
			add_mod_msg(d[2], 'Room "'+d[1]+'" deleted.', true);
			if(E('audio_opt_mod').checked)
				play_sound('audio_mod_action');
		}
	}
	else if(d[0] == 'broadcast') {
		add_mod_msg(d[1], d[2], true);
		if(E('audio_opt_mod').checked)
			play_sound('audio_mod_action');
	}
	else if(d[0] == 'modmsg') {
		add_mod_msg(d[1], d[2], false);
		if(E('audio_opt_mod').checked)
			play_sound('audio_mod_action');
	}
	else if(d[0] == 'ready') //if ready, try authentication
		ws.send("auth\n" + USERNAME + "\n" + PROFLINK + "\n" + HASHCODE);
	else if(d[0] == 'auth-fail')
		add_sys_msg('Authentication failed - Security parameter violation.');
	else if(d[0] == 'auth-banned')
		add_sys_msg('Authentication failed - This is a banned account.');
	else if(d[0] == 'auth-kicked')
		add_sys_msg('Authentication failed - This account was kicked for ' + d[1] + ' hour(s).');
	else if(d[0] == 'auth-pass') {
		var	r;
		for(var i=1;i<d.length;i++) {
			d[i] = d[i].split("\t");
			if(d[i][0]=='r' || d[i][0]=='s') {
				r = d[i][1];
				add_room(d[i][1], d[i][0]);
			}
			else {
				add_user(r, d[i][1], d[i][2], d[i][0]);
				if(d[i][1]==USERNAME && d[i][0]=='m')
						MOD = true;
			}
		}

		switch_room('Main Lobby');
		switch_conv(ROOM_CONV);
		refresh_users();
		refresh_convs();
		add_sys_msg('You have joined the Main Lobby.', ROOM_CONV);
		if(E('audio_opt_connection').checked)
			play_sound('audio_connected');
	}
}

function send_clicked(e) {
	var input_box = E('input_box');
	var msg = input_box.value.replace(/[\n\r\t]+/g," ");

	input_box.value = "";

	//if a blank message, abort
	if(msg=='' || msg.search(/^\s+$/)!=-1)
		return false;
	
	if(msg.lastIndexOf('/a ') > -1) {
		if(active_conv == ROOM_CONV)
			msg = "rmsg\n" + current_room + "\n\n\n" + msg;
		else
			msg = "pmsg\n" + active_conv + "\n\n\n" + msg;
	}
	else if(msg.lastIndexOf('/join ') > -1) {
		//break into pieces, ignorning spaces in double quotes
		var pcs = msg.match(/"[^"]*"|\S+/g);
		var n = 0;

		//check for, and remove, quotes from parameters
		for(var p in pcs) {
			//count the double quotes in this piece
			n = (pcs[p].match(/"/g)||[]).length;

			if(n == 2) //trim the quotes
				pcs[p] = pcs[p].replace(/"/g, '');
			else if(n == 1) {
				add_sys_msg('Invalid command format - quote not closed.', active_conv);
				return false;
			}
		}

		if(pcs.length<2 || pcs.length>3) {
			add_sys_msg('Invalid command format - incorrect number of parameters.', active_conv);
			return false;
		}
		else if(current_room == pcs[1].toLowerCase()) {
			add_sys_msg('Move failed - you are already in that room!', active_conv);
			return false;
		}	
		else if(pcs.length == 2)//no password
			pcs[2] = '';

		msg = 'move\n'+current_room+"\n"+pcs[1]+"\n"+pcs[2];
	}
	else if(msg.lastIndexOf('/ignore ') > -1) {
		msg = msg.substring(8);
		ignore_user(msg);
		return;
	}
	else if(msg.lastIndexOf('/listen ') > -1) {
		msg = msg.substring(8);
		listen_user(msg);
		return;
	}
	else if(msg.lastIndexOf('/where ') > -1) {
		msg = msg.substring(7);
		rkeys = rooms.keys();
		for(var i=0;i<rkeys.length;i++) {
			if(rooms.get(rkeys[i]).users.has(msg)) {
				add_sys_msg(msg + ' is in ' + rkeys[i] + '.', active_conv);
				return;
			}
		}
		add_sys_msg(msg + ' was not found.', active_conv);			
		return;
	}
	else if(msg.lastIndexOf('/kick ')>-1 && MOD)
		msg = "kick\n" + msg.substring(6);
	else if(msg.lastIndexOf('/ban ')>-1 && MOD)
		msg = "ban\n" + msg.substring(5);
	else if(msg.lastIndexOf('/droom ')>-1 && MOD)
		msg = "droom\n" + msg.substring(7);
	else if(msg.lastIndexOf('/bcast ')>-1 && MOD)
		msg = "broadcast\n" + msg.substring(7);
	else if(msg.lastIndexOf('/modmsg ')>-1 && MOD)
		msg = "modmsg\n" + msg.substring(8);
	else if(msg[0] == '/')//ignore unrecognized or incomplete commands
		return false;
	else {
		if(active_conv == ROOM_CONV)
			msg = 	"rmsg\n" + current_room + "\n" +
					(FONT_B?'b':'') + (FONT_I?'i':'') + (FONT_U?'u':'') + "\n" + FONT_COLOR + "\n" + msg;
		else
			msg = 	"pmsg\n" + active_conv + "\n" +
					(FONT_B?'b':'') + (FONT_I?'i':'') + (FONT_U?'u':'') + "\n" + FONT_COLOR + "\n" + msg;
	}

	ws.send(msg);
}

function key_pressed(evt) {
	var elem = evt.target || evt.srcElement;

	if(elem==E('input_box') && evt.keyCode==13) {
		send_clicked(evt);
		evt.preventDefault();
	}
}

function generic_add_msg(msg, conv) {
	if(typeof conv === 'undefined')//set default val if not supplied
		conv = null;
	
	var cb = E('chat_box');
	
	if(conv === null) { // Msg to all convs
		var keys = convs.keys();
		for(var i=0;i<keys.length;i++)	{
			var c = keys[i];
			convs.get(c).div.innerHTML += msg;
			if(convs.get(c).div.childNodes.length > CONV_MAX_MSGS)
				convs.get(c).div.removeChild(convs.get(c).childNodes[0]);
		}
		cb.innerHTML += msg;
		if(cb.childNodes.length > CONV_MAX_MSGS)
			cb.removeChild(cb.childNodes[0]);
	}
	else if(convs.has(conv)) { // Msg to specified conv 
		convs.get(conv).div.innerHTML += msg;
		if(convs.get(conv).div.childNodes.length > CONV_MAX_MSGS)
			cb.removeChild(cb.childNodes[0]);
		if(conv == active_conv) {
			cb.innerHTML += msg;
			if(cb.childNodes.length > CONV_MAX_MSGS)
				cb.removeChild(cb.childNodes[0]);
		}
	}
	if(!FREEZE_SCROLLING) {
		SYSTEM_SCROLL = true;
		var scrollHeight = Math.max(cb.scrollHeight, cb.clientHeight);
		cb.scrollTop = scrollHeight - cb.clientHeight;
	}
}

function add_sys_msg(msg, conv) {
	if(typeof conv === 'undefined')
		conv = null;

	msg = '<p class="sys_msg">' + escape_html(msg) + '</p>';
	generic_add_msg(msg, conv);
}

function add_mod_msg(mod, msg, mods_only) {
	msg = escape_html(msg);
	
	if(SHOW_EMOTICONS)
		msg = replace_emoticons(msg);

	msg = replace_links(msg);

	if(mods_only)
		mod += ' to all';
	else
		mod += ' to mods';

	mod = escape_html(mod);
	
	msg = '<p class="mod_msg"><span style="font-weight:bold;">MOD [' + mod + ']</span> ' + msg + '</p>';
	generic_add_msg(msg, null);
}

function add_user_msg(conv, user, biu, color, msg) {
	msg = escape_html(msg);
	
	if(SHOW_EMOTICONS)
		msg = replace_emoticons(msg);

	msg = replace_links(msg);

	var msg_style = '';

	if(biu.indexOf('b') > -1)
		msg_style += 'font-weight:bold;';
	if(biu.indexOf('i') > -1)
		msg_style += 'font-style:italic;';
	if(biu.indexOf('u') > -1)
		msg_style += 'text-decoration:underline;';

	if(E('color_opt_chat').checked) {
		if(E('ss_hcb').disabled || color!='black')
		msg_style += ';color:' + color;
	}
	
	msg = '<p>[<a class="ulink" href="#">' + escape_html(user) + '</a>] <span title="'+color+'" style="' + msg_style + '">' + msg + '</span></p>';
	generic_add_msg(msg, conv);
}

function add_action_msg(conv, user, msg) {
	msg = escape_html(msg);
	
	if(SHOW_EMOTICONS)
		msg = replace_emoticons(msg);

	msg = replace_links(msg);

	msg = '<p class="action_msg">' + escape_html(user) + ' ' + msg + '</p>';
	generic_add_msg(msg, conv);
}

function add_conv(c) {
	convs.set(c, {
		div: document.createElement('div'), //div buffer
		new: false //true/false - has unread messages
	});
}

function switch_conv(c) {
	var cbox = E('chat_box');
	
	if(!convs.has(c))
		add_conv(c);

	convs.get(active_conv).div.innerHTML = cbox.innerHTML;
	cbox.innerHTML = convs.get(c).div.innerHTML;
	convs.get(c).new = false;
	active_conv = c;
	if(c == ROOM_CONV)
		E('active_conv_header').innerHTML = '<img src="imgs/room.svg">' + escape_html(current_room);	
	else
		E('active_conv_header').innerHTML = '<img src="imgs/user.svg">' + escape_html(c);	

	FREEZE_SCROLLING = false;
	var scrollHeight = Math.max(cbox.scrollHeight, cbox.clientHeight);
	cbox.scrollTop = scrollHeight - cbox.clientHeight;
}

function add_room(r, type) {
	rooms.set(r, {
		secure: type=='s',
		expanded: true,
		users: new HashTable()
	});
}

function switch_room(r) {
	if(rooms.has(r)) {
		current_room = r;
		if(active_conv == ROOM_CONV)
			E('active_conv_header').innerHTML = '<img src="imgs/room.svg">' + escape_html(current_room);	
	}
}

function add_user(r, u, p, type) {
	rooms.get(r).users.set(u, {
		mod: type=='m',
		profile: p
	});
}

function remove_user(u) {
	var keys = rooms.keys();
	var r;
	for(var i=0;i<keys.length;i++) {
		r = keys[i];
		if(rooms.get(r).users.has(u)) {
			rooms.get(r).users.remove(u);
			//Delete room if empty
			if(rooms.get(r).users.length<1 && r!='Main Lobby')
				rooms.remove(r);
			break;
		}
	}
}

function refresh_users() {
	var box = E('users_box');
	box.innerHTML = '';

	var total_users = 0;
	var rlist = document.createElement('ul');
	var ritem;
	var ulist;
	var uitem;
	var icon;
	var link;
	var r;
	var u;
	var ukeys;
	var rkeys = rooms.sorted_keys_custom(function(a, b) {
		if(a == 'Main Lobby')
			return -1;
		var a = a.toLowerCase();
		var b = b.toLowerCase();
		if(a < b) return -1;
		if(a > b) return 1;
		return 0;
	});
	
	rlist.style.fontWeight = 'bold';
	
	for(var i=0;i<rkeys.length;i++) {
		r = rkeys[i];
		ritem = document.createElement('li');
		icon = document.createElement('img');
		if(rooms.get(r).secure)
			icon.src = 'imgs/sroom.svg';
		else
			icon.src = 'imgs/room.svg';
		link = document.createElement('a');


		link.className = 'rlink';
		link.title = r;
		link.href = '#';
		link.appendChild(icon);
		link.appendChild(document.createTextNode(r));
		ritem.appendChild(link);
		
		if(rooms.get(r).expanded && rooms.get(r).users.length>0) {
			total_users += rooms.get(r).users.length;
			ulist = document.createElement('ul');
			ulist.style.fontWeight = 'normal';
			ukeys = rooms.get(r).users.sorted_keys();
			for(var j=0;j<ukeys.length;j++) {
				u = ukeys[j];
				uitem = document.createElement('li');
				icon = document.createElement('img');
				if(ignores.has(u))
					icon.src = 'imgs/ignore.svg';
				else if(rooms.get(r).users.get(u).mod)
					icon.src = 'imgs/mod.svg';
				else
					icon.src = 'imgs/user.svg';
				link = document.createElement('a');
				link.className = 'ulink';
				link.title = u;
				link.href = '#';
				link.appendChild(icon);
				link.appendChild(document.createTextNode(u));
				uitem.appendChild(link);
				ulist.appendChild(uitem);
			}
			ritem.appendChild(ulist);
		}
		rlist.appendChild(ritem);
	}

	box.appendChild(rlist);
	E('users_header').innerHTML = 'Users:' + total_users + ' / Rooms:' + rooms.length;
}

function refresh_convs() {
	var box = E('convs_box');
	box.innerHTML = '';

	var list = document.createElement('ul');
	var item;
	var icon;
	var link;
	var keys = convs.keys();
	var c = current_room;

	item = document.createElement('li');
	icon = document.createElement('img');
	if(convs.get(ROOM_CONV).new)
		icon.src = NEW_MSG_IMG;
	else
		icon.src = 'imgs/blank.svg';
	link = document.createElement('a');
	if(active_conv == ROOM_CONV)
		link.className = 'clink_active';
	else
		link.className = 'clink_inactive';
	link.title = 'Room (' + c + ')';
	link.name = 'room_conv';
	link.href = '#';
	link.appendChild(icon);
	link.appendChild(document.createTextNode('Room (' + c + ')'));
	item.appendChild(link);
	list.appendChild(item);
		
	for(var k=0;k<keys.length;k++) {
		c = keys[k];
		if(c == ROOM_CONV)
			continue;
		item = document.createElement('li');
		icon = document.createElement('img');
		if(convs.get(c).new)
			icon.src = NEW_MSG_IMG;
		else
			icon.src = 'imgs/blank.svg';
		link = document.createElement('a');
		if(active_conv == c)
			link.className = 'clink_active';
		else
			link.className = 'clink_inactive';
		link.title = c;
		link.href = '#';
		link.appendChild(icon);
		link.appendChild(document.createTextNode(c));
		item.appendChild(link);
		list.appendChild(item);
	}

	box.appendChild(list);
}

function ignore_user(user) {
	if(user != '') {
		ignores.set(user, true);
		refresh_users();
		add_sys_msg('You are now ignoring '+ user, active_conv);
	}
}

function listen_user(user) {
	if(ignores.has(user)) {
		ignores.remove(user);
		refresh_users();
		add_sys_msg('You are now listening to '+ user, active_conv);
	}
}

//for making non-attribute text safe for output
function escape_html(str) {
	var div = document.createElement('div');
	div.appendChild(document.createTextNode(str));
	return div.innerHTML;
}

function menu_option_changed(opt) {
	var enable_audio = E('audio_opt_enable');
	var acookie = '';
		
	if(opt == enable_audio) {
		E('audio_opt_active_conv').disabled = !enable_audio.checked;
		E('audio_opt_inactive_im').disabled = !enable_audio.checked;
		E('audio_opt_inactive_room').disabled = !enable_audio.checked;
		E('audio_opt_connection').disabled = !enable_audio.checked;
		E('audio_opt_sign').disabled = !enable_audio.checked;
		E('audio_opt_mod').disabled = !enable_audio.checked;

		if(enable_audio.checked)
			E('audio_options_list').className = '';
		else
			E('audio_options_list').className = 'option_text_disabled';
	}
	else if(opt.name == 'color_theme') {
		refresh_theme();
		refresh_convs();//required to update newmsg_x.svg imgs
	}

	acookie += (E('audio_opt_enable').checked ? '1' : '0') +
			   (E('audio_opt_active_conv').checked ? '1' : '0') +
			   (E('audio_opt_inactive_im').checked ? '1' : '0') +
			   (E('audio_opt_inactive_room').checked ? '1' : '0') +
			   (E('audio_opt_connection').checked ? '1' : '0') +
			   (E('audio_opt_sign').checked ? '1' : '0') +
			   (E('audio_opt_mod').checked ? '1' : '0');
	set_cookie('chataudio', acookie);
	set_cookie('chatshowcolor', E('color_opt_chat').checked);
}

function menu_button_clicked(btn) {
	var box = null;
	
	if(btn.id == 'insert_emoticon_button')
		box = E('emoticon_box');
	else if(btn.id == 'audio_button')
		box = E('audio_options_box');
	else if(btn.id == 'color_button')
		box = E('color_options_box');
	else
		return;
	
	var rect = btn.getBoundingClientRect();
	var cc = E('click_catcher');

	box.style.left = Math.floor(rect.left) + 'px';
	box.style.top = (Math.floor(rect.top)-box.offsetHeight)+ 'px';
	box.style.visibility = 'visible';
	btn.className = 'toggle_button_1';
	cc.style.display = 'block';	
}

function view_changed(btn) {
	if(btn.className == 'toggle_button_0') {
		btn.className = 'toggle_button_1';
		if(btn.id != 'chat_view_button') E('chat_view_button').className = 'toggle_button_0';
		if(btn.id != 'list_view_button') E('list_view_button').className = 'toggle_button_0';
		if(btn.id != 'full_view_button') E('full_view_button').className = 'toggle_button_0';
		page_resized();
	}
}

function toggle_button_clicked(btn) {
	var ib = E('input_box');

	if(btn.className == 'toggle_button_0')
		btn.className = 'toggle_button_1';
	else
		btn.className = 'toggle_button_0';

	if(btn.id == 'b_button') {
		FONT_B = !FONT_B;
		FONT_B ? ib.style.fontWeight='bold' : ib.style.fontWeight='normal';
	}
	else if(btn.id == 'i_button') {
		FONT_I = !FONT_I;
		FONT_I ? ib.style.fontStyle='italic' : ib.style.fontStyle='normal';
	}
	else if(btn.id == 'u_button') {
		FONT_U = !FONT_U;
		FONT_U ? ib.style.textDecoration='underline' : ib.style.textDecoration='none';
	}
	else if(btn.id == 'show_emoticons_button') {
		SHOW_EMOTICONS = (E('show_emoticons_button').className=='toggle_button_1');
	}
		
	set_cookie('chatfontbiu', (FONT_B?'b':'') + (FONT_I?'i':'') + (FONT_U?'u':''));
	set_cookie('chatshowemot', SHOW_EMOTICONS);
	ib.focus();
}

function color_changed() {
	var s = E('color_select');
	var i = E('input_box');
	var c = E('black_color_option');
	
	FONT_COLOR = s.value;
	if(E('ss_hcb').disabled==false && s.value=='black') {
		s.style.color = 'white';
		i.style.color = 'white';
	}
	else {
		s.style.color = s.value;
		i.style.color = s.value;
	}
	c.style.color = E('ss_hcb').disabled ? 'black' : 'white';
	set_cookie('chatfontcolor', s.value);
	i.focus();
}

function page_resized() {
	var lcol = E('left_col');
	var rcol = E('right_col');
	var thdr = E('top_header');
		
	var full_w = document.body.clientWidth;
	var full_h = document.body.clientHeight;
	var hgap = Math.floor(full_w * 0.01);
	var vgap = Math.floor(full_h * 0.01);
	var thdr_h = Math.floor(thdr.offsetHeight);
		
	//SIZING MAIN HEADER
	thdr.style.left = hgap + 'px';
	thdr.style.right = hgap + 'px';
	thdr.style.top = vgap + 'px';

	//SIZING MAIN COLUMNS
	if(E('chat_view_button').className == 'toggle_button_1') {
		lcol.style.display = "inline-block";
		rcol.style.display = "none";
		lcol.style.top = Math.floor(thdr_h+(vgap*2)) + 'px';
		lcol.style.bottom = vgap + 'px';
		lcol.style.left = hgap + 'px';
		lcol.style.right = hgap + 'px';
	}
	else if(E('list_view_button').className == 'toggle_button_1') {
		lcol.style.display = "none";
		rcol.style.display = "inline-block";
		rcol.style.top = Math.floor(thdr_h+(vgap*2)) + 'px';
		rcol.style.bottom = vgap + 'px';
		rcol.style.left = hgap + 'px';
		rcol.style.right = hgap + 'px';
	}
	else if(E('full_view_button').className == 'toggle_button_1') {
		lcol.style.display = "inline-block";
		rcol.style.display = "inline-block";
		lcol.style.top = Math.floor(thdr_h+(vgap*2)) + 'px';
		lcol.style.bottom = vgap + 'px';
		lcol.style.left = hgap + 'px';
		lcol.style.right = Math.floor((full_w*0.3)+(hgap*0.5)) + 'px';
		rcol.style.top = Math.floor(thdr_h+(vgap*2)) + 'px';
		rcol.style.bottom = vgap + 'px';
		rcol.style.left = Math.floor((full_w*0.7)+(hgap*0.5)) + 'px';
		rcol.style.right = hgap + 'px';
	}
	
	//SIZING LEFT COL COMPONENTS
	var hdr1_h = E('active_conv_header').offsetHeight;
	var tool_h = E('tool_box').offsetHeight;
	var input_h = E('input_box').offsetHeight;				
	var send_h = E('send_button').offsetHeight;				
	E('send_button').style.marginTop = vgap + 'px';
	E('chat_box').style.height = Math.floor(lcol.clientHeight - (hdr1_h+input_h+tool_h+vgap+send_h)) + 'px';

	//SIZING RIGHT COL COMPONENTS
	var list_h = Math.floor((rcol.clientHeight - E('users_header').offsetHeight - E('convs_header').offsetHeight - vgap) / 2);
	E('users_box').style.height = list_h + 'px';
	E('convs_header').style.marginTop = vgap + 'px';
	E('convs_box').style.height = list_h + 'px';
}

function replace_emoticons(str) {
	var x;
	var r;
	for(var e in EMOTICONS) {
		x = 0;
		r = '<img title="'+e+'" src="'+EMOTICONS[e]+'">';
		while(true) {
			x = str.toLowerCase().indexOf(e.toLowerCase(),x);
			if(x == -1)
				break;
			else if(x==0 || str[x-1]==' ') {
				str = str.substring(0,x) + r + str.substring(x+e.length);
				x += r.length;
			}
			else
				x += e.length;
		}
	}
	return str;
}

function replace_links(str) {
	var matches = str.match(/(?:^|\s|\()(?:(?:https?|ftp)\:\/\/|www\.)\S+/g);

	if(matches === null)
		return str;

	var a;
	var b;
	var m;
	var url;
	var abbr;
	
	for(var i in matches) {
		m = matches[i];

		if(m.search(/^[\(\s]/) == -1)
			a = 0;
		else
			a = 1;
		if(m.search(/.+[\.\!\?\(\)]$/) == -1)
			b = m.length;
		else
			b = m.length - 1;
			
		url = m.substring(a,b).replace(/\"/g,"%22");

		if(url.length > 40)
			abbr = url.substring(0,30) + '...' + url.substring(url.length-7);
		else
			abbr = url;

		if(url[0] == 'w')
			url = 'http://'+url;

		str = str.replace(m, (a==1?m[0]:'') + '<a target="_blank" href="' + url + '">' + abbr + '</a>' + (b==m.length-1?m[m.length-1]:''));
	}	
	
	return str;
}

function chat_scrolled() {
	//if scrolled by the program and not the user
	if(SYSTEM_SCROLL) {
		SYSTEM_SCROLL = false;
		return false;
	}
	else {
		var cb = E('chat_box');
		//position is at the bottom
		if(cb.scrollTop === (cb.scrollHeight - cb.clientHeight))
			FREEZE_SCROLLING = false;
		else
			FREEZE_SCROLLING = true;
	}
}

function emoticon_selected(evt) {
	var elem = evt.target || evt.srcElement;

	if(elem.id == 'emoticon_box')
		return false;

	var ibox = E('input_box');

	ibox.focus();//IE needs focus before setting the below
	
	var scroll_pos = ibox.scrollTop;
	var caret_pos = ibox.selectionStart;
	var front = (ibox.value).substring(0, caret_pos);
	var back = (ibox.value).substring(ibox.selectionEnd, ibox.value.length);
	var text = elem.title;

	var s = ibox.selectionStart;
	var e = ibox.selectionEnd;

	if(s!=0 && ibox.value[s-1]!=' ')
		text = " " + text;

	if(e==ibox.value.length || ibox.value[e]!=' ')
		text += " ";	

	ibox.value = front + text + back;
	caret_pos = caret_pos + text.length;
	ibox.selectionStart = caret_pos;
	ibox.selectionEnd = caret_pos;
	ibox.scrollTop = scroll_pos;

	catch_click();
}

function catch_click() {
	var emot_btn = E('insert_emoticon_button');
	var emot_box = E('emoticon_box');
	var audi_btn = E('audio_button');
	var audi_box = E('audio_options_box');
	var colr_btn = E('color_button');
	var colr_box = E('color_options_box');
	var room_ctx = E('room_context_menu');
	var user_ctx = E('user_context_menu');
	var conv_ctx = E('conv_context_menu');
	var inpt_box = E('input_box');
	var cc = E('click_catcher');
	
	emot_btn.className = 'toggle_button_0';
	emot_box.style.visibility = 'hidden';
	audi_btn.className = 'toggle_button_0';
	audi_box.style.visibility = 'hidden';
	colr_btn.className = 'toggle_button_0';
	colr_box.style.visibility = 'hidden';
	room_ctx.style.visibility = 'hidden';
	user_ctx.style.visibility = 'hidden';
	conv_ctx.style.visibility = 'hidden';
	cc.style.display = 'none';
	inpt_box.focus();
}

function body_clicked(evt) {
	var e = evt.target || evt.srcElement;

	//if this is the link's image, set e to the actual link
	if(	e.parentNode.className=='rlink'	||
		e.parentNode.className=='ulink' ||
		e.parentNode.className=='clink_active' ||
		e.parentNode.className=='clink_inactive')
			e = e.parentNode;

	if(e.className == 'rlink') {
		var room = e.textContent;//note html already escaped
		rooms.get(room).expanded = !(rooms.get(room).expanded);
		refresh_users();
	}
	else if(e.className == 'ulink') {
		var text = e.textContent;//note html already escaped
		var ibox = E('input_box');

		ibox.focus();//IE needs focus before setting the below
	
		var scroll_pos = ibox.scrollTop;
		var caret_pos = ibox.selectionStart;
		var front = (ibox.value).substring(0, caret_pos);
		var back = (ibox.value).substring(ibox.selectionEnd, ibox.value.length);
		
		ibox.value = front + text + back;
		caret_pos = caret_pos + text.length;
		ibox.selectionStart = caret_pos;
		ibox.selectionEnd = caret_pos;
		ibox.scrollTop = scroll_pos;
	}
	else if(e.className=='clink_active' || e.className=='clink_inactive') {
		var conv;
		if(e.name == 'room_conv')
			conv = ROOM_CONV;
		else
			conv = e.textContent;
		E('input_box').focus();
		if(conv == active_conv)
			return true;
		switch_conv(conv);
		refresh_convs();
	}
}

function body_context_menu(evt) {
	var e = evt.target || evt.srcElement;

	//if this is the link's image, set e to the actual link
	if(	e.parentNode.className=='rlink'	||
		e.parentNode.className=='ulink' ||
		e.parentNode.className=='clink_active' ||
		e.parentNode.className=='clink_inactive')
			e = e.parentNode;

	if(e.className=='rlink') {
		var ctx	= E('room_context_menu');
		var jtext = E('ctx_join_room_text');
		var jlink = E('ctx_join_room_link');
		var rtext = e.textContent;//note html already escaped

		E('ctx_room_name').innerHTML = rtext + ' ('+rooms.get(rtext).users.length+')';

		if(rtext == current_room) {
			jtext.style.display = 'block';
			jlink.style.display = 'none';
		}
		else {
			jtext.style.display = 'none';
			jlink.style.display = 'block';
			jlink.onclick = function() {
				catch_click();
				var pwd = '';
				if(rooms.get(rtext).secure)
					pwd = safe_prompt('Enter password for secure room:', 1, 20);
				if(pwd === null)
					return;
				ws.send('move\n'+current_room+"\n"+rtext+"\n"+pwd);
			};
		}
	}
	else if(e.className=='ulink') {
		var ctx	= E('user_context_menu');
		var mlink = E('ctx_inst_msg_link');
		var mtext = E('ctx_inst_msg_text');
		var plink = E('ctx_view_profile_link');
		var ptext = E('ctx_view_profile_text');
		var ilink = E('ctx_ignore_listen_link');
		var user = e.textContent;//note html already escaped
		var keys = rooms.keys();
		var room = '';
		
		//get the room if the user is still logged in
		for(var k=0;k<keys.length;k++) {
			if(rooms.get(keys[k]).users.has(user))
				room = keys[k];
		}

		E('ctx_user_name').innerHTML = user;

		if(room == '') {
			mlink.style.display = 'none';
			mtext.style.display = 'block';
			plink.style.display = 'none';
			ptext.style.display = 'block';
		}
		else {
			var profile_url = rooms.get(room).users.get(user).profile;
			
			if(profile_url == '') {
				ptext.style.display = 'block';
				plink.style.display = 'none';
			} else {
				ptext.style.display = 'none';
				plink.style.display = 'block';
				plink.href = profile_url;
				plink.onclick = catch_click;
			}

			mtext.style.display = 'none';
			mlink.style.display = 'block';
			mlink.onclick = function() {
				catch_click();
				if(user != active_conv) {
					switch_conv(user);
					refresh_convs();
				}
			};
		}

		if(ignores.has(user)) {
			ilink.innerHTML = 'Listen to user';
			ilink.onclick = function() {
				catch_click();
				listen_user(user);
			};
		}
		else {
			ilink.innerHTML = 'Ignore user';
			ilink.onclick = function() {
				catch_click();
				ignore_user(user);
			};
		}
	}
	else if(e.className=='clink_active' || e.className=='clink_inactive') {
		var ctx	= E('conv_context_menu');
		var dtext = E('ctx_delete_conv_text');
		var dlink = E('ctx_delete_conv_link');
		var conv = e.textContent;//note html already escaped

		E('ctx_conv_name').innerHTML = conv;

		if(e.name == 'room_conv') {
			dtext.style.display = 'block';
			dlink.style.display = 'none';
			//dlink.onclick = null;
		}
		else {
			dtext.style.display = 'none';
			dlink.style.display = 'block';
			dlink.onclick = function() {
				if(conv == active_conv)
					switch_conv(ROOM_CONV);
				convs.remove(conv);
				refresh_convs();
				catch_click();
			};
		}	
	}
	else //not a context generating item
		return true;

	//set menu location and display
	var mx = Math.floor(evt.clientX);
	var my = Math.floor(evt.clientY);
	mx<(document.body.offsetWidth/2)  ? ctx.style.left=mx+'px' : ctx.style.left=mx-ctx.offsetWidth+'px';
	my<(document.body.offsetHeight/2) ? ctx.style.top=my+'px' : ctx.style.top=my-ctx.offsetHeight+'px';
	ctx.style.visibility = 'visible';
	E('click_catcher').style.display = 'block';
	if(evt.preventDefault != undefined)
		evt.preventDefault();
	if(evt.stopPropagation != undefined)
		evt.stopPropagation();
}

function safe_prompt(msg, min, max) {
	while(true) {
		var r = prompt(msg, '');
		if(r.length<min || r.length>max)
			alert('Input must be '+min+' - '+max+' character(s).');
		else
			return r;
	}
}

function play_sound(id) {
	if(!E('audio_opt_enable').checked)
		return;
	E(id).currentTime = 0;
	E(id).play();
}

function refresh_theme() {
	var def = E('ss_default');
	var hcw = E('ss_hcw');
	var hcb = E('ss_hcb');
	var a = E('audio_button_img');
	var i = E('input_box');
	var s = E('color_select');
	var c = E('black_color_option');
	var vc = E('chat_view_img');
	var vl = E('list_view_img');
	var vf = E('full_view_img');
	
	if(E('color_theme_default').checked) {
		def.disabled = false;
		hcw.disabled = true;
		hcb.disabled = true;
		NEW_MSG_IMG = 'imgs/newmsg_b.svg';
		a.src = 'imgs/audio_b.svg';
		vc.src = 'imgs/chat_view_b.svg';
		vl.src = 'imgs/list_view_b.svg';
		vf.src = 'imgs/full_view_b.svg';
		set_cookie('chattheme','default');
	}
	else if(E('color_theme_hcw').checked) {
		def.disabled = true;
		hcw.disabled = false;
		hcb.disabled = true;
		NEW_MSG_IMG = 'imgs/newmsg_b.svg';
		a.src = 'imgs/audio_b.svg';
		vc.src = 'imgs/chat_view_b.svg';
		vl.src = 'imgs/list_view_b.svg';
		vf.src = 'imgs/full_view_b.svg';
		set_cookie('chattheme','hcw');
	}
	else if(E('color_theme_hcb').checked) {
		def.disabled = true;
		hcw.disabled = true;
		hcb.disabled = false;
		NEW_MSG_IMG = 'imgs/newmsg_w.svg';
		a.src = 'imgs/audio_w.svg';
		vl.src = 'imgs/list_view_w.svg';
		vc.src = 'imgs/chat_view_w.svg';
		vf.src = 'imgs/full_view_w.svg';
		set_cookie('chattheme','hcb');
	}

	if(hcb.disabled==false && s.value=='black') {
		s.style.color = 'white';
		i.style.color = 'white';
	}
	else {
		s.style.color = s.value;
		i.style.color = s.value;
	}
	c.style.color = E('ss_hcb').disabled ? 'black' : 'white';
}

function text_size_changed() {
	var size = E('text_size_select').value;
	document.body.style.fontSize = size;
	page_resized();
	set_cookie('chattextsize', size);
}

function set_cookie(n, v) {
	document.cookie = n + '=' + encodeURI(v);
}

function load_cookies() {
	var a = document.cookie.split(';');

	for(var i=0;i<a.length;i++) {
		var c = a[i];
		while(c.charAt(0)==' ') c = c.substring(1);
		var c = c.split('=');
		c[1] = decodeURI(c[1]);
		if(c[0] == 'chattextsize') {
			E('text_size_select').value = c[1];
			document.body.style.fontSize = c[1];
			page_resized();
		}
		else if(c[0] == 'chatfontcolor') {
			E('color_select').value = c[1];
			color_changed();
		}
		else if(c[0] == 'chatfontbiu') {
			if(c[1].indexOf('b') > -1) toggle_button_clicked(E('b_button'));
			if(c[1].indexOf('i') > -1) toggle_button_clicked(E('i_button'));
			if(c[1].indexOf('u') > -1) toggle_button_clicked(E('u_button'));
		}
		else if(c[0] == 'chatshowemot') {
			if(c[1])
				toggle_button_clicked(E('show_emoticons_button'));
		}
		else if(c[0] == 'chataudio') {
			E('audio_opt_enable').checked = c[1][0]=='1'?true:false;
			E('audio_opt_active_conv').checked = (c[1][1]=='1'?true:false);
			E('audio_opt_inactive_im').checked = (c[1][2]=='1'?true:false);
			E('audio_opt_inactive_room').checked = (c[1][3]=='1'?true:false);
			E('audio_opt_connection').checked = (c[1][4]=='1'?true:false);
			E('audio_opt_sign').checked = (c[1][5]=='1'?true:false);
			E('audio_opt_mod').checked = (c[1][6]=='1'?true:false);
			if(c[1][0])
				menu_option_changed(E('audio_opt_enable'));
		}			
		else if(c[0] == 'chatshowcolor') {
			E('color_opt_chat').checked = (c[1]=='true'?true:false);
		}
		else if(c[0] == 'chattheme') {
			if(c[1] == 'default')
				E('color_theme_default').checked = true;
			else if(c[1] == 'hcw')
				E('color_theme_hcw').checked = true;
			else if(c[1] == 'hcb')
				E('color_theme_hcb').checked = true;
			//refresh_theme();
		}
	}
}
function show_hide_help() {
	var hb = E('help_box');

	if(hb.style.display == 'block')
		hb.style.display = 'none';
	else
		hb.style.display = 'block';
}
