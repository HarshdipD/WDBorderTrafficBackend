'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const Nightmare = require('nightmare');
const Promise = require('q').Promise;
const nightmare = Nightmare();

let tunnelData;
let bridgeData;
let TimeBridge;
let DATA_READY;
let a;
let tempData = {
    data: 'pending'
}
let pendingUpdate = false;
const url_bridge = 'https://www.ezbordercrossing.com/list-of-border-crossings/michigan/ambassador-bridge/current-traffic/';
const url_tunnel = 'https://dwtunnel.com/';

const app = express();
app.use(bodyParser.json({type: 'application/json'}));
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
    res.send("APIs are in /bridge, /tunnel and /data");
})

app.get('/tunnel', function (req, res) {
    tunnel().then((data) => res.send(data));
})

app.get('/bridge', function (req, res) {
    bridge().then((data) => {
        console.log("sending");
        res.send(data);
    });
})

app.get('/data', function (req, res) {
    console.log(DATA_READY)
    res.send(DATA_READY === undefined ? tempData : [a, DATA_READY]);
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    fetchData();
});

async function tunnel() {
    await fetchTunnel();
    DATA_READY = await JSONTunnelData(tunnelData);
    return DATA_READY;
}

async function bridge() {
    await fetchBridge();
    DATA_READY = await JSONBridgeData(bridgeData);
    return DATA_READY;
}

async function start() {
    // await new Promise((resolve) => resolve(fetchTunnel()));
    await fetchTunnel();
    await fetchBridge();
    DATA_READY = await combinedData(bridgeData, tunnelData);
    return DATA_READY;
}

async function fetchData() {
    setInterval(() => {
        DATA_READY = undefined;
        DATA_READY = start();
        a = new Date();
    }, 300000);
}

async function fetchTunnel() {

    return Promise.resolve(
        nightmare
            .goto(url_tunnel)
            .cookies.clear()
            .wait(1000)
            .evaluate(() => Array.from(document.querySelectorAll('td')).map(element => element.innerText))
            .then(data => {
                tunnelData = tunnelJsonFormat(data);
            })
    );
}

function getlastUpdated() {

    return Promise.resolve(
        nightmare
            .goto(url_bridge)
            .cookies.clear()
            .wait(1000)
            .evaluate(function () {
                return Array.from(document.querySelectorAll('th')).map(element => element.innerText);
            })
            .then(data => {
                TimeBridge = getLastUpdateTime(data);
            })
    )
}

function fetchBridge() {

    return Promise.resolve(
        nightmare
            .goto(url_bridge)
            .cookies.clear()
            .wait(1000)
            .evaluate(() => [Array.from(document.querySelectorAll('th')).map(element => element.innerText),
                Array.from(document.querySelectorAll('table.waittimes > tbody > tr > td')).map(element => element.innerText)]
            )
            .then(data => {
                bridgeData = data[1];
                // nightmare.proc.disconnect();
                // nightmare.proc.kill();
                // nightmare.ended = true;
            })
    )
}

function tunnelJsonFormat(data) {

    _.pull(data, '\n', '');
    let CAUS = [];
    let USCA = [];

    for (let i = 0; i < data.length / 2; i++) {
        let temp1 = data[i];
        let temp2 = data[(data.length / 2) + i]
        CAUS[i] = temp1;
        USCA[i] = temp2;
    }

    return {
        canadaToUSA: {
            time: CAUS[0],
            car: CAUS[1],
            truck: CAUS[2],
            nexus: CAUS[3],
            carLanesNum: CAUS[1],
            truckLanesNum: CAUS[2],
            nexusLanesNum: CAUS[3]
        },
        USAToCanada: {
            time: USCA[0],
            car: USCA[1],
            truck: USCA[2],
            nexus: USCA[3],
            carLanesNum: USCA[1],
            truckLanesNum: USCA[2],
            nexusLanesNum: USCA[3]
        }
    };
}

function getLastUpdateTime(data) {

    let t;
    data.forEach(element => {
        if (element.includes('Pending Update')) {
            pendingUpdate = true;
        }
        try {
            t = element.match(/[0-9]+:[0-9]+/g);
        } catch (error) {
            t = 'pending';
        }
    });

    return _.toString(t);
}

function JSONTunnelData(T) {

    let result = {
        canadaToUSA: {
            car: '',
            truck: '',
            nexus: '',
            time: ''
        },
        USAToCanada: {
            car: '',
            truck: '',
            nexus: '',
            time: ''
        }
    };

    if (T != null || pendingUpdate !== true) {

        result.canadaToUSA.car = T.canadaToUSA.car;
        result.canadaToUSA.truck = T.canadaToUSA.truck;
        result.canadaToUSA.nexus = T.canadaToUSA.nexus;
        result.canadaToUSA.time = T.canadaToUSA.time;

        result.USAToCanada.car = T.USAToCanada.car;
        result.USAToCanada.truck = T.USAToCanada.truck;
        result.USAToCanada.nexus = T.USAToCanada.nexus;
        result.USAToCanada.time = T.USAToCanada.time;
    }

    return result;
}

