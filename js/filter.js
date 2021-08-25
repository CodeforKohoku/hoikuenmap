class FilterManager {
    constructor(map) {
        this.map = map;
        this.facNames = Object.keys(NURSERY_LAYERS);
    }

    addCond(facObj, id, value) {
        this.facNames.forEach(name => {
            if (id.includes(name)) {
                if (!(name in facObj)) facObj[name] = {}
                facObj[name][id.replace(name, '')] = value;
                return;
            }
        });
    }

    addAll(facObj, key, value) {
        // 選択がなければ全ての施設が新設園の対象
        if (!Object.keys(facObj).length) {
            for (const name of this.facNames) {
                facObj[name] = {};
            }         
        }

        Object.keys(facObj).forEach(name => {
            facObj[name][key] = value;
        });
    }

    filterApply() {
        const facObj = {};

        // 選択された開園終園時刻セレクトボックスの抽出
        Array.from(FILTER_POPUP_SELECT, select => {
            if (select.value !== '開園' && select.value !== '閉園') {
                this.addCond(facObj, select.id, select.value);
            }
        });
        Array.from(FILTER_POPUP_UL, ul => {
            Array.from(ul.children, li => {
                if (li.on) this.addCond(facObj, li.id, null);
            });
        });
        const kw = document.getElementById("nameKeyword").value;
        if (kw) this.addAll(facObj, "NameKeyword", kw);

        const fl = document.getElementById("filteredList").on;

        // 新設園の指定がある場合
        if (document.getElementById('btnNewSchool').on) {
            this.filterNewSchool(facObj);
            if (fl) this.filteredList(facObj, kw, true); // 新設園: true
            return;
        }

        // 選択がなければ何もせずに終了
        if (Object.keys(facObj).length === 0) return;

        this.filterLayer(facObj);
        if (fl) this.filteredList(facObj, kw, false); // 新設園: false

        // 検索ポップアップを隠す
        FILTER_POPUP_DIV.style.display ="none";
    }

    filterNewSchool(fObj) {
        const facObj = fObj || {};
        this.addAll(facObj, "NewSchool", null);
        this.filterLayer(facObj);
    }

    filterLayer(facObj) {
        // 全ての施設レイヤーを削除
        if (MENU_LIST) {
            MENU_LIST.forEach(li => {
                if (li.on) li.click();
            });
        }

        Object.entries(facObj).forEach(([name, items]) => {
            const layerGroup = NURSERY_LAYERS[name];
            const removed = NURSERY_LAYERS_REMOVED[name];

            // 絞り込みで除外されてるレイヤーがあれば戻す
            if (removed.length) {
                removed.forEach(layer => {
                    layerGroup.addLayer(layer);
                });
                removed.length = 0;
            }
            Object.keys(items).forEach(key => {
                FILTER_HANDLE[key](layerGroup, removed, items[key]);
            });

            if (MENU_LIST) {
                if (!Object.keys(layerGroup._layers).length) return;
                MENU_LIST.forEach(li => {
                    if (li.id === 'list' + name) { li.click(); }
                });
            }
        });
    }

    filteredList(facObj, kw, ns) { // kw:施設名キーワード, ns:新設園
        let idx = sessionStorage.getItem('nextIdx') || '0';

        // 同一idxの過去分があれば削除
        Object.keys(sessionStorage).forEach(key => {
            if (key[0] === idx) sessionStorage.removeItem(key);
        });

        Object.keys(facObj).forEach(key => {
            for (const layer of Object.values(NURSERY_LAYERS[key]._layers)) {
                    sessionStorage.setItem(idx + layer.feature.properties.Name, "");
            }
        });

        this.filterConditionList(facObj, idx, kw, ns);              // 検索条件一覧
        window.open('filteredList.html' + '?' + idx);  // 検索結果一覧の新規タブを開く
        sessionStorage.setItem('nextIdx', ++idx % 10); // 暗黙の型変換、10回分まで保存とする
    }

    filterConditionList(facObj, idx, kw, ns) { // kw:施設名キーワード, ns:新設園
        const conditions = [];
        if (ns) conditions.push('- 新規園（適用）');
        if (kw) conditions.push(`- 施設名キーワード（${kw}）`);
        Object.entries(facObj).forEach(([name, items]) => {
            const cond = [];
            Object.keys(items).forEach(key => {
                if (!(key in FILTER_COND)) return;
                cond.push(
                    items[key] 
                    ? FILTER_COND[key] + items[key]
                    : FILTER_COND[key]
                );
            });
            conditions.push(`- ${NURSERY_MAP.get(name)}（${cond.join('、')}）`);
        });
        sessionStorage.setItem('conditions' + idx, conditions.join(','));
    }
}


