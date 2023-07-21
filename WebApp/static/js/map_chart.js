let map;
let fire_data;
let fire_data_layer;
let fire_tables;
let selected_fire_table;
let run_day;
let run_year;
let run_month;
let states_data;
let country_data;
let country_name_to_number = {};
let state_number_to_country_number = {};
let last_filters_loaded = {};
let db_array;
let selected_fire_data;

function check_if_any_changed() {
    let country_select = document.getElementById('selected_country').value;
    let state_select = document.getElementById('selected_state').value;
    let protected_area = document.getElementById("protected").checked;
    let biome = document.getElementById("biome").checked;
    let new_fire = document.getElementById("new").checked;
    let active_fire = document.getElementById("active").checked;
    let start_doy = document.getElementById('date_input_start').value;
    let end_doy = document.getElementById('date_input_end').value;
    let fire_type = document.getElementById('selected_fire_type').value;

    return (country_select !== last_filters_loaded['country'] ||
        state_select !== last_filters_loaded['state'] ||
        protected_area !== last_filters_loaded['protected'] ||
        new_fire !== last_filters_loaded['new'] ||
        biome !== last_filters_loaded['biome'] ||
        active_fire !== last_filters_loaded['active'] ||
        start_doy !== last_filters_loaded['start_doy'] ||
        end_doy !== last_filters_loaded['end_doy'] ||
        fire_type !== last_filters_loaded['fire_type']);
}

function toggle_apply() {
    let apply_elem = document.getElementById("apply");
    let is_disabled = !check_if_any_changed();
    apply_elem.disabled = is_disabled;
    apply_elem.classList.remove("btn-outline-secondary", "btn-primary");
    apply_elem.classList.add(is_disabled ? "btn-outline-secondary" : "btn-primary");
}

function is_active(feature) {
    return feature.properties.is_active == 1;
}

function in_biome(feature) {
    return feature.properties.biome == 1;
}

function is_new(feature) {
    return feature.properties.is_new == 1;
}

function is_protected(feature) {
    return feature.properties.protected == 1;
}

function update_active_fires() {
    let active_fire_count = fire_data.filter(is_active).length;
    document.getElementById('active-fire-count').innerHTML = active_fire_count.toString();
}

function update_new_fires() {
    let new_fire_count = fire_data.filter(is_new).length;
    document.getElementById('new-fire-count').innerHTML = new_fire_count.toString();
}

function get_type_class(fire_type) {
    switch (fire_type) {
        case '1':
            return 'savannah_label';
        case '2':
            return 'agri_label';
        case '3':
            return 'understory_label';
        case '4':
            return 'deforest_label';
        default:
            return 'empty';
    }
}

function get_type_text(feature) {
    switch (feature.properties.fire_type) {
        case '1':
            return 'Savanna and Grassland';
        case '2':
            return 'Small Clearing and Agriculture';
        case '3':
            return 'Understory';
        case '4':
            return 'Deforestation';
        default:
            return 'empty';
    }
}


function center_map_on_feature(feature) {
    let centroid = turf.centroid(feature);
    let lon = centroid.geometry.coordinates[0];
    let lat = centroid.geometry.coordinates[1];
    map.setView([lat, lon], 13);
}


function get_checkbox(bool_value) {
    if (bool_value) {
        return '<input type="checkbox" disabled=true checked>';
    }
    return '<input type="checkbox" disabled=true>';
}

function data_to_feature(data) {
    return {type: "Feature", properties: data, geometry: data['geometry']};
}

