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
import requests


CFG_FILENAME='../cfg/config.json'

class AuthenticatorSession(ApplicationSession):

    @inlineCallbacks
    def onJoin(self, details):

        def authenticate(realm, authid, details):
            try:
                SEP = '...'
                captcha = ''
                captcha_url = 'https://www.google.com/recaptcha/api/siteverify'
                qs = {'secret': None, 'response':None}

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

                if authid == params.get("server").get("username") and ticket == params.get("server").get("password"):
                    print('Authentication successfull')

                    return u'server'

                captcha= json.loads(ticket).get("captchaResponse")
                ticket= json.loads(ticket).get("password")


                pprint('ticket = %s' % ticket)
                pprint('captcha = %s' % captcha)


                qs = {'secret': params.get('captcha').get('secret'), 'response': captcha}

                #у unittest2 капча не проверяется для того чтобы иметь возможность подключаться внутри юниттестов
                if not (authid == params.get('unittest2').get('username') and captcha is None):
                    r = requests.post(captcha_url, data=qs)
                    if r.status_code == requests.codes.ok:
                        json_resp = json.loads(r.text)
                        if not json_resp.get('success', False):
                            raise ApplicationError("org.kopnik.invalid_captcha", ', '.join(json_resp.get('error-codes', [])))
                    else:
                        raise ApplicationError("org.kopnik.invalid_captcha_status_code", "invalid captcha response code = {}".format(r.status_code))
                        #print('status=%d' % r.status_code)


                db_conn = connect(
                    host=params.get('host'),
                    database=params.get('database'),
                    user=params.get('username'),
                    password=params.get('password')
                )

                cursor = db_conn.cursor()
                cursor.execute("SELECT k.password, k.rolee , k.id, k.email, k.name FROM public.\"Kopnik\" as k WHERE k.email= %s", [authid])

                rowcount = cursor.rowcount

                # юзвера нет в бд
                if rowcount == 0:
                    raise ApplicationError("org.kopnik.incorrect_username_or_password", "Incorrect username or password {}".format(authid))

                for item in cursor.fetchall():
                    if bcrypt.hashpw(bytes(ticket), item[0]) == item[0]:
                        print('Authentication successfull')
                        db_conn.close()
                        return unicode(item[1])
                        #return u'kopnik'

                raise ApplicationError("org.kopnik.incorrect_username_or_password", "Incorrect username or password {}".format(authid))


            except Exception as e:
                if not db_conn is None:
                    db_conn.close()
                print(e)
                raise e

        try:
            yield self.register(authenticate, 'org.kopnik.authenticate')
            print("WAMP-Ticket dynamic authenticator registered!")
        except Exception as e:
            print("Failed to register dynamic authenticator: {0}".format(e))
