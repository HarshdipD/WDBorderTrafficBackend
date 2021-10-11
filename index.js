'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const Nightmare = require('nightmare');
const Promise = require('q').Promise;
const nightmare = Nightmare();

const app = express();
app.use(bodyParser.json({type: 'application/json'}));
app.use(bodyParser.urlencoded({extended: true}));

app.get('/data', function (req, res) {
    res.send(Bridge_ready);
})
app.get('/ready', function (req, res) {
    res.send(DATA_READY);
})

// localhost 3003
var server = app.listen(process.env.PORT, '0.0.0.0', function () {
});

let tunnelData;
let bridgeData;

// fetch Bridge website
const url_bridge = 'https://www.ezbordercrossing.com/list-of-border-crossings/michigan/ambassador-bridge/current-traffic/';
const url_tunnel = 'https://dwtunnel.com/';

start();

async function start() {
    // await new Promise((resolve) => resolve(fetchTunnel()));
    await fetchTunnel();
    await getlastUpdated();
    await fetchBridge();
    DATA_READY = await combinedData('a', tunnelData);
    await console.log(DATA_READY);
}

var TimeBridge;
var pendingUpdate = false;
var DATA_READY;

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
            .evaluate(function () {
                return Array.from(document.querySelectorAll('table.waittimes > tbody > tr > td')).map(element => element.innerText);
            })
            .then(data => {

                // console.log(data, data.length);


                // bridgeData = bridgeFormat(data);
                // DATA_READY = combinedData(bridgeData, tunnelData);
                // console.log(Bridge_ready);
                // console.log(DATA_READY);


                nightmare.proc.disconnect();
                nightmare.proc.kill();
                nightmare.ended = true;


            })
    )
}

function tunnelJsonFormat(data) {

    _.pull(data, '\n', '');
    let CAUS = [];
    let USCA = [];

    for (let i = 0; i < data.length/2; i++) {
        let temp1 = data[i];
        let temp2 = data[(data.length/2) + i]
        CAUS[i] = temp1;
        USCA[i] = temp2;
    }

    return {
        canadaToUSA: {
            time: CAUS[0],
            car: CAUS[1],
            truck:CAUS[2],
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

function combinedData(B, T) {

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
                truck: '',
                nexus: ''
            },
            USAToCanada: {
                car: '',
                truck: '',
                nexus: ''
            }
        }
    };

    // bridge part

    // if (B == null || pendingUpdate == true) {
    //     final_res.B_time = '---';
    //     final_res.B_CAR_CA_US = '---';
    //     final_res.B_CAR_US_CA = '---';
    //     final_res.B_COM_CA_US = '---';
    //     final_res.B_COM_US_CA = '---';
    //     final_res.B_NEXUS_US_CA = '---';
    //     final_res.B_NEXUS_CA_US = '---';
    //     final_res.bridge_CAUS_CAR = '---';
    //     final_res.bridge_CAUS_COM = '---';
    //     final_res.bridge_CAUS_NEXUS = '---';
    //     final_res.bridge_USCA_COM = '---';
    //     final_res.bridge_USCA_CAR = '---';
    //     final_res.bridge_USCA_NEXUS = '---';
    //     final_res.estimatedTime = '---';
    // } else {
    //
    //
    //     final_res.B_time = B[0].details.time.replace(/At|EDT/g, '');
    //     final_res.B_CAR_CA_US = laneClosed(B[0].details.delay, B[0].details.open_lane);
    //     final_res.B_CAR_US_CA = B[0].enterCanada;
    //     final_res.B_COM_CA_US = laneClosed(B[2].details.delay, B[2].details.open_lane);
    //     final_res.B_COM_US_CA = (B[2].enterCanada == '') ? "Pending Update" : B[2].enterCanada;
    //     final_res.B_NEXUS_US_CA = (B[1].enterCanada == '') ? "Pending Update" : B[2].enterCanada;
    //
    //     final_res.B_NEXUS_CA_US = laneClosed(B[1].details.delay, B[1].details.open_lane);
    //     final_res.bridge_CAUS_CAR = B[0].details.delay;
    //     final_res.bridge_CAUS_COM = B[2].details.delay;
    //     final_res.bridge_CAUS_NEXUS = B[1].details.delay;
    //     final_res.bridge_USCA_COM = B[2].enterCanada;
    //     final_res.bridge_USCA_CAR = B[0].enterCanada;
    //     final_res.bridge_USCA_NEXUS = B[1].enterCanada;
    //     final_res.estimatedTime = TimeBridge;
    //
    // }

    if (T != null || pendingUpdate !== true) {

        result.tunnel.canadaToUSA.car =  T.canadaToUSA.car;
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

// function getJson ---> take the array of the data from the web , convert to json object
function bridgeFormat(data) {

    // global array 
    var Gates = [];
    console.log(data);
    // initial temp var

    for (var i = 0; i < 15; i++) {
        console.log(typeof data[i], data[i])
        var temp = data[i];

        if (temp !== "FAST" && temp !== "Ready Lane") {

            console.log("hi", i, data[i]);

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

                //console.log(eCanada+'enter canada');
                // add into object
                gate.enterCanada = eCanada;
                // push to array to start a new object
                Gates.push(gate);
            }
        } else {
            i += 2;
        }
    }


    console.log('this is gates' + Gates);

    return Gates;

}

function detailsString(details) {


    // change string to lower case
    var temp = details.split('\n');
    console.log('***************************' + temp + '\n\n\n\n\n')

    //console.log(temp+'split array of delailts => 3 arrays');
    //console.log(temp[0]);
    //console.log(temp[1]);
    //console.log(temp[2]);
    // replace 
    //console.log(details+' ORIGIN STRING');
    //console.log(temp+' arr cut');


    // check if lane is close then return no data is added
    if (details.includes('Lanes Closed')) {
        //console.log(temp +'\tlane closed');
        return {


            "time": temp[0],
            "delay": "Closed",
            "open_lane": 'Closed'

        };

    } else if (details === '') {
        console.log("hio");
    } else {


        var delay = (temp[1].match(/no delay/g)) ? true : false;
        console.log(temp[1] + '*****' + delay);

        var lane = temp[2].match(/[0-9]+/g);
        lane = laneCheck(lane)
        //console.log('before'+temp[2]+'after match'+lane)
        // delay

        if (!delay) {
            var time = temp[1].replace(/[a-zA-Z\s]/g, '');
            //  console.log(time+'delay time mn');
            //console.log(time[1]);

            return {
                "time": temp[0],
                "delay": time,
                "open_lane": lane,

            };


        } else // no deplay
        {
            return {


                "time": temp[0],
                "delay": "No delay",
                "open_lane": lane,

            };


        }


    }

}

function laneCheck(lane) {
    if (lane == '0') {
        return 'Closed';
    } else if (lane == '1') {
        return '1 lane';
    }
    return lane + ' lanes';
}

function laneClosed(time, closed) {
    if (closed == 'Closed')
        return 'Closed';
    else if (time == 'No delay' && closed != 'Closed')
        return time + '/' + closed;
    else
        return time + ' mn/' + closed;
}