function update_fire_database_table() {
    let fire_database_datatable = new DataTable('#fire-database-table', {
        destroy: true,
        lengthChange: false,
        data: db_array,
        deferRender: true,
        columns: [
            {data: 'fire_type', title: 'F'},
            {data: 'confidence', title: 'C'},
            {data: 'is_new', title: 'N'},
            {data: 'is_active', title: 'CA'},
            {data: 'biome', title: 'AB'},
            {data: 'protected', title: 'P'},
            {data: 'start_doy', title: 'FD'},
            {data: 'end_doy', title: 'LD'},
            {data: 'size', title: 'S'},
            {data: 'progression', title: 'Prog'},
            {data: 'fire_count', title: '#'},
            {data: 'frp', title: 'FRP'},
            {data: 'persistence', title: 'Pers'},
            {data: 'biomass', title: 'BM'},
            {data: 'tree_cover', title: 'TC'},
            {data: 'deforestation', title: 'D'},
        ],
        dom: 'lrti',
        scrollCollapse: true,
        scroller: true,
        scrollX: true,
        scrollY: $("#fire-database").height() - 125,
        order: [[1, 'desc']],
        columnDefs: [{
            "targets": 0,
            "render": function (data, type, row) {
                return '<div class=' + get_type_class(row['fire_type']) + '></div>';
            },
        }, {
            "targets": 2,
            "render": function (data, type, row) {
                return get_checkbox(is_new(data_to_feature(row)));
            }
        }, {
            "targets": 3,
            "render": function (data, type, row) {
                return get_checkbox(is_active(data_to_feature(row)));
            }
        }, {
            "targets": 4,
            "render": function (data, type, row) {
                return get_checkbox(in_biome(data_to_feature(row)));
            }
        }, {
            "targets": 5,
            "render": function (data, type, row) {
                return get_checkbox(is_protected(data_to_feature(row)));
            }
        }, {
            "targets": 6,
            "render": function (data, type, row) {
                let date = new Date(run_year, 0, row['start_doy']);
                return `${date.toISOString().substring(5,10)}`;
            }
        }, {
            "targets": 7,
            "render": function (data, type, row) {
                let date = new Date(run_year, 0, row['end_doy']);
                return `${date.toISOString().substring(5,10)}`;
            }
        }]
    });

    fire_database_datatable.on('click', 'tr', function (e) {
        let data = fire_database_datatable.row(e.target.closest('tr')).data();

        center_map_on_feature(data_to_feature(data));
    });
}


function update_largest_fires() {
    let fires_datatable = new DataTable('#fires-table', {
        destroy: true,
        lengthChange: false,
        data: db_array,
        deferRender: true,
        columns: [
            {data: 'fire_type', title: 'Type'},
            {data: 'size', title: 'Size'},
            {data: 'start_doy', title: 'Start Date'}
        ],
        dom: 'lrti',
        scrollCollapse: true,
        scroller: true,
        scrollY: $("#fire-alerts").height() * 40 / 100,
        order: [[1, 'desc']],
        columnDefs: [{
            "targets": 0,
            "render": function (data, type, row) {
                return '<div class=' + get_type_class(row['fire_type']) + '></div>';
            },
        }, {
            "targets": 2,
            "render": function (data, type, row) {
                let date = new Date(run_year, 0, row['start_doy']);
                return `${date.toDateString()}`;
            }
        }]
    });

    fires_datatable.on('click', 'tr', function (e) {
        let data = fires_datatable.row(e.target.closest('tr')).data();

        center_map_on_feature(data_to_feature(data));
    });
}


function update_protected_area_alert() {
    protected_datatable = new DataTable('#protected-table', {
        destroy: true,
        lengthChange: false,
        data: db_array,
        deferRender: true,
        columns: [
            {data: 'fire_type', title: 'Type'},
            {data: 'size', title: 'Size'},
            {data: 'start_doy', title: 'Start Date'}
        ],
        dom: 'lrti',
        scrollCollapse: true,
        scroller: true,
        scrollY: $("#fire-alerts").height() * 40 / 100,
        order: [[1, 'desc']],
        columnDefs: [{
            "targets": 0,
            "render": function (data, type, row) {
                return '<div class=' + get_type_class(row['fire_type']) + '></div>';
            },
        }, {
            "targets": 2,
            "render": function (data, type, row) {
                let date = new Date(run_year, 0, row['start_doy']);
                return `${date.toDateString()}`;
            }
        }]
    });

    protected_datatable.on('click', 'tr', function (e) {
        let data = protected_datatable.row(e.target.closest('tr')).data();

        center_map_on_feature(data_to_feature(data));
    });
}

