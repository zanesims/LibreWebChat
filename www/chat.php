<?php
// Part of LibreWebChat
// Copyright (c) 2015, Zane Sims
// License details in 'license.txt'

//CONFIGURATION
//*****************************************************************************
require_once('authmod/default.php');
$site_title = "Chat";
$hashsalt = '1234abcd';
$chataddr = 'ws://192.168.1.101:8080/';
//*****************************************************************************



if($username=='' || $hashsalt=='')
	exit('ERROR: The application has not been configured yet. Review the readme.txt file for more info.');

//create hashcode and make username str safe as a js value
$username = str_replace('\\', '\\\\', $username);
$hashcode = hash('sha256', $username.$hashsalt);
$username = str_replace('"', '\\"', $username);

header("Expires: Wed, 04 Jul 2001 06:00:00 GMT");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
?>
<!DOCTYPE html>
<html>
<head>
	<title><?php echo($site_title);?></title>
	<meta charset="UTF-8">
	<meta name="robots" content="noindex">
	<link rel="stylesheet" type="text/css" href="style/base.css">
	<link id="ss_default" rel="stylesheet" type="text/css" href="style/theme_default.css">
	<link id="ss_hcw" rel="stylesheet" type="text/css" href="style/theme_hcw.css">
	<link id="ss_hcb" rel="stylesheet" type="text/css" href="style/theme_hcb.css">
</head>
<body>
<script>
	var USERNAME = "<?php echo($username);?>";
	var HASHCODE = '<?php echo($hashcode);?>';
	var CHATADDR = '<?php echo($chataddr);?>';
	var PROFLINK = "<?php echo($proflink);?>";
</script>
<script src="hashtable.js"></script>
<script src="chat.js"></script>

<div id="top_header">
	<?php echo($site_title);?>
	<a id="full_view_button" title="Full view" style="float:right" class="toggle_button_1" href="#" onclick="view_changed(this)"><img id="full_view_img" style="vertical-align:text-top;height:1em;width:1em;"></a>
	<a id="list_view_button" title="List view" style="float:right" class="toggle_button_0" href="#" onclick="view_changed(this)"><img id="list_view_img" style="vertical-align:text-top;height:1em;width:1em;"></a>
	<a id="chat_view_button" title="Chat view" style="float:right" class="toggle_button_0" href="#" onclick="view_changed(this)"><img id="chat_view_img" style="vertical-align:text-top;height:1em;width:1em;"></a>