function JSONBridgeData(Bridge) {

    let result = {
        canadaToUSA: {
            car: '',
            nexus: '',
            readyLane: '',
            commercial: '',
            fast: ''

        },
        USAToCanada: {
            car: '',
            nexus: '',
            readyLane: '',
            commercial: '',
            fast: ''
        }
    };

    if (Bridge != null || pendingUpdate !== true) {

        result.canadaToUSA.car = Bridge[1];
        result.canadaToUSA.nexus = Bridge[4];
        result.canadaToUSA.readyLane = Bridge[7];
        result.canadaToUSA.commercial = Bridge[10];
        result.canadaToUSA.fast = Bridge[13];

        result.USAToCanada.car = Bridge[2];
        result.USAToCanada.nexus = Bridge[5];
        result.USAToCanada.readyLane = Bridge[8];
        result.USAToCanada.commercial = Bridge[11];
        result.USAToCanada.fast = Bridge[14];
    }

    return result;
}

function combinedData(Bridge, T) {

    let result = {
        tunnel: {
            canadaToUSA: {
                car: '',
                truck: '',
                nexus: '',
                time: ''
            },
            USAToCanada: {
                car: '',
                truck: '',
                nexus: '',
                time: ''
            }
        },
        bridge: {
            canadaToUSA: {
                car: '',
                nexus: '',
                readyLane: '',
                commercial: '',
                fast: ''

            },
            USAToCanada: {
                car: '',
                nexus: '',
                readyLane: '',
                commercial: '',
                fast: ''
            }
        }
    };

    if (Bridge != null || pendingUpdate !== true) {

        result.bridge.canadaToUSA.car = Bridge[1];
        result.bridge.canadaToUSA.nexus = Bridge[4];
        result.bridge.canadaToUSA.readyLane = Bridge[7];
        result.bridge.canadaToUSA.commercial = Bridge[10];
        result.bridge.canadaToUSA.fast = Bridge[13];

        result.bridge.USAToCanada.car = Bridge[2];
        result.bridge.USAToCanada.nexus = Bridge[5];
        result.bridge.USAToCanada.readyLane = Bridge[8];
        result.bridge.USAToCanada.commercial = Bridge[11];
        result.bridge.USAToCanada.fast = Bridge[14];
    }

    if (T != null || pendingUpdate !== true) {

        result.tunnel.canadaToUSA.car = T.canadaToUSA.car;
        result.tunnel.canadaToUSA.truck = T.canadaToUSA.truck;
        result.tunnel.canadaToUSA.nexus = T.canadaToUSA.nexus;
        result.tunnel.canadaToUSA.time = T.canadaToUSA.time;

        result.tunnel.USAToCanada.car = T.USAToCanada.car;
        result.tunnel.USAToCanada.truck = T.USAToCanada.truck;
        result.tunnel.USAToCanada.nexus = T.USAToCanada.nexus;
        result.tunnel.USAToCanada.time = T.USAToCanada.time;
    }

    return result;
}

function bridgeFormat(data) {

    var Gates = [];

    for (var i = 0; i < 15; i++) {
        var temp = data[i];
        if (temp !== "FAST" && temp !== "Ready Lane") {

            if ((i % 3 === 0)) {
                // get lane name
                var gate = {
                    "lane": "",
                    "details": "",
                };
                gate.lane = data[i];
            } else if (i > 0 && (i - 1) % 3 === 0) {
                // get details to more details by calling the the function
                var details = detailsString(data[i]);
                gate.details = details;
            } else if (i > 0 && (i + 1) % 3 === 0) {

                // get enter canada status
                var eCanada = data[i].replace(/minutes/g, 'mn');
                // add into object
                gate.enterCanada = eCanada;
                // push to array to start a new object
                Gates.push(gate);
            }
        } else {
            i += 2;
        }
    }
    return Gates;
}

function detailsString(details) {

    // change string to lower case
    var temp = details.split('\n');

    // check if lane is close then return no data is added
    if (details.includes('Lanes Closed')) {
        //console.log(temp +'\tlane closed');
        return {
            "time": temp[0],
            "delay": "Closed",
            "open_lane": 'Closed'

        };
    } else if (details === '') {
        //
    } else {
        var delay = (temp[1].match(/no delay/g)) ? true : false;
        var lane = temp[2].match(/[0-9]+/g);
        lane = laneCheck(lane)

        if (!delay) {
            var time = temp[1].replace(/[a-zA-Z\s]/g, '');

            return {
                "time": temp[0],
                "delay": time,
                "open_lane": lane,
            };

        } else {
            return {
                "time": temp[0],
                "delay": "No delay",
                "open_lane": lane,
            };
        }
    }
}

function laneCheck(lane) {
    if (lane === '0') {
        return 'Closed';
    } else if (lane === '1') {
        return '1 lane';
    }
    return lane + ' lanes';
}

function laneClosed(time, closed) {
    if (closed === 'Closed') {
        return 'Closed';
    } else if (time === 'No delay' && closed !== 'Closed') {
        return time + '/' + closed;
    } else {
        return time + ' mn/' + closed;
    }
}