function update_chart() {
    let daily_sav_count = [];
    let daily_agri_count = [];
    let daily_under_count = [];
    let daily_def_count = [];
    let dates = [];
    let state = document.getElementById('selected_state').value
    let country = document.getElementById('selected_country').value
    let context = {
        "start_doy": document.getElementById('date_input_start').value.replace(/-/g, '\/'),
        "end_doy": document.getElementById('date_input_end').value.replace(/-/g, '\/'),
        "year": run_year,
        "fire_table": selected_fire_table,
        "state": state,
        "country": country
    };

    let xhr = ajax_call("get-fire-events-chart", context);
    xhr.done(function (result) {
        let chart_data = result['data']
        daily_sav_count = chart_data['savannah'][0];
        daily_agri_count = chart_data['agriculture'][0];
        daily_under_count = chart_data['understory'][0];
        daily_def_count = chart_data['deforestation'][0];
        dates = chart_data['dates']

        Highcharts.chart('chart', {
            chart: {
                type: 'column'
            },
            title: {
                text: undefined,
                align: 'left',
                style: {
                    color: 'gray',
                    fontWeight: 'normal'
                }
            },
            xAxis: {
                categories: dates,
                labels: {
                    step: Math.round(dates.length / 10)
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Total Active Fires'
                },
            },
            tooltip: {
                headerFormat: '<b>{point.x}</b><br/>',
                pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
            },
            plotOptions: {
                column: {
                    stacking: 'normal'
                }
            },
            series: [{
                name: 'Savanna and Grassland',
                data: daily_sav_count,
                color: "#00c5ff"
            }, {
                name: 'Small Clearing and Agriculture',
                data: daily_agri_count,
                color: "#ffaa00"
            }, {
                name: 'Understory',
                data: daily_under_count,
                color: "#38a800"
            }, {
                name: 'Deforestation',
                data: daily_def_count,
                color: "#a80000"
            }]
        });

    });
}


function set_last_filters() {
    let country_select = document.getElementById('selected_country').value;
    let state_select = document.getElementById('selected_state').value;
    let protected_area = document.getElementById("protected").checked;
    let biome = document.getElementById("biome").checked;
    let new_fire = document.getElementById("new").checked;
    let active_fire = document.getElementById("active").checked;
    let start_doy = document.getElementById('date_input_start').value;
    let end_doy = document.getElementById('date_input_end').value;
    let fire_type = document.getElementById('selected_fire_type').value;

    last_filters_loaded['country'] = country_select;
    last_filters_loaded['state'] = state_select;
    last_filters_loaded['protected'] = protected_area;
    last_filters_loaded['active'] = active_fire;
    last_filters_loaded['start_doy'] = start_doy;
    last_filters_loaded['end_doy'] = end_doy;
    last_filters_loaded['fire_type'] = fire_type;
    last_filters_loaded['biome'] = biome;
    last_filters_loaded['new'] = new_fire;

    toggle_apply();
}

function click_zoom_to_feature(feature, layer) {
    layer.on('click', function (e) {
        center_map_on_feature(e.target.feature);
    })
}

