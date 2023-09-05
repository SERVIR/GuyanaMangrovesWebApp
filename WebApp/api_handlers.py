import calendar
import json
import os
import warnings
import re
import datetime
from pathlib import Path
from django.http import HttpResponse

import numpy as np
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import psycopg2
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
f = open(str(BASE_DIR) + '/data.json', )  # Get the data from the data.json file
data = json.load(f)

db = data['DB']
user = data['USER']
host = data['HOST']
password = data['PASS']
port = data['PORT']

def layer_name_to_metadata(layer_name):
    return_obj = {
        'year': layer_name
    }
    return return_obj

@csrf_exempt
def get_mangrove_layer(request):
    json_obj = {}

    mangrove_table = request.POST.get("layer")
    mangrove_schema = request.POST.get("schema")

    try:
        conn = psycopg2.connect("dbname={0} user={1} host={2} password={3} port={4}".format(db, user, host, password, port))
        cur = conn.cursor()

        extra_column = ""
        if mangrove_schema == 'impact':
            extra_column = ", impact_ext"
        if mangrove_schema == 'change':
            extra_column = ", status"
        sql = """(SELECT * FROM information_schema.tables
                  WHERE table_schema = '{schema}' AND table_name = '{table}')""".format(schema=mangrove_schema, table=mangrove_table)

        cur.execute(sql)
        data = cur.fetchall()
        if len(data) == 0:
            conn.close()
            json_obj["data"] = []
            return JsonResponse(json_obj)

        sql = """SELECT gid, reg_name, reg_num, year, area, ST_AsGeoJSON(geom){extra_column}
                FROM {schema}.\"{table}\";""".format(schema=mangrove_schema, table=mangrove_table, extra_column=extra_column)

        cur.execute(sql)

        data = cur.fetchall()
        result = []

        for feature in data:
            feature_json = {
                "type": "Feature",
                "properties": {
                    "gid": feature[0],
                    "reg_name": feature[1],
                    "reg_num": feature[2],
                    "year": feature[3],
                    "area": feature[4],
                },
                "geometry": json.loads(feature[5])
            }
            if mangrove_schema == 'impact':
                feature_json['properties']['impact_ext'] = feature[6]
            if mangrove_schema == 'change':
                feature_json['properties']['status'] = feature[6]
            result.append(feature_json)
        conn.close()

        json_obj["data"] = result

        return JsonResponse(json_obj)

    except Exception as e:
        print('get_schemas' + e);
        result = []
        json_obj["data"] = result

        return JsonResponse(json_obj)


def get_available_years(request):
    json_obj = {}

    try:
        conn = psycopg2.connect(
            "dbname={0} user={1} host={2} password={3} port={4}".format(db, user, host, password, port))
        cur = conn.cursor()
        sql = """SELECT table_name from information_schema.tables where table_schema = '{mangrove_schema}' order by 
                     table_name desc;""".format(mangrove_schema="extent")

        cur.execute(sql)
        data = cur.fetchall()
        result = []

        for layer in data:
            layer_name = layer[0]
            result.append(layer_name)

        conn.close()

        json_obj["data"] = result

        return JsonResponse(json_obj)
    except Exception as e:
        print('get_schemas' + e);
        result = []
        json_obj["data"] = result

        return JsonResponse(json_obj)

