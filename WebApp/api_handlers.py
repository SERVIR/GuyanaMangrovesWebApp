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

mount_point = data['ZIP_MOUNT_POINT']

def get_fire_tables(request):
    json_obj = {}

    try:
        conn = psycopg2.connect("dbname={0} user={1} host={2} password={3} port={4}".format(db, user, host, password, port))
        cur = conn.cursor()
        sql = """SELECT table_name from information_schema.tables where table_schema = 'fire_data' order by table_name desc;"""

        cur.execute(sql)
        data = cur.fetchall()
        result = []

        for table in data:
            table_name = table[0]
            search_string = "(fires?(?P<year>\\d{4})(?P<month>\\d{2})(?P<day>\\d{2}))"
            match = re.search(search_string, table_name)
            year = match.group('year')
            month = match.group('month')
            day = match.group('day')
            feature_json = {
                "table_name": table_name,
                "year": year,
                "month": month,
                "day": day
            }
            result.append(feature_json)

        conn.close()

        json_obj["data"] = result

        return JsonResponse(json_obj)
    except Exception as e:
        print('get_schemas' + e);
        result = []
        json_obj["data"] = result

        return JsonResponse(json_obj)


def get_fire_events(request):
    json_obj = {}

    fire_table = request.POST.get("fire_table")

    try:
        conn = psycopg2.connect("dbname={0} user={1} host={2} password={3} port={4}".format(db, user, host, password, port))
        cur = conn.cursor()

        sql = """SELECT fires.cluster_id, fires.fire_type, fires.confidence, fires.deforestat, fires.tree_cover, fires.biomass, fires.frp, fires.fire_count, fires.size, fires.persistenc, fires.progressio, fires.biome, fires.country, fires.state, fires.protected, fires.start_doy, fires.last_doy, fires.is_new, fires.is_active, ST_AsGeoJSON(fires.geom)
                 FROM fire_data.{table} fires
                 WHERE ST_Intersects(ST_MakeEnvelope(-90,-60,-30,10,4326), fires.geom);""".format(table=fire_table)

        cur.execute(sql)
        data = cur.fetchall()
        result = []

        for feature in data:
            feature_json = {
                "type": "Feature",
                "properties": {
                    "cluster_id": feature[0],
                    "fire_type": feature[1],
                    "confidence": feature[2],
                    "deforestation": feature[3],
                    "tree_cover": feature[4],
                    "biomass": feature[5],
                    "frp": feature[6],
                    "fire_count": feature[7],
                    "size": feature[8],
                    "persistence": feature[9],
                    "progression": feature[10],
                    "biome": feature[11],
                    "country": feature[12],
                    "state": feature[13],
                    "protected": feature[14],
                    "start_doy": feature[15],
                    "end_doy": feature[16],
                    "is_new": feature[17],
                    "is_active": feature[18]
                },
                "geometry": json.loads(feature[19])
            }
            result.append(feature_json)

        conn.close()

        json_obj["data"] = result

        return JsonResponse(json_obj)

    except Exception as e:
        print('get_schemas' + e);
        result = []
        json_obj["data"] = result

        return JsonResponse(json_obj)


def get_daily_totals_by_type(cur, type, start, end, fire_table, country, state):
    state_str = "" if state == 0 else "and state = '{}'".format(state)
    country_str = "" if country == 0 else "and country = '{}'".format(country)
    sql = """WITH date_range AS (
      SELECT generate_series({start}, {end}) AS day
    )
    SELECT array_agg(events_count ORDER BY day) AS total_events_by_day
    FROM (
      SELECT day, COUNT(*) AS events_count
      FROM date_range
      LEFT JOIN fire_data.{table} ON day BETWEEN start_doy AND last_doy and fire_type = '{type}'{state}{country}
      GROUP BY day
    ) AS subquery;""".format(table=fire_table, start=start, end=end, type=type, state=state_str, country=country_str)

    cur.execute(sql)
    data = cur.fetchall()
    result = data[0]

    return result


def get_fire_events_chart(request):
    json_obj = {}

    fire_table = request.POST.get("fire_table")
    start_doy = int(request.POST.get("start_doy"))
    end_doy = int(request.POST.get("end_doy"))
    year = int(request.POST.get("year"))
    state = int(request.POST.get("state"))
    country = int(request.POST.get("country"))

    result = {}

    date_list = []
    start_date = datetime.datetime(year, 1, 1) + datetime.timedelta(start_doy - 1)
    end_date = datetime.datetime(year, 1, 1) + datetime.timedelta(end_doy - 1)

    while start_date <= end_date:
        formatted_date = start_date.strftime("%b %d")
        date_list.append(formatted_date)
        start_date += datetime.timedelta(days=1)

    result['dates'] = date_list

    try:
        conn = psycopg2.connect("dbname={0} user={1} host={2} password={3} port={4}".format(db, user, host, password, port))
        cur = conn.cursor()

        result['savannah'] = get_daily_totals_by_type(cur, 1, start_doy, end_doy, fire_table, country, state)
        result['agriculture'] = get_daily_totals_by_type(cur, 2, start_doy, end_doy, fire_table, country, state)
        result['understory'] = get_daily_totals_by_type(cur, 3, start_doy, end_doy, fire_table, country, state)
        result['deforestation'] = get_daily_totals_by_type(cur, 4, start_doy, end_doy, fire_table, country, state)

        conn.close()

        json_obj["data"] = result

        return JsonResponse(json_obj)

    except Exception as e:
        print('get_schemas' + e);
        result = []
        json_obj["data"] = result

        return JsonResponse(json_obj)


