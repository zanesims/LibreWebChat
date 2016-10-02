LibreWebChat v 0.98.0
Copyright (c) 2015, Zane Sims
License details in 'license.txt'
Website: https://github.com/zanesims/LibreWebChat
==========================================

Description
------------------------------------------
LibreWebChat is a free web chat application consisting of a Python-powered websocket server and a web client written mostly in Javascript. It was originally intended to be a personal project as a proof of concept for using websockets as the base for building internet chat rooms.

The application does not have its own user account system. Instead, it relies upon you integrating it into your existing user account system by adding a few lines of PHP code necessary for extracting the username of a logged-in user. This should allow the application to be integrated with other web applications such as phpBB, vBulletin, and WordPress. It should also be possible to integrate with Google's web login with relatively little effort.

Server Requirements
------------------------------------------
	- Python 3.5+
	- Web server supporting PHP 5.4+
	- Your own method of authenticating users

Directories
------------------------------------------
/docs: Contains various documentation notes regarding client-server messages and similar notes.
                
/server: Contains the websockets server files written in python.

/www: The web client interface served to clients for connecting to the websockets server.

Configuration
------------------------------------------
To install and configure the server, do the following:

1) Copy the /www directory to your webserver's web root. Rename it to "chat" or something else that is easily recognizable. NOTE: this documentation will keep referring to the new directory as /www (because what you name your directory is unknown).

2) Copy the /server directory to some place on your server machine. The websocket server will be ran from this directory. NOTE: don't put this directory anywhere in your webserver's path.

3) Open /www/chat.php and /server/server.py in a text editor and set the variables in the configuration sections to match your server configuration. You can generate a random hash salt for the hash salt variables by running the script /server/hashgen.py. NOTE: use the same hash as the salt in both files. DOo NOT make the salt viewable by anyone but you.

4) Open the /www/authmod/default.php file in a text editor and add code to get the authenticated username from your webserver. For example, if you run a forum site (using phpBB for example), add the necessary code to start the session and extract the logged in user's username and profile page from the appropriate session variables.

5) You can start the server simply by starting your webserver and then starting the socket server by running the /server/server.py script. The chatroom's page will be /www/chat.php. 

Security
------------------------------------------
SSL: Theoretically, the underlying websockets library that the application uses supports SSL, but it has not been tested with the application at this time.


