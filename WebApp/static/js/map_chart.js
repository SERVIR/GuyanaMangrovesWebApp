let map;
let primary_extent_layer;
let primary_gain_layer;
let primary_loss_layer;
let primary_impact_layer;
let comparison_extent_layer;
let comparison_gain_layer;
let comparison_loss_layer;
let comparison_impact_layer;
let comparison_control;


function add_option_by_id(selector, value, label) {
    let opt = document.createElement('option');
    opt.value = value;
    opt.innerHTML = label;
    selector.appendChild(opt);
}


function fill_years_selector(years) {
    let select = document.getElementById('selected_year');
    select.innerHTML = "";
    for (let i = 0; i < years.length; i++) {
        let year = years[i];
        add_option_by_id(select, year, year);
    }
}


function fill_comparison_years_selector(years) {
    let select = document.getElementById('comparison_year');
    for (let i = 0; i < years.length; i++) {
        let year = years[i];
        add_option_by_id(select, year, year);
    }
}


function clear_map_layers(){
    if(primary_extent_layer != undefined){
        map.removeLayer(primary_extent_layer);
    }
    if(primary_impact_layer != undefined){
        map.removeLayer(primary_impact_layer);
    }
    if(primary_gain_layer != undefined){
        map.removeLayer(primary_gain_layer);
    }
    if(primary_loss_layer != undefined){
        map.removeLayer(primary_loss_layer);
    }
    if(comparison_extent_layer != undefined){
        map.removeLayer(comparison_extent_layer);
    }
    if(comparison_impact_layer != undefined){
        map.removeLayer(comparison_impact_layer);
    }
    if(comparison_gain_layer != undefined){
        map.removeLayer(comparison_gain_layer);
    }
    if(comparison_loss_layer != undefined){
        map.removeLayer(comparison_loss_layer);
    }
    if(comparison_control != undefined){
        document.getElementsByClassName('leaflet-sbs-range')[0].value = 1;
        let clipX = comparison_control._range.value;
        map.removeControl(comparison_control);
        comparison_control = undefined;
        let nw = map.containerPointToLayerPoint([0, 0]);
        let se = map.containerPointToLayerPoint(map.getSize());
        let clipLeft = 'rect(' + [nw.y, clipX, se.y, nw.x].join('px,') + 'px)';
        map.getPane('left').setAttribute('style', clipLeft);
    }
}


function filter_regions(feature){
    let selected_region = document.getElementById('selected_region').value;
    if(selected_region == 0){
        return true;
    }
    else{
        return selected_region == feature.properties.reg_num;
    }
}


function filter_gain(feature){
    return 'Gain' == feature.properties.status;
}


function filter_loss(feature){
    return 'Loss' == feature.properties.status;
}


function toggle_extent(){
    let add = document.getElementById('extent-selector').checked;
    primary_extent_layer.remove();
    let compare = document.getElementById('comparison_year').value;
    if(compare != 0){
        comparison_extent_layer.remove();
    }
    if(add){
        primary_extent_layer.addTo(map);
        let compare = document.getElementById('comparison_year').value;
        if(compare != 0){
            comparison_extent_layer.addTo(map);
        }
    }
    toggle_change();
}


function toggle_change(){
    let add = document.getElementById('change-selector').checked;
    primary_gain_layer.remove();
    primary_loss_layer.remove();
    let compare = document.getElementById('comparison_year').value;
    if(compare != 0) {
        comparison_gain_layer.remove();
        comparison_loss_layer.remove();
    }
    if(add){
        primary_gain_layer.addTo(map);
        primary_loss_layer.addTo(map);
        let compare = document.getElementById('comparison_year').value;
        if(compare != 0){
            comparison_gain_layer.addTo(map);
            comparison_loss_layer.addTo(map);
        }
    }
    toggle_impact();
}


function toggle_impact(){
    let add = document.getElementById('impact-selector').checked;
    primary_impact_layer.remove();
    let compare = document.getElementById('comparison_year').value;
    if(compare != 0) {
        comparison_impact_layer.remove();
    }
    if(add){
        primary_impact_layer.addTo(map);
        let compare = document.getElementById('comparison_year').value;
        if(compare != 0){
            comparison_impact_layer.addTo(map);
        }
    }
}