def modify_state(elem):
    state = elem[0]
    number = elem[1]
    country = elem[2]
    return state.decode('UTF-8').lower().title(), number, country.decode('UTF-8').lower().capitalize()


@csrf_exempt
def get_states(request):
    json_obj = {}
    states = [(b'ROND\xc3\x94NIA', 1, b'Brazil'), (b'ACRE', 2, b'Brazil'), (b'AMAZONAS', 3, b'Brazil'),
              (b'RORAIMA', 4, b'Brazil'), (b'PAR\xc3\x81', 5, b'Brazil'), (b'AMAP\xc3\x81', 6, b'Brazil'),
              (b'TOCANTINS', 7, b'Brazil'), (b'MARANH\xc3\x83O', 8, b'Brazil'), (b'PIAU\xc3\x8d', 9, b'Brazil'),
              (b'CEAR\xc3\x81', 10, b'Brazil'), (b'RIO GRANDE DO NORTE', 11, b'Brazil'),
              (b'PARA\xc3\x8dBA', 12, b'Brazil'), (b'PERNAMBUCO', 13, b'Brazil'), (b'ALAGOAS', 14, b'Brazil'),
              (b'SERGIPE', 15, b'Brazil'), (b'BAHIA', 16, b'Brazil'), (b'MINAS GERAIS', 17, b'Brazil'),
              (b'ESP\xc3\x8dRITO SANTO', 18, b'Brazil'), (b'RIO DE JANEIRO', 19, b'Brazil'),
              (b'S\xc3\x83O PAULO', 20, b'Brazil'), (b'PARAN\xc3\x81', 21, b'Brazil'),
              (b'SANTA CATARINA', 22, b'Brazil'), (b'MATO GROSSO DO SUL', 23, b'Brazil'),
              (b'MATO GROSSO', 24, b'Brazil'), (b'GOI\xc3\x81S', 25, b'Brazil'), (b'DISTRITO FEDERAL', 26, b'Brazil'),
              (b'RIO GRANDE DO SUL', 27, b'Brazil'), (b'Amazonas', 28, b'Peru'), (b'Ancash', 29, b'Peru'),
              (b'Apurimac', 30, b'Peru'), (b'Arequipa', 31, b'Peru'), (b'Ayacucho', 32, b'Peru'),
              (b'Cajamarca', 33, b'Peru'), (b'Callao', 34, b'Peru'), (b'Cusco', 35, b'Peru'),
              (b'Huancavelica', 36, b'Peru'), (b'Huanuco', 37, b'Peru'), (b'Ica', 38, b'Peru'), (b'Junin', 39, b'Peru'),
              (b'La Libertad', 40, b'Peru'), (b'Lambayeque', 41, b'Peru'), (b'Lima', 42, b'Peru'),
              (b'Loreto', 43, b'Peru'), (b'Madre de Dios', 44, b'Peru'), (b'Moquegua', 45, b'Peru'),
              (b'Pasco', 46, b'Peru'), (b'Piura', 47, b'Peru'), (b'Puno', 48, b'Peru'), (b'San Martin', 49, b'Peru'),
              (b'Tacna', 50, b'Peru'), (b'Tumbes', 51, b'Peru'), (b'Ucayali', 52, b'Peru'), (b'Beni', 53, b'Bolivia'),
              (b'Chuquisaca', 54, b'Bolivia'), (b'Cochabamba', 55, b'Bolivia'), (b'La Paz', 56, b'Bolivia'),
              (b'Oruro', 57, b'Bolivia'), (b'Pando', 58, b'Bolivia'), (b'Potos\xc3\xad', 59, b'Bolivia'),
              (b'Santa Cruz', 60, b'Bolivia'), (b'Tarija', 61, b'Bolivia')]
    states = list(map(modify_state, states))

    json_obj["data"] = states

    return JsonResponse(json_obj)


def modify_country(elem):
    country = elem[0]
    number = elem[1]
    return country.decode('UTF-8').lower().title(), number


def get_countries(request):
    json_obj = {}
    countries = [(b'Brazil', 76), (b'Paraguay', 600), (b'Bolivia', 68), (b'Peru', 604), (b'Ecuador', 218),
                 (b'Colombia', 170), (b'Venezuela', 862), (b'Guyana', 328), (b'Suriname', 740), (b'French Guiana', 254)]
    countries = list(map(modify_country, countries))

    json_obj["data"] = countries

    return JsonResponse(json_obj)


def get_fire_events_zip(request):
    json_obj = {}
    try:
        run_year = request.POST.get("run_year", request.GET.get("run_year", None))
        run_day = request.POST.get("run_day", request.GET.get("run_day", None))
        run_month = request.POST.get("run_month", request.GET.get("run_month", None))
        expected_file_location = ""
        expected_file_name = ""
        try:
            expected_file_name = "fire_events_{}_{}_{}.zip".format(run_year, run_month, run_day)
            expected_file_location = os.path.join(mount_point, expected_file_name)
            does_file_exist = os.path.exists(expected_file_location)
            print(does_file_exist)

        except IOError:
            does_file_exist = False

        if does_file_exist:
            the_file_to_send = open(expected_file_location, 'rb')
            response = HttpResponse(the_file_to_send, content_type='application/zip')
            response['Content-Disposition'] = 'attachment; filename=' + str(
                expected_file_name)
            return response
        else:
            # File did not exist
            json_obj["data"] = json.dumps(
                "File does not exist on server.  There was an error generating this file during the server job")

            return JsonResponse(json_obj)

    except Exception as e:
        print(e)
        # File did not exist
        json_obj["data"] = json.dumps(
            "There was an error generating this file during the server job")

        return JsonResponse(json_obj)
