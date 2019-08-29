
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const _ = require('lodash');
const rp = require('request-promise');
const $ = require('cheerio');

const Nightmare = require('nightmare');
const Promise = require('q').Promise;

const nightmare = Nightmare();



const app = express();
app.use(bodyParser.json({type:'application/json'}));
app.use(bodyParser.urlencoded({extended:true}));



// go to localhost 3003 --> if it doesnt work --> change to any number
var server = app.listen(process.env.PORT, '0.0.0.0', function(){
    console.log("start!!!!");
  
  });

// fetch Bridge website
const url_bridge = 'https://www.ezbordercrossing.com/list-of-border-crossings/michigan/ambassador-bridge/current-traffic/';
const url_tunnel ='https://dwtunnel.com/';



/********************************sample data *********************************/

var sample = [ 
{ 'B_time': 'At 11:00 pm EDT',
'B_CAR_CA_US': 'No delay/3 lanes',
'B_CAR_US_CA': 'No delay',
'B_COM_CA_US': '15 mn/5 lanes',
'B_COM_US_CA': 'No delay',
'B_NEXUS_US_CA': 'N/A',
'B_NEXUS_CA_US': 'Closed/Closed',
'bridge_CAUS_CAR': 'No delay',
'bridge_CAUS_COM': '15 mn',
'bridge_CAUS_NEXUS': 'Closed',
'bridge_USCA_COM': 'No delay',
'bridge_USCA_CAR': 'No delay',
'bridge_USCA_NEXUS': '',
'estimatedTime': '23:14',
'T_CAR_US_CA': '15 mn/2 lanes',
'T_CAR_CA_US': '15 mn/2 lanes',
'T_COM_US_CA': '15 mn/1 lane',
'T_COM_CA_US': '15 mn/Closed',
'T_NEXUS_US_CA': '15 mn/1 lane',
'T_NEXUS_CA_US': '15 mn/Closed',
'tunnel_CAUS': '15',
'tunnel_USCA': '15',
'CAcarOnlyNum': '2',
'CAtruckOnlyNum': '0',
'CANEXUSOnlyNum': '0',
'tunnel_time': '0:function getMinutes() { [native code] }',
'UScarOnlyNum': '2',
'UStruckOnlyNum': '1',
'USNEXUSOnlyNum': '1',
'CarCAUS': 'Bridge is 15 mn faster than Tunnel',
'CarUSCA': 'Bridge is 15 mn faster than Tunnel',
'COMCAUS': 'This Tunnel Lane is Closed',
'COMUSCA': 'Bridge is 15 mn faster than Tunnel',
'NexusCAUS': 'This Tunnel Lane is Closed',
    'one':{
    
        'two': '234',
        'third': '345',
        'one':{
            'one': 'inside123',
            'two': 'inside234',
            'third': 'inside345',
        }
    }
}
];


// fecth bridge data
var TimeBrige;
var Bdata;
var Tdata;
var pendingUpdate =false;

var DATA_READY;
function fetchTunnel(){
   // Promise.resolve(
        nightmare
        .goto(url_tunnel)
        .cookies.clear()
        .wait(1000)
        .evaluate(function(){
            return Array.from(document.querySelectorAll('td')).map(element => element.innerText);
        })
        .then(data=>{
            Bdata=data;
            Tunnel_ready=tunnelJsonFormat(Bdata);
            //console.log(Bdata);
            getTime();
            
        })
    //)
}
function fetchBridge(){
    Promise.resolve(
        nightmare
        .goto(url_bridge)
        .cookies.clear()
        .wait(1000)
        .evaluate(function(){
            return Array.from(document.querySelectorAll('td')).map(element => element.innerText);
        })
        .then(data=>{
            Tdata=data;
            console.log(Tdata+'bridge table data')
           
           //console.log(Tdata);
          
            
            Bridge_ready = bridgeFormat(Tdata);
            DATA_READY=combinedData(Bridge_ready,Tunnel_ready);
            console.log(Bridge_ready);
            console.log(DATA_READY);

            
            nightmare.proc.disconnect();
            nightmare.proc.kill();
            nightmare.ended=true;

          
            
        })
    )
}
function getTime(){
    Promise.resolve(
        nightmare
        .goto(url_bridge)
        .cookies.clear()
        .wait(1000)
        .evaluate(function(){
            return Array.from(document.querySelectorAll('th')).map(element => element.innerText);
        })
        .then(data=>{
           
        
           fetchBridge();
           var dataTime=findTime(data);
           TimeBrige=dataTime;
            
        })
    )
}
fetchTunnel();