</div>
<div id="left_col">
	<h2 id="active_conv_header">Main Lobby</h2>
	<div id="chat_box" onscroll="chat_scrolled()"></div>
	<div id="tool_box">
		<a id="b_button" title="Set font to bold" class="toggle_button_0" onclick="toggle_button_clicked(this)" href="#">B</a>
		<a id="i_button" title="Set font to italic" class="toggle_button_0" onclick="toggle_button_clicked(this)" href="#">I</a>
		<a id="u_button" title="Set font to underlined"class="toggle_button_0" onclick="toggle_button_clicked(this)" href="#">U</a>
		<select id="color_select" class="toolbar_select" title="Set font color" onchange="color_changed()">
			<option id="black_color_option" value="black" style="color:black">Black</option>
			<option value="darkgray" style="color:darkgray">Gray</option>
			<option value="gray" style="color:gray">Dark Gray</option>
			<option value="red" style="color:red">Red</option>
			<option value="darkred" style="color:darkred">Dark Red</option>
			<option value="orangered" style="color:orangered">Orange</option>
			<option value="brown" style="color:brown">Brown</option>
			<option value="green" style="color:green">Green</option>
			<option value="darkgreen" style="color:darkgreen">Dark Green</option>
			<option value="blue" style="color:blue">Blue</option>
			<option value="darkblue" style="color:darkblue">Dark Blue</option>
			<option value="darkviolet" style="color:darkviolet">Violet</option>
			<option value="purple" style="color:purple">Purple</option>
			<option value="maroon" style="color:maroon">Maroon</option>
			<option value="deeppink" style="color:deeppink">Deep Pink</option>
		</select>
		<a id="insert_emoticon_button" title="Insert an emoticon" style="margin-right:1.5em" class="toggle_button_0" onclick="menu_button_clicked(this)" href="#"><img style="vertical-align:text-top;height:1em;width:1em" src="imgs/smilies/smile.svg"></a>
		<a id="audio_button" title="Audio notification options" class="toggle_button_0" onclick="menu_button_clicked(this)" href="#"><img id="audio_button_img" style="vertical-align:text-top;height:1em;width:1em;"></a>
		<a id="color_button" title="Color options" class="toggle_button_0" onclick="menu_button_clicked(this)" href="#"><img style="vertical-align:text-top;height:1em;width:1em;" src="imgs/color.svg"></a>
		<a id="show_emoticons_button" title="Show emoticons" class="toggle_button_1" onclick="toggle_button_clicked(this)" href="#"><img style="vertical-align:text-top;height:1em;width:1em;" src="imgs/smilies/happy.svg"></a>
		<select id="text_size_select" class="toolbar_select" title="Text display size" onchange="text_size_changed()">
			<option value="3.00em">Size 11</option>
			<option value="2.75em">Size 10</option>
			<option value="2.50em">Size 9</option>
			<option value="2.25em">Size 8</option>
			<option value="2.00em">Size 7</option>
			<option value="1.75em">Size 6</option>
			<option value="1.50em" selected>Size 5</option>
			<option value="1.25em">Size 4</option>
			<option value="1.00em">Size 3</option>
			<option value="0.75em">Size 2</option>
			<option value="0.50em">Size 1</option>
		</select>
		<a id="help_button" title="Help" class="toggle_button_0" onclick="show_hide_help()" href="#">?</a>
	</div>
	<textarea id="input_box" placeholder="<Type your message here>" maxlength="350"></textarea>
	<a id="send_button" class="toggle_button_0" onclick="send_clicked()" href="#">Send</a>
	<a href="https://github.com/zanesims/LibreWebChat" target="_blank" style="float:right">LibreWebChat</a>
</div>
<div id="right_col">
	<h2 id="users_header">Users</h2>
	<div id="users_box"></div>
	<h2 id="convs_header">Conversations</h2>
	<div id="convs_box"></div>
</div>

<div id="click_catcher" onclick="catch_click()"></div>
<div id="emoticon_box"></div>
<div id="audio_options_box">
	<label class="menu_section_header"><input id="audio_opt_enable" onchange="menu_option_changed(this)" checked type="checkbox">Enable audio</label>
	<span id="audio_options_list">
		<label><input id="audio_opt_active_conv" onchange="menu_option_changed(this)" checked type="checkbox">Active conversation msgs</label>
		<label><input id="audio_opt_inactive_im" onchange="menu_option_changed(this)" checked type="checkbox">Inactive instant msgs</label>
		<label><input id="audio_opt_inactive_room" onchange="menu_option_changed(this)" type="checkbox">Inactive room msgs</label>
		<label><input id="audio_opt_connection" onchange="menu_option_changed(this)" checked type="checkbox">Connection notifications</label>
		<label><input id="audio_opt_sign" onchange="menu_option_changed(this)" checked type="checkbox">Sign in/out notifications</label>
		<label><input id="audio_opt_mod" onchange="menu_option_changed(this)" checked type="checkbox">Moderator actions</label>
	</span>
</div>
<div id="color_options_box">
	<p class="menu_section_header">Interface color theme</p>
	<label><input id="color_theme_default" onchange="menu_option_changed(this)" checked type="radio" name="color_theme">Default</label>
	<label><input id="color_theme_hcw" onchange="menu_option_changed(this)" type="radio" name="color_theme">High contrast white</label>
	<label><input id="color_theme_hcb" onchange="menu_option_changed(this)" type="radio" name="color_theme">High contrast black</label>
	<p class="menu_section_header">Other color options</p>
	<label><input id="color_opt_chat" onchange="menu_option_changed(this)" checked type="checkbox">Show message colors</label>
