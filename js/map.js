const initializeMap = () => {
    const map = L.map('mapid', {
        // Map State Options
        center: [INIT_LONGITUDE, INIT_LATITUDE],
        maxBounds: setLatLngBounds(),
        maxZoom: INIT_ZOOM_MAX,
        minZoom: INIT_ZOOM_MIN,
        zoom: INIT_ZOOM_LEVEL,
        layers: BaseTileMap.get(INIT_MAP),
        
        // Interaction Options
        bounceAtZoomLimits: false
    });
    L.control.scale({'imperial': false}).addTo(map);
    L.control.locate({"keepCurrentZoomLevel": true}).addTo(map);

    map.on('zoomend', () => {
        if (CURRENT_CIRCLE) { // 円表示がある場合、zoomレベルに合わせて調整
            CURRENT_CIRCLE.setRadius(
                Math.floor(CURRENT_CIRCLE_RADIUS / meterPerPixel(CURRENT_CIRCLE.getLatLng()))
            );
        }
    });
    return map;
};

const setLatLngBounds = () => {
    return L.latLngBounds(
        L.latLng(SOUTH_BOUND, WEST_BOUND), L.latLng(NORTH_BOUND, EAST_BOUND)
    );
};

const meterPerPixel = (latLng) => {
    // 地球の外周 x 絶対値(Cosine( -π/2 < 緯度 < π/2 )) / zoomレベルによる比率 ※π/2は90度
    // zoomレベルごとに距離が2倍となるため、2**zoomレベルで割る
    // zoomレベル0で256(2**8)pixelで地球一周のため、2**8で割る  -> zoomレベルと併せてmap.getZoom() + 8
    return 40075016.686 * Math.abs(Math.cos(latLng.lat * Math.PI / 180)) / Math.pow(2, map.getZoom() + 8);
};

const BaseTileMap = new Map([ // leaflet無関係のJSのMapオブジェクト
    ["標準(Bing)", new L.BingLayer(BING_API_KEY, {'type': 'Road'})],
    ["標準(OSM)", L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1
    })]
]);


const loadNurseryFacilities = (map) => {
    loadJSON('data/nurseryFacilities.geojson', response => {
        NURSERY_FACILITIES = JSON.parse(response);
        AddNurseryLayers(NURSERY_FACILITIES, map);
    });
};

const AddNurseryLayers = (NURSERY_FACILITIES, map) => {
    // NURSERY_LAYERSが施設ごとのLayerGroupを保持
    Object.keys(NURSERY_TYPES).forEach(type => {
        NURSERY_LAYERS[NURSERY_TYPES[type].id] = L.geoJSON(
            NURSERY_FACILITIES, nurseryGeoJSONOptions(type)).addTo(map);
    });
}

const loadSchools = (map) => {
    const elementary = [];
    loadJSON('data/Elementary_loc.geojson', response => {
        loadJSON('data/Elementary.geojson', response => {
            elementary.push(L.geoJSON(JSON.parse(response)));
            SCHOOL_LAYERS["listElementarySchool"] = L.layerGroup(elementary);
        });
        elementary.push(L.geoJSON(JSON.parse(response)));
    });

    const middle = [];
    loadJSON('data/MiddleSchool_loc.geojson', response => {
        loadJSON('data/MiddleSchool.geojson', response => {
            middle.push(L.geoJSON(JSON.parse(response)));
            SCHOOL_LAYERS["listMiddleSchool"] = L.layerGroup(middle);
        });
        middle.push(L.geoJSON(JSON.parse(response)));
    });
};

const nurseryGeoJSONOptions = (type) => {
    return {
        pointToLayer: nurseryStyleFunction(type),
        onEachFeature: nurseryOnEachFeature,
        filter: (feature, _) => feature.properties.Type === type
    };
};

const nurseryStyleFunction = (type) => {
    const style = NURSERY_TYPES[type]
    return (feature, coordinates) => {
        return L.marker(coordinates, {
            icon: L.icon({
            iconUrl: "images/029.png",
            iconSize: [21, 21],
            className: style.className
            }),
            zIndexOffset: style.zIndexOffset
        })
}};