function findTime(data){
    var t;
    var pending;
    data.forEach(element => {
        if(element.includes('Pending Update'))
           { pending = true;
            pendingUpdate=pending;

           }
        t=element.match(/[0-9]+:[0-9]+/g);        
        //console.log(t+'&&&&&&&');

    });
    return _.toString(t);
}




app.get('/data', function(req,res){

    res.send(Bridge_ready);
})
app.get('/ready', function(req,res){

    res.send(DATA_READY);
})

/******Combined Data *********/

 function combinedData(B,T)
{   var arr=[]
    var final_res ={};

        // bridge part

        if(B==null || pendingUpdate==true){
            final_res.B_time = '---';
            final_res.B_CAR_CA_US= '---';
            final_res.B_CAR_US_CA= '---';
            final_res.B_COM_CA_US= '---';
            final_res.B_COM_US_CA= '---';
            final_res.B_NEXUS_US_CA= '---';
            final_res.B_NEXUS_CA_US= '---';
            final_res.bridge_CAUS_CAR = '---';
            final_res.bridge_CAUS_COM = '---';
            final_res.bridge_CAUS_NEXUS = '---';
            final_res.bridge_USCA_COM = '---';
            final_res.bridge_USCA_CAR = '---';
            final_res.bridge_USCA_NEXUS = '---';
            final_res.estimatedTime='---';
        }
        else
        {

    
        final_res.B_time = B[0].details.time.replace(/At|EDT/g,'');
        final_res.B_CAR_CA_US= laneClosed(B[0].details.delay,B[0].details.open_lane);
        final_res.B_CAR_US_CA= B[0].enterCanada;
        final_res.B_COM_CA_US= laneClosed(B[2].details.delay,B[2].details.open_lane);
        final_res.B_COM_US_CA= (B[2].enterCanada=='')?"Pending Update":B[2].enterCanada;
        final_res.B_NEXUS_US_CA= (B[1].enterCanada=='')?"Pending Update":B[2].enterCanada;

        final_res.B_NEXUS_CA_US= laneClosed(B[1].details.delay,B[1].details.open_lane);
        final_res.bridge_CAUS_CAR = B[0].details.delay;
        final_res.bridge_CAUS_COM = B[2].details.delay;
        final_res.bridge_CAUS_NEXUS = B[1].details.delay;
        final_res.bridge_USCA_COM = B[2].enterCanada;
        final_res.bridge_USCA_CAR = B[0].enterCanada;
        final_res.bridge_USCA_NEXUS = B[1].enterCanada;
        final_res.estimatedTime=TimeBrige;
     
    }
        if(T==null || pendingUpdate==true){
        final_res.T_CAR_US_CA = '---';
        final_res.T_CAR_CA_US = '---';
        final_res.T_COM_US_CA = '---';
        final_res.T_COM_CA_US = '---';
        final_res.T_NEXUS_US_CA = '---';
        final_res.T_NEXUS_CA_US = '---';
        final_res.tunnel_CAUS = '---';
        final_res.tunnel_USCA = '---';
        final_res.tunnel_time='---';

        final_res.CAcarOnlyNum='---';
        final_res.CAtruckOnlyNum='---';
        final_res.CANEXUSOnlyNum='---';
     
        final_res.UScarOnlyNum='---';
        final_res.UStruckOnlyNum='---';
        final_res.USNEXUSOnlyNum='---';
            
        }
        // tunnel part
        final_res.T_CAR_US_CA = laneClosed(T[1].time,T[1].car);
        final_res.T_CAR_CA_US = laneClosed(T[0].time,T[0].car);
        final_res.T_COM_US_CA = laneClosed(T[1].time,T[1].truck);
        final_res.T_COM_CA_US = laneClosed(T[0].time,T[0].truck);
        final_res.T_NEXUS_US_CA = laneClosed(T[1].time,T[1].NEXUS);
        final_res.T_NEXUS_CA_US = laneClosed(T[0].time,T[0].NEXUS);
        final_res.tunnel_CAUS = T[0].time;
        final_res.tunnel_USCA = T[1].time;
        final_res.CAcarOnlyNum=T[0].carOnlyNum;
        final_res.CAtruckOnlyNum=T[0].truckOnlyNum;
        final_res.CANEXUSOnlyNum=T[0].NEXUSOnlyNum;
        var today = new Date();
        final_res.tunnel_time=formatAMPM(new Date);
     
        final_res.UScarOnlyNum=T[1].carOnlyNum;
        final_res.UStruckOnlyNum=T[1].truckOnlyNum;
        final_res.USNEXUSOnlyNum=T[1].NEXUSOnlyNum;
        
        
        final_res.CarCAUS = whoIsFaster(final_res.CAcarOnlyNum,T[0].time,B[0].details.delay);
        final_res.CarUSCA = whoIsFaster(final_res.UStruckOnlyNum,T[1].time,B[0].enterCanada);
        final_res.COMCAUS = whoIsFaster(final_res.CAtruckOnlyNum,T[0].time,B[2].details.delay);
        final_res.COMUSCA = whoIsFaster( final_res.UStruckOnlyNum,T[1].time,B[2].enterCanada);
        final_res.NexusCAUS = whoIsFaster(final_res.CANEXUSOnlyNum,T[0].time,B[1].details.delay);

        
        
        //console.log(final_res);
        arr.push(final_res);


        return arr;

}