function update_displayed_data() {
    let load_layer = document.getElementById('loader');
    document.getElementById("apply").disabled = true;
    document.getElementById("load_message").innerHTML = "Filtering Data";
    load_layer.style.display = 'flex';

    setTimeout(() => {
        if (fire_data_layer != undefined) {
            map.removeLayer(fire_data_layer);
        }

        document.getElementById('load_message').innerHTML = "Updating Statistics";

        update_active_fires();
        update_new_fires();
        update_largest_fires();
        update_protected_area_alert();

        document.getElementById('load_message').innerHTML = "Adding Layer to Map";

        fire_data_layer = L.geoJSON(fire_data, {
            style: function (feature) {
                switch (feature.properties.fire_type) {
                    case '1':
                        return {color: "#00c5ff"};
                    case '2':
                        return {color: "#ffaa00"};
                    case '3':
                        return {color: "#38a800"};
                    case '4':
                        return {color: "#a80000"};
                }
            },
            onEachFeature: click_zoom_to_feature
        }).bindTooltip(function (layer) {
            let is_active = layer.feature.properties.is_active;
            let is_new = layer.feature.properties.is_new;
            let size = layer.feature.properties.size;
            let protected_area = layer.feature.properties.protected;
            let start_doy = layer.feature.properties.start_doy;
            let end_doy = layer.feature.properties.end_doy;
            let confidence = layer.feature.properties.confidence;
            let deforestation = layer.feature.properties.deforestation;
            let tree_cover = layer.feature.properties.tree_cover;
            let biomass = layer.feature.properties.biomass;
            let frp = layer.feature.properties.frp;
            let fire_count = layer.feature.properties.fire_count;
            let persistence = layer.feature.properties.persistence;
            let progression = layer.feature.properties.progression;
            let biome = layer.feature.properties.biome;


            let tooltip = `<label>Fire Statistics</label><br><br>
                       Fire Type: ${get_type_text(layer.feature)} (Confidence: ${confidence})<br>
                       Size: ${size} sq km<br>
                       Average Intensity: ${frp} MW<br>
                       First Detection: ${(new Date(run_year, 0, start_doy)).toDateString()}<br>
                       Latest Detection: ${(new Date(run_year, 0, end_doy)).toDateString()}<br>
                       Number of Detections: ${fire_count}<br>
                       Average Persistence: ${persistence} days<br>
                       Average Progression: ${progression}<br>
                       <br><label>Status</label><br><br>
                       Active in Past 10 Days: ${is_active == 1 ? 'Yes' : 'No'}<br>
                       New Detection: ${is_new == 1 ? 'Yes' : 'No'}<br>
                       Intersects Protected Area: ${protected_area == 1 ? 'Yes' : 'No'}<br>
                       In Amazon Biome: ${biome == 1 ? 'Yes' : 'No'}<br>
                       <br><label>Perimeter Statistics</label><br><br>
                       Historic Deforestation Fraction: ${deforestation}<br>
                       Tree Cover: ${tree_cover}%<br>
                       Biomass: ${biomass} ton ha<sup>-1</sup>`
            return tooltip
        }, {
            className: "zTop"
        }).addTo(map);

        load_layer.style.display = 'none';
    }, 100);

    $('#slideOutTab').click();
}


function download_geojson() {
    let blob = new Blob([JSON.stringify(fire_data)], {type: "application/json"});
    saveAs(blob, `fire_events_${run_year}_${run_month}_${run_day}`);
}

function download_zip() {
    let a = document.getElementById('download_link');
    a.href = `/dashboard/get-fire-events-zip/?run_year=${run_year}&run_month=${run_month}&run_day=${run_day}`;
    a.click();
}

