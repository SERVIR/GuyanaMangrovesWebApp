import time
import json
import psycopg2
import os
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pathlib import Path


class Watcher:
    # Set the directory on watch

    BASE_DIR = Path(__file__).resolve().parent
    f = open(str(BASE_DIR) + '/data.json', )  # Get the data from the data.json file
    data = json.load(f)


    dir_to_monitor = data['ZIP_MOUNT_POINT']

    def __init__(self):
        self.observer = Observer()

    def run(self):
        event_handler = Handler()
        self.observer.schedule(event_handler, self.dir_to_monitor, recursive=True)
        self.observer.start()
        try:
            while True:
                time.sleep(10000)
        except:
            self.observer.stop()
            print("Observer Stopped")
        self.observer.join()


class Handler(FileSystemEventHandler):

    @staticmethod
    def on_any_event(event):
        BASE_DIR = Path(__file__).resolve().parent
        f = open(str(BASE_DIR) + '/data.json', )  # Get the data from the data.json file
        data = json.load(f)

        db = data['DB']
        user = data['USER']
        host = data['HOST']
        password = data['PASS']
        port = data['PORT']

        if event.is_directory:
            return None

        elif event.event_type == 'created':
            # Event is created, you can process it now
            print("Watchdog received created event - % s." % event.src_path)
            print("Connecting to database")
            fire_table = event.src_path.split('/')[-1][:-4]
            print("Fire table is %s" % fire_table)
            conn = psycopg2.connect(
                "dbname={0} user={1} host={2} password={3} port={4}".format(db, user, host, password, port))
            cur = conn.cursor()

            sql = """SELECT fires.cluster_id, fires.fire_type, fires.confidence, fires.deforestat, fires.tree_cover, fires.biomass, fires.frp, fires.fire_count, fires.size, fires.persistenc, fires.progressio, fires.biome, fires.country, fires.state, fires.protected, fires.start_doy, fires.last_doy, fires.is_new, fires.is_active, ST_AsGeoJSON(fires.geom)
                             FROM fire_data.{table} fires
                             WHERE ST_Intersects(ST_MakeEnvelope(-90,-60,-30,10,4326), fires.geom)""".format(
                table=fire_table)

            cur.execute(sql)

            data = cur.fetchall()
            result = []

            for feature in data:
                feature_json = {
                    "type": "Feature",
                    "properties": {
                        "cluster_id": feature[0],
                        "fire_type": str(int(feature[1])),
                        "confidence": int(feature[2]),
                        "deforestation": feature[3],
                        "tree_cover": feature[4],
                        "biomass": feature[5],
                        "frp": feature[6],
                        "fire_count": int(feature[7]),
                        "size": feature[8],
                        "persistence": feature[9],
                        "progression": feature[10],
                        "biome": int(feature[11]),
                        "country": int(feature[12]),
                        "state": int(feature[13]),
                        "protected": int(feature[14]),
                        "start_doy": int(feature[15]),
                        "end_doy": int(feature[16]),
                        "is_new": int(feature[17]),
                        "is_active": int(feature[18])
                    },
                    "geometry": json.loads(feature[19])
                }
                result.append(feature_json)
            conn.close()

            js_filename = fire_table + '.js'

            with open(os.path.join(BASE_DIR, 'WebApp/static/js/', js_filename), 'a') as out:
                out.write('fire_data = ')
                out.write(str(result).replace('\'','\"'))

            command = ["python", "manage.py", "collectstatic", "--noinput"]
            subprocess.run(command, capture_output=True)


if __name__ == '__main__':
    watch = Watcher()
    watch.run()