const nurseryOnEachFeature = (feature, layer) => {
    layer.bindPopup(
        getNurseryPopupHtml(feature),
        () => { return {'maxWidth': '500'}; } // 500でよいか見直し
    );
};

const popHtmlTableBuilder = (name) => {
    var content = '<table><tbody>';
    const fn = (th, td) => {
        content += '<tr>';
        content += `<th>${th}</th>`;
        content += `<td>${td}</td>`;
        content += '</tr>';
    }
    fn.done = () => `<b>${name}</b></br>${content}</tbody></table>`;
    return fn;
};

const getNurseryPopupHtml = (feature) => {
    const p = feature.properties;
    const table = popHtmlTableBuilder(p.Name);

	const popFounded = (yyyymm) => {
		const y = Math.floor(yyyymm / 100) + '年';
		const m = yyyymm % 100;
		return m ? y + m + '月' : y;
	};

    let info = "";
    if (p.Temp    === 'Y')         {info += '一時保育 '};
    if (p.Holiday === 'Y')         {info += '休日保育 '};
    if (p.Night   === 'Y')         {info += '夜間保育 '};
    if (p.H24     === 'Y')         {info += '24時間 '  };
    if (p.Extra   === 'Y')         {info += '延長保育 '};
    if (p['児童発達支援'] === 'Y') {info += '児童発達支援 '};
    if (p['重心（児童発達）'])     {info += `(${p['重心（児童発達）']})`};
    if (p['放課後デイ']   === 'Y') {info += '放課後デイ '};
    if (p['重心（放課後デイ）'])   {info += `(${p['重心（放課後デイ）']})`};

    table('区分', p.Type);
    if (p.Open && p.Close) table('時間',       p.Open + '〜' + p.Close);
    if (p.Memo)            table('',           p.Memo);
    if (info)              table('',             info);
    if (p.AgeS && p.AgeE)  table('年齢',       p.AgeS + '〜' + p.AgeE);
    if (p.Full)            table('定員',       p.Full);
    if (p.TEL)             table('TEL',        p.TEL);
    if (p.FAX)             table('FAX',        p.FAX);
    if (p.Add1 || p.Add2)  table('住所',       p.Add1 + p.Add2);
    if (p.url)             table('Web',      `<a href=${p.url} target="_blank">施設のページを開く</a>`);
    if (p['設立年月'])     table('設立',       popFounded(p['設立年月']));
    if (p['プレ幼稚園'])   table('プレ幼稚園',(p['プレ幼稚園'] === 'Y') ? "あり" : "なし");
    if (p['園バス'])       table('園バス',    (p['園バス'] === 'Y')     ? "あり" : "なし");
    if (p['給食'])         table('給食',       p['給食']);

    return table.done();
};

const loadStations = (map) => {
    loadJSON('data/station.geojson', response => {
        JSON.parse(response).features.forEach(f => {
            const p = f.properties;
            const s = `${p.N05_003} (${p.N05_002})`;
            if (!STATION_MAP.has(s)) STATION_MAP.set(s, []);
            STATION_MAP.get(s).push({
                name: p.N05_001 + p.N05_011, // N05_001は一桁の想定
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0]
            });
        });
        addStationSelectboxOptions();
    });
};

const addStationSelectboxOptions = () => {
    const select = document.getElementById("selectStation");
    const optGrp = document.createElement("optgroup");
    optGrp.label = "公共交通機関施設";
    select.appendChild(optGrp);

    for (const key of STATION_MAP.keys()) {
        const optGrp = document.createElement("optgroup");
        optGrp.label = key;
        STATION_MAP.get(key).forEach(data => {
            const option = document.createElement("option");
            option.value = data.name;
            option.text = data.name.slice(1); // N05_011のみ
            optGrp.appendChild(option);
        });
        select.appendChild(optGrp);
    }
};