function redraw_map_layers(){
    clear_map_layers();
    let layer_xhr_array = [];
    let xhr_primary_extent = ajax_call("get-extent-layer", {
        'schema': "extent",
        'layer': document.getElementById('selected_year').value
    });
    xhr_primary_extent.done(function (result) {
        primary_extent_layer = L.geoJSON(result['data'].filter(filter_regions), {
            style: {
                fillColor: 'green',
                weight: 2,
                opacity: 1,
                color: 'green',  //Outline color
                fillOpacity: 1,
            },
            pane: 'left'
        }).bindPopup(function (layer) {
            return `Selected polygon has an extent area of ${layer.feature.properties.area}.`;
        }, {className: "zTop"});
    });
    layer_xhr_array.push(xhr_primary_extent);
    let xhr_primary_change = ajax_call("get-change-layer", {
        'schema': "change",
        'layer': document.getElementById('selected_year').value
    });
    xhr_primary_change.done(function (result) {
        primary_gain_layer = L.geoJSON(result['data'].filter(filter_regions).filter(filter_gain), {
            style: {
                weight: 2,
                opacity: 1,
                color: 'lime',  //Outline color
                fillOpacity: 0.4,
            },
            pane: 'left'
        }).bindPopup(function (layer) {
            return `Selected polygon represents mangrove extent gains totaling an area of ${layer.feature.properties.area}.`;
        }, {className: "zTop"});

        primary_loss_layer = L.geoJSON(result['data'].filter(filter_regions).filter(filter_loss), {
            style: {
                weight: 2,
                opacity: 1,
                color: 'red',  //Outline color
                fillOpacity: 0.4,
            },
            pane: 'left'
        }).bindPopup(function (layer) {
            return `Selected polygon represents mangrove extent losses totaling an area of ${layer.feature.properties.area}.`;
        }, {className: "zTop"});
    });
    layer_xhr_array.push(xhr_primary_change);
    let xhr_primary_impact = ajax_call("get-impact-layer", {
        'schema': "impact",
        'layer': document.getElementById('selected_year').value
    });
    xhr_primary_impact.done(function (result) {
        primary_impact_layer = L.geoJSON(result['data'].filter(filter_regions), {
            style: {
                weight: 2,
                opacity: 1,
                color: 'cyan',  //Outline color
                fillOpacity: 0.4,
            },
            pane: 'left'
        }).bindPopup(function (layer) {
            return `Selected polygon represents mangrove restoration impacts totaling an area of ${layer.feature.properties.area}. The affected localities are ${layer.feature.properties.impact_ext}`;
        }, {className: "zTop"});
    });
    layer_xhr_array.push(xhr_primary_impact);

    let compare = document.getElementById('comparison_year').value;
    if(compare != 0){
        let xhr_compare_extent = ajax_call("get-extent-layer", {
            'schema': "extent",
            'layer': document.getElementById('comparison_year').value
        });
        xhr_compare_extent.done(function (result) {
            comparison_extent_layer = L.geoJSON(result['data'].filter(filter_regions), {
                style: {
                    fillColor: 'green',
                    weight: 2,
                    opacity: 1,
                    color: 'green',  //Outline color
                    fillOpacity: 1,
                },
                pane: 'right'
            }).bindPopup(function (layer) {
                return `Selected polygon has an extent area of ${layer.feature.properties.area}.`;
            }, {className: "zTop"});
        });
        layer_xhr_array.push(xhr_compare_extent);
        let xhr_compare_change = ajax_call("get-change-layer", {
            'schema': "change",
            'layer': document.getElementById('comparison_year').value
        });
        xhr_compare_change.done(function (result) {
            comparison_gain_layer = L.geoJSON(result['data'].filter(filter_regions).filter(filter_gain), {
                style: {
                    weight: 2,
                    opacity: 1,
                    color: 'lime',  //Outline color
                    fillOpacity: 0.4,
                },
                pane: 'right'
            }).bindPopup(function (layer) {
                return `Selected polygon represents mangrove extent gains totaling an area of ${layer.feature.properties.area}.`;
            }, {className: "zTop"});

            comparison_loss_layer = L.geoJSON(result['data'].filter(filter_regions).filter(filter_loss), {
                style: {
                    weight: 2,
                    opacity: 1,
                    color: 'red',  //Outline color
                    fillOpacity: 0.4,
                },
                pane: 'right'
            }).bindPopup(function (layer) {
                return `Selected polygon represents mangrove extent losses totaling an area of ${layer.feature.properties.area}.`;
            }, {className: "zTop"});
        });
        layer_xhr_array.push(xhr_compare_change);
        let xhr_compare_impact = ajax_call("get-impact-layer", {
            'schema': "impact",
            'layer': document.getElementById('comparison_year').value
        });
        xhr_compare_impact.done(function (result) {
            comparison_impact_layer = L.geoJSON(result['data'].filter(filter_regions), {
                style: {
                    weight: 2,
                    opacity: 1,
                    color: 'cyan',  //Outline color
                    fillOpacity: 0.4,
                },
                pane: 'right'
            }).bindPopup(function (layer) {
            return `Selected polygon represents mangrove restoration impacts totaling an area of ${layer.feature.properties.area}. The affected localities are ${layer.feature.properties.impact_ext}`;
            }, {className: "zTop"});
        });
        layer_xhr_array.push(xhr_compare_impact);
    }



    $.when(...layer_xhr_array).then(function () {
        toggle_extent();
        if(compare != 0) {
            comparison_control = L.control.sideBySide([primary_extent_layer, primary_loss_layer, primary_gain_layer, primary_impact_layer], [comparison_extent_layer, comparison_loss_layer, comparison_gain_layer, comparison_impact_layer]).addTo(map);
            document.getElementsByClassName('leaflet-sbs-range')[0].setAttribute('onmouseover', 'map.dragging.disable()')
            document.getElementsByClassName('leaflet-sbs-range')[0].setAttribute('onmouseout', 'map.dragging.enable()')
        }
        map.fitBounds(primary_extent_layer.getBounds());
    })
}


function get_available_years(){
    let xhr = ajax_call("get-available-years", {});
    xhr.done(function (result) {
        let years = Object.values(result['data']);
        console.log(result['data']);
        fill_years_selector(years);
        fill_comparison_years_selector(years);
        redraw_map_layers();
    })
}


function init_map(){
    // Initialize with map control with basemap and time slider
    map = L.map('map_chart', {
        fullscreenControl: true, center: [-10, -62.2159], zoom: 4
    });

    map.createPane('left');
    map.createPane('right');

    map.zoomControl.setPosition('topleft');
    satellite.addTo(map);

    // Add the Search Control to the map
    map.addControl(new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
        showMarker: false, // optional: true|false  - default true
        showPopup: false,
        autoClose: true
    }));

    get_available_years();
}


function removeLayers(){
    satellite.remove();
    gSatLayer.remove();
    darkGrayLayer.remove();
    osm.remove();
    OpenTopoMap.remove();
    terrainLayer.remove();
    deLormeLayer.remove();
    gSatLayer.remove();
}


function add_basemap(map_name){
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
}


$(function () {
    init_map();
});