const filterLayerGroup = (layerGroup, layerRemoved, prop, func) => {
    for (const layer of Object.values(layerGroup._layers)) {
        if (func(layer.feature.properties[prop])) continue
        layerRemoved.push(layer);
        layerGroup.removeLayer(layer);
    }
};

const filterOpenTime = (layerGroup, layerRemoved, value) => {
    const [fHour, fMin] = value.split(':').map(s => Number(s));
    filterLayerGroup(layerGroup, layerRemoved, 'Open', (time) => {
        if (time) {
            const [hour, min] = time.split(':').map(s => Number(s));
            if (hour * 60 + min <= fHour * 60 + fMin) return true;
        }
    });
};

const filterCloseTime = (layerGroup, layerRemoved, value) => {
    const [fHour, fMin] = value.split(':').map(s => Number(s));
    filterLayerGroup(layerGroup, layerRemoved, 'Close', (time) => {
        if (time) {
            let [hour, min] = time.split(':').map(s => Number(s));
            if (hour <= 12) hour += 24 // 終園時間が翌日の場合
            if (hour * 60 + min >= fHour * 60 + fMin) return true;
        }
    });
};

const filter24H = (layerGroup, layerRemoved, _) => {
    filterLayerGroup(layerGroup, layerRemoved, 'H24', (value) => isPropTrue(value));
};
const filterIchijiHoiku = (layerGroup, layerRemoved, _) => {
    filterLayerGroup(layerGroup, layerRemoved, 'Temp', (value) => isPropTrue(value));
};
const filterYakan = (layerGroup, layerRemoved, _) => {
    filterLayerGroup(layerGroup, layerRemoved, 'Night', (value) => isPropTrue(value));
};
const filterKyujitu = (layerGroup, layerRemoved, _) => {
    filterLayerGroup(layerGroup, layerRemoved, 'Holiday', (value) => isPropTrue(value));
};
const filterEncho = (layerGroup, layerRemoved, _) => {
    filterLayerGroup(layerGroup, layerRemoved, 'Extra', (value) => isPropTrue(value));
};

const filterNameKeyword = (layerGroup, layerRemoved, keyword) => {
    filterLayerGroup(layerGroup, layerRemoved, 'Name', (value) => value.includes(keyword));
};

const filterNewSchool = (layerGroup, layerRemoved, _) => {
    filterLayerGroup(layerGroup, layerRemoved, 'Name', (value) => value.includes('（新設・仮称）'));
};

FILTER_HANDLE.OpenTime = filterOpenTime;
FILTER_HANDLE.CloseTime = filterCloseTime;
FILTER_HANDLE.H24 = filter24H;
FILTER_HANDLE.IchijiHoiku = filterIchijiHoiku;
FILTER_HANDLE.Yakan = filterYakan;
FILTER_HANDLE.Kyujitu = filterKyujitu;
FILTER_HANDLE.Encho = filterEncho;
FILTER_HANDLE.NameKeyword = filterNameKeyword;
FILTER_HANDLE.NewSchool = filterNewSchool;

const addFilterSelectTimeOptions = (() => {
    const OpenTimeList = [{'value': '', 'text': '開園'}];
    for (let hour = OPEN_TIME_START; hour < OPEN_TIME_END; hour++) {
        OpenTimeList.push({'value': hour + ':00', 'text': hour + ':00以前'});
        OpenTimeList.push({'value': hour + ':15', 'text': hour + ':15以前'});
        OpenTimeList.push({'value': hour + ':30', 'text': hour + ':30以前'});
        OpenTimeList.push({'value': hour + ':45', 'text': hour + ':45以前'});
    }
    OpenTimeList.push({'value': OPEN_TIME_END + ':00', 'text': OPEN_TIME_END + ':00以前'});

    const CloseTimeList = [{'value': '', 'text': '閉園'}];
    for (let hour = CLOSE_TIME_START; hour < CLOSE_TIME_END; hour++) {
        CloseTimeList.push({'value': hour + ':00', 'text': hour + ':00以降'});
        CloseTimeList.push({'value': hour + ':30', 'text': hour + ':30以降'});
    }
    CloseTimeList.push({'value': CLOSE_TIME_END + ':00', 'text': CLOSE_TIME_END + ':00以前'});

    return (select) => {
        if (select.id.includes('Open')) {
            addSelectBoxOptions(select.id, OpenTimeList);
            return;
        }
        addSelectBoxOptions(select.id, CloseTimeList);
    };
})();