function whoIsFaster(tunnelLane,tunnel,bridge){
    if(pendingUpdate==true){
        return 'Pending Update';
    }
    else if(tunnelLane!='Closed' && tunnelLane!='0'){

        if(tunnel=="No delay" && bridge=="No delay")
        {
            return 'No wait time for Tunnel and Bridge';
        }else if (tunnel=="Closed" && bridge!="No delay")
        {
            return 'Bridge is faster';
        }
        else if(tunnel=='---' || bridge=='---'){
            return 'Pending Update';
        }
        else
        {
            var t = _.toInteger(tunnel);
            var b = _.toInteger(bridge);
            var ab = Math.abs(t-b);
            if(t<b)
            {
                return 'Tunnel is '+ab+' mn faster than Bridge';
            }
            else if (t>b)
            {
                return 'Bridge is '+ab+' mn faster than Tunnel';
            }
            else{
                return 'Same Wait Time';
            }
    }}
    else if (tunnel=='Closed' || tunnelLane=='0')
        return 'This tunnel lane is closed';
}






/**************** Additional Functions ***************/

// function getJson ---> take the array of the data from the web , convert to json object
function bridgeFormat(data)
{

    // global array 
    var Gates = [];
    // initial temp var

    for ( var i =0 ; i< 15 ; i++)
    {   
        var temp =data[i];
        //console.log(data.length);
        if(temp!="FAST"&& temp!="Ready Lane")
        {
            if((i%3==0)){
                // get lane name
                var gate={
                    "lane": "",
                    "details": "",

                };
                gate.lane= data[i];
            }
            else if(i>0 && (i-1)%3==0){

                // get details to more details by calling the the function 
                var details =  detailsString(data[i]);
                gate.details = details;
            }else if(i>0 && (i+1)%3==0)
            {
            
                // get enter canada status
                var eCanada= data[i].replace(/minutes/g,'mn');
    
                //console.log(eCanada+'enter canada');
                // add into object
                    gate.enterCanada=eCanada;
                // push to array to start a new object
                Gates.push(gate);
            }
        }
        else
        {  
            i+=2;
        }
    }
           
    
   //console.log('this is gates'+Gates);
    
    return Gates;

}





