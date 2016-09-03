"use strict";
var mqtt      = require("mqtt");
var connected = [];


function listenForMessage () {
     var state = "x"

     Homey.manager('flow').on('trigger.got_mqtt_message', function( callback, args, state ){
        // connect to the MQTT broker
        var client  = mqtt.connect('mqtt://' + Homey.manager('settings').get('url'))
        //console.log ("state = " + state + " topic = " + args.mqtt_topic)

        // If the topic that triggered me the topic I was waiting for?
        if (state == args.mqtt_topic) {
           client.end()
           callback( null, true )
        }

        // This is not the topic I was waiting for and it is a known topic
        else if (state !== args.mqtt_topic & connected.indexOf(args.mqtt_topic) !== -1) {
           client.end()
           callback( null, false )
        }

        // this is (still) an unknown topic. We arrive her only 1 time for every topic. The next time the if and else if will
        // trigger first.
        else {
           // Fill the array with known topics so I can check if I need to subscribe
           connected.push(args.mqtt_topic)
           // On connection ...
           client.on('connect', function () {
              // subscribe to the topic
              client.subscribe(args.mqtt_topic)
              console.log("waiting "+ args.mqtt_topic);
              // Wait for any message
              client.on('message',function(topic,message, packet) {
              //  console.log("received '" + message.toString() + "' on '" + topic + "'");
                 // Fill the state and pass it as a parameter to the flow manager
                 state = topic
				 LogEntryPoint(topic, message);
                 // trigger the flow, it will end up in the first if above
                 Homey.manager('flow').trigger('got_mqtt_message', {
                    mqtt_message: message.toString()
  	             }, state);
              });
          });
       };
   });
}
function LogEntryPoint(topic, message){

	console.log("received '" + message.toString() + "' on '" + topic + "'");
	
		   // Get a log, made by this app
		  var logs = []; 
	
			Homey.manager('insights').getLog( topic, function( err , logs){
        		//if( err ) return console.error(err);

			if (logs !==null ){	
				//console.log("Log found");
				
				
			}else
			{
				console.log("Log not found, creating");
				Homey.manager('insights').createLog( topic, {
    				label: {
        			en: topic
    						},
   			 		type: 'number',
    				units: {
        				en: ''
    					},
    				decimals: 2,
    				chart: 'stepLine' // prefered, or default chart type. can be: line, area, stepLine, column, spline, splineArea, scatter
						}, function callback(err , success){
   			 			if( err ) return console.error(err);
						})
		
			}
		   })
			
			
			if (isNaN(message)){
				//is not a number
				console.log("Message rejected from Log,  not numeric");
			}else
			{
				//is  a number
			 Homey.manager('insights').createEntry( topic, Number(message), new Date(), function(err, success){
                    if( err ) return Homey.error(err);
                });
		  	    }
	}


function getArgs () {
	 // Give all the triggers a kick to retrieve the arg(topic) defined on the trigger.
   Homey.manager('flow').trigger('got_mqtt_message', {
                                                      mqtt_message: 'Hallo homey'
                                                     },
                                                     'x',
                                                     function(err, result){
                                                        if( err ) return Homey.error(err)
                                                     });
}

function listenForAction () {
   Homey.manager('flow').on('action.pub_mqtt_message', function( callback, args ){
      // Read the URL from the settings.
      var client  = mqtt.connect('mqtt://' + Homey.manager('settings').get('url'));
      client.on('connect', function () {
         client.publish(args.mqtt_topic, args.mqtt_message);
         console.log("send " + args.mqtt_message + " on topic " + args.mqtt_topic);
         client.end();
      });
      callback( null, true ); // we've fired successfully
   });
}

exports.init = function() {
   // get the arguments of any trigger. Once triggered, the interval will stop
   console.log ("MQTT client Ready")
   var myTim = setInterval(timer, 5000)
   function timer() {
      getArgs()
   }
   Homey.manager('flow').on('trigger.got_mqtt_message', function( callback, args ){
      clearInterval(myTim)
   });

   listenForMessage()
   listenForAction()
}
