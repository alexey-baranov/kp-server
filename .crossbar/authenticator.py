import os
from pprint import pprint

import six

from twisted.internet.defer import inlineCallbacks

from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

import psycopg2
import os
import json

CFG_FILENAME='../cfg/config.json'

class AuthenticatorSession(ApplicationSession):

   @inlineCallbacks
   def onJoin(self, details):

      def authenticate(realm, authid, details):
         ticket = details['ticket']
         print("WAMP-Ticket dynamic authenticator invoked: realm='{}', authid='{}', ticket='{}'".format(realm, authid, ticket))
         pprint(details)

         db_conn = None
         conf_name = os.environ.get('NODE_ENV', 'development')
         if not os.path.exists(CFG_FILENAME):
             raise Exception('File config not found')
         data = open(CFG_FILENAME, 'r').read()
         params = json.loads(data).get(conf_name)
         if params is None:
             raise Exception('Config section %s not found' % conf_name)
         try:
             db_conn = psycopg2.connect(
                 host=params.get('host'),
                 database=params.get('database'),
                 user=params.get('username'),
                 password=params.get('password')
             )
         except:
             raise Exception('Database connection error')

         cursor = db_conn.cursor()
         cursor.execute('SELECT * FROM "Kopnik" WHERE email=\'%s\' and password=\'%s\';' % (authid, ticket))
         rowcount = cursor.rowcount
         db_conn.commit()
         if rowcount == 0:
             raise ApplicationError("com.example.no_such_user", "could not authenticate session - no such principal {}".format(authid))
         return 'kopnik'

      try:
         yield self.register(authenticate, 'com.example.authenticate')
         print("WAMP-Ticket dynamic authenticator registered!")
      except Exception as e:
         print("Failed to register dynamic authenticator: {0}".format(e))