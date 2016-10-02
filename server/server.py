# Part of LibreWebChat
# Copyright (c) 2015, Zane Sims
# License details in 'license.txt'
#
# This is the websocket server for the chat application
#
# CONFIGURATION
##############################################################################
ADDRESS = 'localhost'
PORT = 8080
HASH_SALT = ''
MAX_MSG_LEN = 2000
MAX_FIELD_LEN = 20 #max length for room names and passwords
MAX_CONNECTIONS = 500 #max number of users that can be logged in at once
KICK_DURATION = 24 #in hours
##############################################################################


import sys

va = sys.version_info[0]
vb = sys.version_info[1]

if va < 3 or (va == 3 and vb < 5):
	print("ERROR: This script requires Python version 3.5 or higher. You are currently running Python version " + str(va) + '.' + str(vb))
	sys.exit(1)

import asyncio
import time
import hashlib
import websockets

MODS = []
BANNED = []
KICKED = dict()

#Load the banned list
file = open('banned.list', 'r')
for line in file:
	line = line.rstrip("\n\r")
	if line!='' and line[0]!='#':
		line = line.split("\t")
		BANNED.append(line[0])
file.close()

#Load the mod list
file = open('mods.list', 'r')
for line in file:
	line = line.rstrip("\n\r")
	if line!='' and line[0]!='#':
		MODS.append(line)
file.close()

class User:
	def __init__(self, ws, mod, proflink):
		self.ws = ws
		self.is_mod = mod
		self.proflink = proflink
	
class Room:
	def __init__(self, password):
		self.users = dict()
		self.password = password
	def add_user(self, name, proflink, ws):
		if name not in self.users:
			self.users[name] = User(ws, name in MODS, proflink)
	def remove_user(self, name):
		if name in self.users:
			del self.users[name]
			return True
		else:
			return False

conn_count = 0
rooms = dict()
rooms['Main Lobby'] = Room('')

def remove_room_if_empty(room):
	if len(rooms[room].users)<1 and room!='Main Lobby':
		del rooms[room]

def locate_user(user):
	for r in rooms:
		if user in rooms[r].users:
			return r
	return None

@asyncio.coroutine
def term_user_conn(user, notice=None, mod=None):
	ur = locate_user(user)
	if ur is not None:
		ws = rooms[ur].users[user].ws
		rooms[ur].remove_user(user)
		remove_room_if_empty(ur)
		if notice is not None:#if clients are to be notified
			if mod is not None:#if mod-forced, tell the user why
				yield from ws.send(notice + "\n" + user + "\n" + mod + "\n" + str(KICK_DURATION));
			for r in rooms:
				for u in rooms[r].users:
					if mod is None:
						yield from rooms[r].users[u].ws.send(notice + "\n" + user);
					else:
						yield from rooms[r].users[u].ws.send(notice + "\n" + user + "\n" + mod + "\n" + str(KICK_DURATION));
		yield from ws.close_connection(True)