function get_batches() {
    let year = run_year;
    let month = run_month;
    let day = run_day;

    let current_date = new Date(year, month - 1, day);
    let day_of_year = Math.ceil((current_date - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;

    let stride = 30;
    let ranges = [];
    for (let i = 0; i < Math.floor(day_of_year / stride); i++) {
        const start_day = i * stride + 1;
        const end_day = (i + 1) * stride;
        ranges.push([start_day, end_day]);
    }

    if (day_of_year % stride !== 0) {
        ranges.push([Math.floor(day_of_year / stride) * stride + 1, day_of_year]);
    }
    return ranges;
}

function get_filter_states() {
    let active = document.getElementById('active').checked;
    let only_protected = document.getElementById('protected').checked;
    let biome = document.getElementById('biome').checked;
    let new_fire = document.getElementById('new').checked;
    let country = document.getElementById('selected_country').value;
    let state = document.getElementById('selected_state').value;
    let start_date = document.getElementById('date_input_start').value.replace(/-/g, '\/');
    let end_date = document.getElementById('date_input_end').value.replace(/-/g, '\/');
    let fire_type = document.getElementById('selected_fire_type').value
    let filter_object = {
        "active": active,
        "protected": only_protected,
        "biome": biome,
        "new_fire": new_fire,
        "country": country,
        "state": state,
        "start_date": start_date,
        "end_date": end_date,
        "fire_type": fire_type,
    };
    return filter_object;
}

function batch_to_xhr(batch) {
    let start_doy = batch[0];
    let end_doy = batch[1];
    let options = {
        "fire_table": selected_fire_table,
        "range_start": start_doy,
        "range_end": end_doy,
        ...(get_filter_states())
    }
    return ajax_call_with_progress("get-fire-events", options);
}

function extract_data(xhr_result) {
    return xhr_result[0]['data'];
}

function extract_properties(feature) {
    let obj = feature.properties;
    obj['geometry'] = feature.geometry;
    return obj;
}

function update_db_array() {
    db_array = fire_data.map(extract_properties);
    update_fire_database_table();
}

function set_fire_data() {
    let load_layer = document.getElementById('loader');

    document.getElementById('load_message').innerHTML = "Loading Fire Data";
    load_layer.style.display = 'flex';

    let batches = get_batches();
    let batches_xhr = batches.map(batch_to_xhr);
    $.when(...batches_xhr).then(function () {
        results = [...arguments]
        fire_data = results.map(extract_data).flat();

        update_db_array();
        update_displayed_data();
        update_chart();
    });

    set_last_filters();
}


function add_option_by_id(selector, value, label) {
    let opt = document.createElement('option');
    opt.value = value;
    opt.innerHTML = label;
    selector.appendChild(opt);
}


function set_start_date() {
    let select = document.getElementById('date_input_start');
    let start_month = (1 < run_month - 2) ? run_month - 3 : 0;
    let date = new Date(run_year, start_month)
    select.value = `${date.toISOString().substring(0, 10)}`
}


function set_end_date() {
    let select = document.getElementById('date_input_end');
    let date = new Date(run_year, run_month - 1, run_day);
    select.value = `${date.toISOString().substring(0, 10)}`
}


function clear_selector(id) {
    let selector = document.getElementById(id)
    for (let i = selector.options.length - 1; i >= 0; i--) {

        if (selector.options[i].value != 0) {
            selector.remove(i);
        }
    }
}


function clear_table(id) {
    let selector = document.getElementById(id);
    for (let i = 1; i <= selector.rows.length; i++) {
        selector.deleteRow(1);
    }
}


function fill_states_selector() {
    let state_select = document.getElementById('selected_state');
    let country_select = document.getElementById('selected_country');
    clear_selector('selected_state');
    for (var i = 0; i < states_data.length; i++) {
        let cur_state = states_data[i][0];
        let cur_state_num = states_data[i][1];
        let cur_country = states_data[i][2];
        if (country_select.value == 0) {
            add_option_by_id(state_select, cur_state_num, cur_state + ', ' + cur_country);
        } else if (state_number_to_country_number[cur_state_num] == country_select.value) {
            add_option_by_id(state_select, cur_state_num, cur_state);
        }
    }
}


function state_selector_change() {
    let country_select = document.getElementById('selected_country');
    let state_select = document.getElementById('selected_state');
    let state_select_value = state_select.value
    if (state_select_value == 0) {
        return;
    }
    country_select.value = state_number_to_country_number[state_select_value];
    fill_states_selector()
    state_select.value = state_select_value;

    toggle_apply();
}


function set_states() {
    const xhr = ajax_call("get-states", {});
    xhr.done(function (result) {
        states_data = result['data'];
        for (let i = 0; i < states_data.length; i++) {
            state_number_to_country_number[states_data[i][1]] = country_name_to_number[states_data[i][2]]
        }
        fill_states_selector();
    });
}


function fill_countries_selector() {
    let select = document.getElementById('selected_country');
    for (let i = 0; i < country_data.length; i++) {
        let cur_country = country_data[i][0];
        let cur_country_num = country_data[i][1];
        add_option_by_id(select, cur_country_num, cur_country);
    }
}


function country_selector_change() {
    fill_states_selector();

    toggle_apply();
}


function set_countries() {
    const xhr = ajax_call("get-countries", {});
    xhr.done(function (result) {
        country_data = result['data'];
        for (let i = 0; i < country_data.length; i++) {
            country_name_to_number[country_data[i][0]] = country_data[i][1];
        }
        fill_countries_selector();
    });
}


function set_fire_tables() {
    const xhr = ajax_call("get-fire-tables", {});
    xhr.done(function (result) {
        fire_tables = result['data'];
        let first_table = fire_tables[0]
        selected_fire_table = first_table.table_name;
        let select = document.getElementById('run-date');
        run_day = first_table.day;
        run_month = first_table.month;
        run_year = first_table.year;
        add_option_by_id(select, selected_fire_table, selected_fire_table)
        for (var i = 1; i < fire_tables.length; i++) {
            let cur_table = fire_tables[i].table_name;
            add_option_by_id(select, cur_table, cur_table);
        }

        set_countries();
        set_states();

        set_start_date();
        set_end_date();

        set_fire_data();
    });
}


function initialize_dataTable() {
    $.fn.dataTable.ext.search.push(
        function (settings, searchData, index, rowData, counter) {
            if (settings.nTable.id === 'fire-database-table') {
                return true;
            }

            if (settings.nTable.id === 'fires-table') {
                let active_label = rowData['is_active'];
                if (active_label === "1") {
                    return true;
                }
                return false;
            }

            let protected_label = rowData['protected'];
            if (protected_label === 1) {
                return true;
            }

            return false;
        });
}


$(function () {
// Initialize with map control with basemap and time slider
    map = L.map('map_chart', {
        fullscreenControl: true, center: [-10, -62.2159], zoom: 4
    });

    map.zoomControl.setPosition('topleft');
    satellite.addTo(map);

    // Add the Search Control to the map
    map.addControl(new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
        showMarker: false, // optional: true|false  - default true
        showPopup: false,
        autoClose: true
    }));

    this.$slideOut = $('#slideOut');

    // Slideout show
    this.$slideOut.find('.slideOutTab').on('click', function () {
        const center = map.getCenter();
        const zoom = map.getZoom();
        $("#slideOut").toggleClass('showSlideOut');
        $("#map_chart").toggleClass('slideMap');

        map.invalidateSize();
        map.setView([center.lat, center.lng], zoom, {animation: true});

        map.zoomControl.setPosition('topleft');

    });


// when the checkbox for 'CHIRPS Layer' is clicked, show/hide the layer

// Remove all basemap layers from the map
    removeLayers = function () {
        satellite.remove();
        osm.remove();
        OpenTopoMap.remove();
        terrainLayer.remove();
        deLormeLayer.remove();
        gSatLayer.remove();
    };
// Add selected basemap layer to the map
    add_basemap = function (map_name) {
        removeLayers();
        switch (map_name) {
            case "osm":
                osm.addTo(map);
                break;
            case "delorme":
                deLormeLayer.addTo(map);
                break;
            case "satellite":
                satellite.addTo(map);
                break;
            case "terrain":
                terrainLayer.addTo(map);
                break;
            case "topo":
                OpenTopoMap.addTo(map);
                break;
            case "gsatellite":
                gSatLayer.addTo(map);
                break;
            case "darkgray":
                darkGrayLayer.addTo(map);
                break;
            default:
                osm.addTo(map);

        }
    };

    initialize_dataTable();

    set_fire_tables();
});
