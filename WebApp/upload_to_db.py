import os
import psycopg2
import json
import os
import glob
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = os.path.join(Path(__file__).resolve().parent, 'mangrove_data')

def upload_to_db(schema_name, table_name, shapefile, create):
    f = open(str(BASE_DIR) + '/data.json', )  # Get the data from the data.json file
    config = json.load(f)
    sql_filename = "upload_{}_to_db.sql".format(table_name)

    flag = "a"

    if(create):
        flag = "c"

    os.system("shp2pgsql -s 4326 -{} {} {}.{} > {}".format(flag, shapefile, schema_name, table_name, sql_filename))

    db = config['DB']
    user = config['USER']
    host = config['HOST']
    port = config['PORT']
    password = config['PASS']

    conn = psycopg2.connect("dbname={0} user={1} host={2} password={3} port={4}".format(db, user, host, password, port))
    cur = conn.cursor()

    cur.execute(open(sql_filename, "r").read())
    os.remove(sql_filename)

def get_impact_data(directory):
  """Generates a list of tuples ('impact', year, region, location) for each file in the ImpactOfRestoration directory."""
  data = []
  for root, dirs, files in os.walk(os.path.join(DATA_DIR, directory)):
      for file in reversed(sorted(files, key=len)):
          file_path = os.path.join(root, file)
          if file.endswith(".shp"):
              year = file_path.split("/")[-2]
              data.append((
                  "impact",
                  "{year}".format(year=year),
                  file_path
              ))
  return data

def get_extent_data(directory):
  """Generates a list of tuples ('extent', year, region) for each file in the MangroveExtent directory."""
  data = []
  for root, dirs, files in os.walk(os.path.join(DATA_DIR, directory)):
      for file in files:
          file_path = os.path.join(root, file)
          if file.endswith(".shp"):
              year = file.split("_")[1].split(".")[0]
              data.append((
                  "extent",
                  "{year}".format(year=year),
                  file_path
              ))
  return data

def get_change_data(directory):
  """Generates a list of tuples ('change', year, region, 'loss' or 'gain') for each file in the ChangeAnalysis directory."""
  data = []

  for root, dirs, files in os.walk(os.path.join(DATA_DIR, directory)):
      for file in files:
          file_path = os.path.join(root, file)
          if file.endswith(".shp"):
              year = file_path.split("/")[-2]
              data.append((
                  "change",
                  "{year}".format(year=year),
                  file_path
              ))
  return data

def upload_granules(granule_list):
    years = []
    for granule in granule_list:
        year = granule[1]
        create = year not in years
        if create:
            years.append(year)
        upload_to_db(granule[0], granule[1], granule[2], create)

def upload_data_folders():
    impact_data = get_impact_data("ImpactOfRestoration")
    extent_data = get_extent_data("MangroveExtent")
    change_data = get_change_data("ChangeAnalysis")
    upload_granules(impact_data)
    upload_granules(extent_data)
    upload_granules(change_data)
