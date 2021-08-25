const menuListFacilityClickEvent = (li) => {
    li.on = true;
    return () => {
        if (li.on) {
            map.removeLayer(NURSERY_LAYERS[li.id.slice(4)]);
            li.on = false;
            li.classList.add('cls-layer-off');
            return;
        }
        map.addLayer(NURSERY_LAYERS[li.id.slice(4)]);
        li.on = true;
        li.classList.remove('cls-layer-off');
    };
};

const menuListSchoolClickEvent = (li) => {
    li.on = false;
    li.classList.add('cls-layer-off');
    return () => {
        if (li.on) {
            map.removeLayer(SCHOOL_LAYERS[li.id]);
            li.on = false;
            li.classList.add('cls-layer-off');
            return;
        }
        map.addLayer(SCHOOL_LAYERS[li.id]);
        li.on = true;
        li.classList.remove('cls-layer-off');
    };
};

const menuListFilterEvent = (li) => {
    return () => {
        FILTER_POPUP_DIV.style.display = "block";
    };
};

const menuListNewSchoolEvent = (li) => {
    return () => {
        if (li.on) {
            li.on = false; // リセット前であること
            li.classList.remove('cls-layer-on');
            document.getElementById('filterReset').click();
            return;
        }
        document.getElementById('filterReset').click();
        FMGR = FMGR || new FilterManager(map);
        FMGR.filterNewSchool();
        li.on = true; // リセットと新設園フィルター適用後であること
        li.classList.add('cls-layer-on');
    };
};

const menuSelectBaseMapEvent = (select) => {
    select.addEventListener('change', _ => {
        for (const [key, tile] of BaseTileMap) {
            if (map.hasLayer(tile)) {
                if (key === select.value) return;
                map.removeLayer(tile);
            }       
        }
        map.addLayer(BaseTileMap.get(select.value));
    });
};

const menuSelectStationEvent = (select) => {
    select.addEventListener('change', _ => {
        const name = select.value;
        if (CURRENT_STATION_NAME === name) return;
        if (CURRENT_STATION) map.removeLayer(CURRENT_STATION);
        if ('最寄駅' === name) return;
        for (const stations of STATION_MAP.values()) {
            stations.forEach(station => {
                if (station.name === name) {
                    const latLng = [station.lat, station.lng];
                    CURRENT_STATION_NAME = station.name;
                    CURRENT_STATION = L.marker(latLng, {zIndexOffset: 200}).addTo(map);
                    map.setView(latLng);
                    return;
                }
            });
        }
    });
};

const menuSelectCircle = (select) => {
    select.addEventListener('change', _ => {
        const radius = select.value;
        if (CURRENT_CIRCLE_RADIUS === radius) return;
        if (CURRENT_CIRCLE) map.removeLayer(CURRENT_CIRCLE);
        CURRENT_CIRCLE_RADIUS = null;
        if ('円消去' === radius) return;
        const latLng = map.getCenter();
        CURRENT_CIRCLE = L.circleMarker(latLng, {
            'radius': Math.floor(radius / meterPerPixel(latLng)),
            'weight': 0,
            'color': 'red',
        }).addTo(map);
        CURRENT_CIRCLE_RADIUS = radius;
    });
};

const menuListHelpEvent = (_) => {
    document.getElementById('listHelp').addEventListener('click', _ => {
        window.open('howto.html');
    });
};

Object.keys(NURSERY_LAYERS).forEach(key => {
    EVENT_HANDLE['list' + key] = menuListFacilityClickEvent;
});
EVENT_HANDLE.listElementarySchool = menuListSchoolClickEvent;
EVENT_HANDLE.listMiddleSchool = menuListSchoolClickEvent;
EVENT_HANDLE.listFilter = menuListFilterEvent;
EVENT_HANDLE.listNewSchool = menuListNewSchoolEvent;
EVENT_HANDLE.selectBaseMap = menuSelectBaseMapEvent;
EVENT_HANDLE.selectStation = menuSelectStationEvent;
EVENT_HANDLE.selectCircle = menuSelectCircle;
EVENT_HANDLE.listHelp = menuListHelpEvent;


const loadJSON = (data_path, callback) => {
    let xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', data_path, true);
    xobj.onreadystatechange = () => {
        if (xobj.readyState === 4 && xobj.status === 200) {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
};

const addSelectBoxOptions = (id, optList) => {
    const select = document.getElementById(id);
    optList.forEach(opt => {
        const option = document.createElement("option");
        if (opt.value) option.value = opt.value;
        if (opt.text) option.text = opt.text;
        select.appendChild(option);
    });
};

const htmlTableBuilder = () => {
    var content = '<table><tbody>';
    const fn = (th, td) => {
        content += '<tr>';
        content += `<th>${th}</th>`;
        content += `<td>${td}</td>`;
        content += '</tr>';
    }
    fn.done = () => content += '</tbody></table>';
    return fn;
};

// メニューバーとロゴをWindowサイズに合わせて配置を変更する
const menuResizeHandle = () => {
    const menuDiv = document.getElementById("menu-div");
    const btnDiv = document.getElementById("menu-btn-div");
    const facilityList = document.getElementById("menu-div").querySelector("li");

    const collapseMenu = () => {
        MENU_LIST.forEach(list => {
            list.style.display = "none";
            list.style.width = (window.innerWidth / 3) + "px";
        });
        btnDiv.style.display = "block";
        menuDiv.style.top = (btnDiv.clientHeight - 5) + "px";

        if (window.innerHeight > 580) {
            menuDiv.style.left = (window.innerWidth / 3 * 2 - 5) + "px";
        } else {
            menuDiv.style.left = (window.innerWidth / 3 - 5) + "px";
        }
        MENU_COLLAPSED = true;
    };

    const uncollapseMenu = () => {
        MENU_LIST.forEach(list => {
            list.style.display = "inline-block";
            list.style.width = "";
        });
        menuDiv.style.top = "0px";
        menuDiv.style.left = "50px";
        btnDiv.style.display = "none";

        MENU_COLLAPSED = false;
        if (facilityList.clientHeight > 50) {
            collapseMenu();
        }
    };

    return () => {
         // Windowサイズがメニューの幅より小さい場合(つまりメニューが複数行となる場合)
        if (facilityList.clientHeight > 50 && !MENU_COLLAPSED) {
            collapseMenu();
            return;
        }
        // Windowサイズがメニューの幅より大きい場合
        if (MENU_COLLAPSED) uncollapseMenu();
    };
}
