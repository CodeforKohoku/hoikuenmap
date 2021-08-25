
const main = () => {
    const idx = location.search.substr(1);
    if (idx.length !== 1) return;

    // 施設名の取得
    const names = [];
    Object.keys(sessionStorage).forEach(key => {
        if (key[0] === idx) names.push(key.substr(1));
    });

    loadJSON('data/nurseryFacilities.geojson', response => {
        filterNurseryFacilities(JSON.parse(response), names);
    });
    renderFilterConditions(idx);
};

const filterNurseryFacilities = (geojson, names) => {
    const tableList = new TableList();
    geojson.features.forEach(feature => {
        if (names.indexOf(feature.properties.Name) >= 0) {
            tableList.createTbody(feature.properties);
        }
    });
    tableList.render();
};

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

class TableList {
    constructor() {
        this.table = document.createElement('table');
        this.thead = document.createElement('thead');
        this.tbody = document.createElement('tbody');
        this.createThead();
        this.table.classList.add('table');
    }

    createThead() {
        const tr = document.createElement('tr');
        [
            '施設名(区分)',
            '開園/終園',
            '対象年齢',
            '対応',
            '備考',
            '情報',
          ].forEach(item => {
            const th = document.createElement('th');
            th.textContent = item;
            tr.appendChild(th);
          });
          this.thead.appendChild(tr);
    }

    createTbody(p) { // p is features.properties
        const tr = document.createElement('tr');

        this.addListContent(tr, [p.Name, '(' + p.Type + ')']); // 施設名、施設区分
        this.addContent(tr, p.Open + ' ~ ' + p.Close);         // 開園、終園時間
        this.addContent(tr, p.AgeS + ' ~ ' + p.AgeE);          // 対象年齢

        const services = [];      // 一時保育、延長保育、夜間、24時間をひとくくり
        if(p.Temp) services.push('一時保育');
        if(p.Extra) services.push('延長保育');
        if(p.Night) services.push('夜間');
        if(p.H24) services.push('24時間');
        this.addListContent(tr, services);

        this.addContent(tr, p.Memo);  // 備考

        const info = [];          // 住所、TEL、FAX、urlをひとくくり
        if(p.Add1) info.push(p.Add1 + ' ' + p.Add2);
        if(p.TEL && p.FAX) {
            info.push('TEL ' + p.TEL + ' / FAX ' + p.FAX);
        } else if(p.TEL && !(p.FAX)) {
            info.push('TEL ' + p.TEL);
        } else if(!(p.TEL) && p.FAX) {
            info.push('FAX ' + p.FAX);
        }
        if(p.url) {
            const aTag = document.createElement('a');
            aTag.setAttribute('href', p.url);
            aTag.setAttribute('target','_blank');
            aTag.textContent = '施設のWebサイトを開く';
            info.push(aTag);
        }
        this.addListContent(tr, info);

        this.tbody.appendChild(tr);
    }

    addContent(tr, data) {
        const td = document.createElement('td');
        typeof data === 'string'     // 引数が文字列かDOM要素(object)か判定
        ? td.textContent = data
        : td.appendChild(data);
        tr.appendChild(td);
    }

    addListContent(tr, items) {
        const ul = document.createElement('ul');
        items.forEach(function(data){
            const li = document.createElement('li');
            typeof data === 'string'     // 引数が文字列かDOM要素(object)か判定
            ? li.textContent = data
            : li.appendChild(data);
            ul.appendChild(li);
        });
        this.addContent(tr, ul); 
    }

    render() {
        this.table.appendChild(this.thead);
        this.table.appendChild(this.tbody);
        document.getElementById("filteredList").appendChild(this.table);
    }
}

const renderFilterConditions = (idx) => {
    const fd = document.getElementById("filterCondition");
    fd.textContent = '絞り込み条件 : ';
    fd.appendChild(document.createElement('br'));

    sessionStorage.getItem('conditions' + idx).split(',').forEach(item => {
        const span = document.createElement('span');
        span.textContent = item;
        fd.appendChild(span);
        fd.appendChild(document.createElement('br'));
    });
};

// urlでクエリが渡されていれば実行
if(location.search) main();