</div>
<div id="room_context_menu" class="context_menu">
	<p id="ctx_room_name" class="context_title"></p>
	<a id="ctx_join_room_link" href="#">Join this room</a>
	<p id="ctx_join_room_text" class="context_disabled">Join this room</p>
</div>
<div id="user_context_menu" class="context_menu">
	<p id="ctx_user_name" class="context_title"></p>
	<a id="ctx_inst_msg_link" href="#">Instant message</a>
	<p id="ctx_inst_msg_text" class="context_disabled">Instant Message</p>
	<a id="ctx_view_profile_link" target="_blank" href="#">View profile</a>
	<p id="ctx_view_profile_text" class="context_disabled">View profile</p>
	<a id="ctx_ignore_listen_link" href="#"></a>
</div>
<div id="conv_context_menu" class="context_menu">
	<p id="ctx_conv_name" class="context_title"></p>
	<a id="ctx_delete_conv_link" href="#">Delete conversation</a>
	<p id="ctx_delete_conv_text" class="context_disabled">Delete conversation</p>
</div>
<audio id="audio_msg_active" preload="auto">
	<source src="audio/msg_active.mp3" type="audio/mpeg">
	<source src="audio/msg_active.ogg" type="audio/ogg">
</audio>
<audio id="audio_msg_inactive" preload="auto">
	<source src="audio/msg_inactive.mp3" type="audio/mpeg">
	<source src="audio/msg_inactive.ogg" type="audio/ogg">
</audio>
<audio id="audio_mod_action" preload="auto">
	<source src="audio/mod_action.mp3" type="audio/mpeg">
	<source src="audio/mod_action.ogg" type="audio/ogg">
</audio>
<audio id="audio_connected" preload="auto">
	<source src="audio/connected.mp3" type="audio/mpeg">
	<source src="audio/connected.ogg" type="audio/ogg">
</audio>
<audio id="audio_disconnected" preload="auto">
	<source src="audio/disconnected.mp3" type="audio/mpeg">
	<source src="audio/disconnected.ogg" type="audio/ogg">
</audio>
<audio id="audio_sign_in" preload="auto">
	<source src="audio/sign_in.mp3" type="audio/mpeg">
	<source src="audio/sign_in.ogg" type="audio/ogg">
</audio>
<audio id="audio_sign_out" preload="auto">
	<source src="audio/sign_out.mp3" type="audio/mpeg">
	<source src="audio/sign_out.ogg" type="audio/ogg">
</audio>
<div id="help_box">
	<span style="font-size:2em;font-weight:bold">LibreWebChat Help</span>
	(<a id="close_help_button" href="#" onclick="show_hide_help()" style="">Close</a>)
	<p>
		You can enter special commands into the chat message box to perform special actions. Some commands only apply to moderators, while others can be entered by anyone. See the table below for all the commands that are available.
	</p>
	<table class="help_table" style="clear:both" border="1px" cellspacing="0">
		<thead style="font-weight:bold">
			<tr>
				<td>COMMAND</td>
				<td>DESCRIPTION</td>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>/a msg</td>
				<td>Action message</td>
			</tr>
			<tr>
				<td>/join "room" "pwd"</td>
				<td>Join a room (creates it if it doesn't exist)</td>
			</tr>
			<tr>
				<td>/ignore user</td>
				<td>Ignore a user</td>
			</tr>
			<tr>
				<td>/listen user</td>
				<td>Start listening to a user again</td>
			</tr>
			<tr>
				<td>/where user</td>
				<td>Display which room a user is in</td>
			</tr>
			<tr>
				<td>/kick user</td>
				<td>(Mod only) Kick a user</td>
			</tr>
			<tr>
				<td>/ban user</td>
				<td>(Mod only) Ban a user</td>
			</tr>
			<tr>
				<td>/droom room</td>
				<td>(Mod only) Delete a room</td>
			</tr>
			<tr>
				<td>/bcast msg</td>
				<td>(Mod only) Broadcasts a message to all everyone</td>
			</tr>
			<tr>
				<td>/modmsg msg</td>
				<td>(Mod only) Message to all mods</td>
			</tr>
		</tbody>
	</table>
</div>
</body>
</html>
