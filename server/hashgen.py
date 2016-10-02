# Part of LibreWebChat
# Copyright (c) 2016, Zane Sims
# License details in 'license.txt'
#
# Generates a random string of 64 hex digits

from random import SystemRandom
rand = SystemRandom()
salt = hex(rand.getrandbits(256))[2:]
print('Random salt: ' + salt)