@asyncio.coroutine
def accept_client(ws, path):
	global conn_count
	conn_count += 1
	process_conn = True #variable only used to skip main loop if too many connections
	if conn_count > MAX_CONNECTIONS:
		yield from ws.send("smsg\nYou cannot login because the maximum number of users has been reached. Please try again later.")
		process_conn = False
		
	ws.user = None;
	print("ACCEPTED: " + ws.remote_address[0])

	if process_conn:
		yield from ws.send("ready")
	
	while process_conn:
		msg = yield from ws.recv()
				
		###################
		# PROCESS MESSAGE #
		###################

		#closed connection
		if msg is None or len(msg) > MAX_MSG_LEN:
			yield from term_user_conn(ws.user, 'disconnect')
			break
		
		msg = msg.split("\n")

		#Authenticate user
		if msg[0] == 'auth':
			hash = hashlib.sha256((msg[1] + HASH_SALT).encode('utf-8'))
			hex = hash.hexdigest()
			if hex != msg[3]: #authentication failed
				yield from ws.send("auth-fail")
				break
			if msg[1] in BANNED:
				yield from ws.send("auth-banned")
				break
			if msg[1] in KICKED:
				#if time lapsed since kick is >= kick duration in seconds
				if time.time() - KICKED[msg[1]] >= KICK_DURATION * 3600:
					del KICKED[msg[1]]
				else:
					yield from ws.send("auth-kicked\n" + str(KICK_DURATION))
					break
			#if user already logged in, log them out first
			if locate_user(msg[1]) is not None:
				yield from ws.send('smsg\nYou are already logged in on another device. The server will now log you out of all devices so you can retry.')
				yield from term_user_conn(msg[1], 'disconnect')				
				break

			ws.user = msg[1]
			
			rooms['Main Lobby'].add_user(ws.user, msg[2], ws)
			reply = 'auth-pass'
			for r in rooms:
				if rooms[r].password == "":
					reply += "\nr\t" + r
				else:
					reply += "\ns\t" + r
				for u in rooms[r].users:
					if u!=ws.user:
						yield from rooms[r].users[u].ws.send("join\n" + ws.user + "\n" + msg[2])
					if u in MODS:
						reply += "\nm\t" + u + "\t" + rooms[r].users[u].proflink
					else:
						reply += "\nu\t" + u + "\t" + rooms[r].users[u].proflink
			yield from ws.send(reply)
		#if msg is not auth and not auth'd, this could be
		#a hack attempt - kill connection immediately
		elif ws.user is None:
			break
		#Room message
		elif msg[0] == 'rmsg':
			if msg[1] in rooms and ws.user in rooms[msg[1]].users:
				for u in rooms[msg[1]].users:
					yield from rooms[msg[1]].users[u].ws.send("rmsg\n"+ws.user+"\n"+msg[2]+"\n"+msg[3]+"\n"+msg[4])
		#Private message
		elif msg[0] == 'pmsg':
			r1 = locate_user(ws.user)
			r2 = locate_user(msg[1])
			if r1 is not None and r2 is not None:
				yield from ws.send("pmsg-echo\n"+msg[1]+"\n"+msg[2]+"\n"+msg[3]+"\n"+msg[4])
				if ws.user != msg[1]:#don't send twice if user talking to self
					yield from rooms[r2].users[msg[1]].ws.send("pmsg\n"+ws.user+"\n"+msg[2]+"\n"+msg[3]+"\n"+msg[4])
		#User moves
		elif msg[0] == 'move':
			if msg[1] not in rooms or ws.user not in rooms[msg[1]].users:
				yield from term_user_conn(ws.user, 'disconnect')
				break

			#The client should never send msgs too large
			if len(msg[2])>MAX_FIELD_LEN or len(msg[2])<1 or len(msg[3])>MAX_FIELD_LEN:
				yield from ws.send('move-fail-length')
				continue
			
			#don't allow case deviations for main room to avoid confusion
			if msg[2].lower() == 'main lobby':
				msg[2] = 'Main Lobby'

			#the client shouldn't ever send same val for to & from
			if msg[1] == msg[2]:
				yield from ws.send('smsg\nYou are already in that room!')
				continue;

			#if room doesn't exist, create it	
			if msg[2] not in rooms:
				rooms[msg[2]] = Room(msg[3])

			#confirm public or correct password
			if rooms[msg[2]].password=='' or rooms[msg[2]].password==msg[3]:
				rooms[msg[2]].users[ws.user] = rooms[msg[1]].users.pop(ws.user, None)
				remove_room_if_empty(msg[1])
				for r in rooms:
					for u in rooms[r].users:
						yield from rooms[r].users[u].ws.send("move\n" + ws.user + "\n" + msg[1] + "\n" + msg[2] + "\n" + ('r' if msg[3]=='' else 's'))
			#failed room authentication
			else:
				yield from ws.send('move-fail-password')
		#mod kicks a user
		elif msg[0] == 'kick':
			if ws.user in MODS:
				if msg[1] in MODS:
					yield from ws.send('smsg\nYou cannot kick a mod.')
					continue
				KICKED[msg[1]] = time.time()
				yield from term_user_conn(msg[1], "kicked", ws.user)
		#Mod bans a user
		elif msg[0] == 'ban':
			if ws.user in MODS and msg[1] not in BANNED:
				if msg[1] not in MODS:
					BANNED.append(msg[1])
					f = open('banned.list', 'a')
					r = locate_user(msg[1])
					if r is None:
						f.write("\n" + msg[1] + "\tunavailable\t" + time.strftime("%Y-%m-%d %H:%M:%S") + "\t" + ws.user)
					else:
						f.write("\n" + msg[1] + "\t" + rooms[r].users[msg[1]].ws.remote_address[0] + "\t" + time.strftime("%Y-%m-%d %H:%M:%S") + "\t" + ws.user)
					f.close()
					yield from term_user_conn(msg[1], 'banned', ws.user)
				else:
					yield from ws.send('smsg\nYou cannot ban a mod.')
		#Mod deletes a room
		elif msg[0] == 'droom':
			if ws.user in MODS and msg[1] in rooms and msg[1] != 'Main Lobby':
				for u in rooms[msg[1]].users:
					rooms['Main Lobby'].users[u] = rooms[msg[1]].users[u]
				del rooms[msg[1]]
				for r in rooms:
					for u in rooms[r].users:
						yield from rooms[r].users[u].ws.send("droom\n" + msg[1] + "\n" + ws.user)
		#Mod message to all users 
		elif msg[0] == 'broadcast':
			if ws.user in MODS:
				for r in rooms:
					for u in rooms[r].users:
						yield from rooms[r].users[u].ws.send("broadcast\n" + ws.user + "\n" + msg[1])
		#Mod message to all mods
		elif msg[0] == 'modmsg':
			if ws.user in MODS:
				for r in rooms:
					for u in rooms[r].users:
						if u in MODS:
							yield from rooms[r].users[u].ws.send("modmsg\n" + ws.user + "\n" + msg[1])
	conn_count -= 1
	print("CLOSED: " + ws.remote_address[0])

if HASH_SALT == '':
	print('ERROR: The application has not been configured yet. Review the readme.txt file for more info.')
	exit(1)

start_server = websockets.serve(accept_client, ADDRESS, PORT)
print('SERVER IS ACTIVE ON ' + ADDRESS + ':' + str(PORT))
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