/*
 
console.log('helllllllloooo');

var temp = detailsString('At 3:00 am EDT\nno delay\n2 lane(s) open');
console.log(temp);
console.log('helllllllloooo');
*/

function detailsString(details){

    
    // change string to lower case
    var temp = details.split('\n');
   
   //console.log(temp+'split array of delailts => 3 arrays');
    //console.log(temp[0]);
    //console.log(temp[1]);
    //console.log(temp[2]);
    // replace 
    //console.log(details+' ORIGIN STRING');
    //console.log(temp+' arr cut');

    
    // check if lane is close then return no data is added
    if( details.includes('Lanes Closed')){
        //console.log(temp +'\tlane closed');
         return {
    
                
                "time" : temp[0],
                "delay": "Closed",
                "open_lane" : 'Closed'
            
        };

    }
    else
    {



        var delay =(temp[1].match(/no delay/g))? true:false;
      console.log(temp[1]+'*****'+delay);

        var lane = temp[2].match(/[0-9]+/g);
       lane = laneCheck(lane)
        //console.log('before'+temp[2]+'after match'+lane)
        // delay
        
        if(!delay){
            var time = temp[1].replace(/[a-zA-Z\s]/g,'');
          //  console.log(time+'delay time mn');
            //console.log(time[1]);
            
            return {
                    "time" : temp[0],
                    "delay": time,
                    "open_lane" : lane,

            };

        

        }else // no deplay
        {
           return {
            
            
                    "time" : temp[0],
                    "delay": "No delay",
                    "open_lane" : lane,
            
            };  
           

        }


    }

}


// function turn content to Json format done
function tunnelJsonFormat(data){

    _.pull(data,'\n','');
    // initial 2 empty arrays
    var CAUS  =[];
    var USCA     =[];
    var mid = data.length/2;
 
     // store each element into the new array
     for ( var i = 0 ; i < mid;i++)
     {
         var temp1 = data[i];
         var temp2 = data[mid+i]
         CAUS[i]=temp1;
         USCA[i]=temp2;
 
     }
 
     
     // our temp Json array
       var dataJson = [];
     // our Json objets
       var ca ={};
       var us = {};
 
     
       
     // remove < or > store all value in Object
       var time1 = removeLG(CAUS[0]);
       ca.direction ="CAUS";
       ca.time = time1;
       ca.car = laneCheck(CAUS[1]);
       ca.truck = laneCheck(CAUS[2]);
       ca.NEXUS = laneCheck(CAUS[3]);
       ca.carOnlyNum=CAUS[1];
       ca.truckOnlyNum=CAUS[2];
       ca.NEXUSOnlyNum=CAUS[3];
     
     // repeat process for US to CA
 
       var time2 = removeLG(USCA[0]);
       us.direction = "USCA";
       us.time =time2;
       us.car = laneCheck(USCA[1]);
       us.truck = laneCheck(USCA[2]);
       us.NEXUS = laneCheck(USCA[3]);
       us.carOnlyNum=USCA[1];
       us.truckOnlyNum=USCA[2];
       us.NEXUSOnlyNum=USCA[3];
     
     // push them into array
     dataJson.push(ca);
     dataJson.push(us);
   
    console.log(dataJson);

    return dataJson;
 
 }
 // remove < or > depend on sign
 function removeLG(line){
         return line.replace(/[<>A-Z\s]/g,'');
 }

// check if lane is closed , 0 ,1 or +

function laneCheck(lane){
    if(lane=='0')
    {
        return 'Closed';
    }
    else if ( lane=='1')
    {
        return '1 lane';
    }
    return lane+' lanes';
}
function laneClosed(time,closed){
    if (closed =='Closed')
        return 'Closed';
    else if ( time =='No delay' && closed!='Closed')
        return time+'/'+closed;
    else
        return time+' mn/'+closed;
}
function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
  }