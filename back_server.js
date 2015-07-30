var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express=require('express');
var serialize = require('node-serialize');
var fs = require('fs');

app.use('/js',express.static(__dirname + '/js'));


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/reset', function(req, res){
var racersSer = serialize.serialize(racers);

fs.appendFile('/home/pi/src/webserver/logs.txt', '\n\n', function (err) {
  // if (err) throw err;
  console.log('The "data to append" was appended to file!');
});

fs.appendFile('/home/pi/src/webserver/logs.txt', racersSer, function (err) {
  // if (err) throw err;
  console.log('The "data to append" was appended to file!');
});
	racers = [];
  res.sendFile(__dirname + '/reset.html');
});


io.on('connection', function(socket){
	console.log('new connection');
	io.emit('raceData', racers);
  socket.on('fetch', function(msg){
    io.emit('raceData', racers);
  });
  // io.emit('chat message', 100);

  // emit all current laps

  for(var i=0;i<racers.length;i++)
  {
  	for(var j=1;j<racers[i].val.length;j++)
  	{
  		var laplength = racers[i].val[j] - racers[i].val[j-1];
  		// io.emit('racer1', format_time(laplength));
  	}
  	// io.emit('racer1', racers[i].val);
  }

  // io.emit('racer1', racers);

});

http.listen(80, function(){
  console.log('listening on *:80');
});


// Racer Info
var racers = [];


var min_lap_millis = 5000;

var addTime = function(r, v)
{
	// r -> racer id
	// v -> time in millis
	for(var i=0;i<racers.length;i++)
	{
		if(racers[i].Id == r)
		{
			var diff = v - racers[i].val[racers[i].val.length-1];
			if(diff > min_lap_millis)
			{
				var laplength = v - racers[i].val[racers[i].val.length-1];
				racers[i].val.push(v);
				return laplength;
			}
			return 0;
		}
	}

	var n = racers.length;
	var x = {};
	x.Id = r;
	x.val = [];
	x.val.push(v);
	racers[n] = x;
	return 0;
};

var format_time = function(val)
{
	var seconds = Math.floor(val/1000);
	var dec = Math.floor(val/100);
	return seconds + ":" + dec;
};


// IR Sensor stuff

// export GPIO 18 as an output.
var GPIO = require('onoff').Gpio,
    led = new GPIO(16, 'out');
    sensor = new GPIO(21, 'in', 'both');

    var http = require('http');
 
 console.log('hello world');

var allowed_codes = [];
allowed_codes[15] = true;
//allowed_codes[14] = true;
//allowed_codes[13] = true;
allowed_codes[1] = true;
allowed_codes[2] = true;

var decode = function(val) {
	var ret = 0;
	// console.log(val);

	if(val.length < 13)
	{
		return 0;
	}


	// skip 1st as its the header and pick only 4

	var s = "";

	var ind = 0;

	for(var i=val.length-1;i>0;i--)
	{
		
		if(val[i] > 1000 && val[i] < 2000)
		{
			ret += Math.pow(2, ind);
			s+= "1";
		}
		else if(val[i] > 400 && val[i] < 800)
		{
			s+="0";
		}
		else
		{
			// not a good reading
			return 0;
		}
		ind++;
		if(ind > 11)
		{
			break;
		}
	}

	// console.log(s);

	return ret;
	// return Math.floor(ret);
}

// pass the callback function to the
// as the first argument to watch() and define
// it all in one step

var count = 0;

var pulse_start = 0;
var pulse_end = 0;
var current_state = 0; // 0 waiting -> 1 high , 2 pending
var header_space = 3000;  // 1000 micro seconds header space
var prev_pulse = 0;
var pulse = [];

sensor.watch(function(err, state) {
  
  // check the state of the button
  // 1 == pressed, 0 == not pressed
  if(state == 0) {
    // turn LED on
    led.writeSync(1);
  } else {
    // turn LED off
    led.writeSync(0);
  }

	var tt = process.hrtime();
	var nano = tt[0]*1e9 + tt[1];
	var micros = nano/1000;

	// current_state = state;
	if(state == 0)
	{

		pulse_start = micros;
		// var empty = micros-pulse_end;
		// empty = empty *-1;
		// pulse.push(empty);
		// IR Received
		if(micros-prev_pulse > header_space)
		{
			// new pulse
			//console.log(pulse);
			// console.log('pulse start');

			var data = decode(pulse);
			// console.log(data);

			if(data == 0)
			{
				// bad data 
				// console.log(pulse);
			}

			pulse = [];
			var laplength = addTime(data,micros/1000);
			if(laplength > 0)
			{
				// io.emit('racer1', format_time(laplength));	
				io.emit('raceData', racers);
			}
			
			// io.emit('chat message', data);
			
		}


	}
	else
	{
		// IR down 
		pulse.push(micros-pulse_start);
		pulse_end = micros;
	}

	prev_pulse = micros;
  
});
