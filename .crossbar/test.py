# -*- coding: utf-8 -*-
try:
    import psycopg2
except ImportError:
    from psycopg2cffi import compat
    compat.register()
import os
import json

CFG_FILENAME = '../cfg/config.json'
#CFG_FILENAME = 'config.json'


class Auth:

    def authenticate(realm, authid, details):
        ticket = details['ticket']
        db_conn = None
        #conf_name = os.environ.get('NODE_ENV', 'development')
        conf_name = os.environ.get('NODE_ENV', 'local-db')
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
            raise Exception('Authenticate fail')
        return 'kopnik'

A = Auth()
print(A.authenticate('unittest2@domain.ru', {'ticket':'qwerty'}))
