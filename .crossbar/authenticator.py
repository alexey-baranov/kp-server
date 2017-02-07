import os
from pprint import pprint

import six

from twisted.internet.defer import inlineCallbacks

from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

try:
    import psycopg2
except ImportError:
    from psycopg2cffi import compat, connect
    compat.register()
import bcrypt
import os
import json
import sys


CFG_FILENAME='../cfg/config.json'

class AuthenticatorSession(ApplicationSession):

    @inlineCallbacks
    def onJoin(self, details):

        def authenticate(realm, authid, details):
            try:
                ticket = details['ticket']
                print("authenticating: realm='{}', authid='{}', ticket='{}'".format(realm, authid, ticket))

                db_conn = None
                conf_name = os.environ.get('NODE_ENV', 'development')
                if not os.path.exists(CFG_FILENAME):
                    raise Exception('Config file not found')
                data = open(CFG_FILENAME, 'r').read()
                params = json.loads(data).get(conf_name)
                if params is None:
                    raise Exception('Config section %s not found' % conf_name)
                db_conn = connect(
                    host=params.get('host'),
                    database=params.get('database'),
                    user=params.get('username'),
                    password=params.get('password')
                )

                cursor = db_conn.cursor()
                #cursor.execute('SELECT password FROM public."Kopnik" WHERE email=\'%(authid)s\' '  % {'authid':authid})
                cursor.execute("SELECT password FROM public.\"Kopnik\" WHERE email= %s", [authid])

                rowcount = cursor.rowcount
                db_conn.commit()

                # юзвера нет в бд
                if rowcount == 0:
                    if authid == params.get("server").get("username") and ticket == params.get("server").get("password"):
                        print('Authentication successfull')
                        return u'server'
                    raise ApplicationError("org.kopnik.incorrect_username_or_password", "Incorrect username or password {}".format(authid))
                for item in cursor.fetchall():
                    if bcrypt.hashpw(bytes(ticket), item[0]) == item[0]:
                        print('Authentication successfull')
                        return u'kopnik'
                raise ApplicationError("org.kopnik.incorrect_username_or_password", "Incorrect username or password {}".format(authid))

            except Exception as e:
                print(e)
                raise e

        try:
            yield self.register(authenticate, 'org.kopnik.authenticate')
            print("WAMP-Ticket dynamic authenticator registered!")
        except Exception as e:
            print("Failed to register dynamic authenticator: {0}".format(e))
