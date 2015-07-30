/*  Code for lap timer server */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');
var serialize = require('node-serialize');
var fs = require('fs');

app.use('/js', express.static(__dirname + '/js'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/reset', function (req, res) {
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


io.on('connection', function (socket) {
    // console.log('new connection');
    io.emit('raceData', racers);
    socket.on('fetch', function (msg) {
        io.emit('raceData', racers);
    });
    
    // emit all current laps

    for (var i = 0; i < racers.length; i++) {
        for (var j = 1; j < racers[i].val.length; j++) {
            var laplength = racers[i].val[j] - racers[i].val[j - 1];
            // io.emit('racer1', format_time(laplength));
        }
    }
});

http.listen(80, function () {
    console.log('listening on *:80');
});


// Racer Info
var racers = [];

// Constants
var min_lap_millis = 5000;
var decode_bit_length = 7;  // decode bit length + header space

var addTime = function (r, v) {
    // r -> racer id
    // v -> time in millis
    for (var i = 0; i < racers.length; i++) {
        if (racers[i].Id == r) {
            var diff = v - racers[i].val[racers[i].val.length - 1];
            if (diff > min_lap_millis) {
                var laplength = v - racers[i].val[racers[i].val.length - 1];
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

var format_time = function (val) {
    var seconds = Math.floor(val / 1000);
    var dec = Math.floor(val / 100);
    return seconds + ":" + dec;
};


// IR Sensor stuff

// export GPIO 18 as an output.
var GPIO = require('onoff').Gpio,
    led = new GPIO(16, 'out');
sensor = new GPIO(21, 'in', 'both');

var http = require('http');

var allowed_codes = [];
allowed_codes[15] = true;
//allowed_codes[14] = true;
//allowed_codes[13] = true;
allowed_codes[1] = true;
allowed_codes[2] = true;

var decode = function (val) {
    var ret = 0;

    // not trying to check data here, all the length requirements are done already
    // if (val.length < decode_bit_length) {
        // Not enough data to decode
       //  return 0;
    // }

    var s = "";

    var ind = 0;

    for (var i = val.length - 1; i > 0; i--) {

        if (val[i] > 1000 && val[i] < 2000) {
            ret += Math.pow(2, ind);
            s += "1";
        }
        else if (val[i] > 400 && val[i] < 800) {
            s += "0";
        }
        else {
            // not a good reading
            return 0;
        }
        ind++;

        // decode full data
        // if (ind > 11) {
        //     break;
        // }
    }

    return ret;
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

var show_led_status = false;

sensor.watch(function (err, state) {

    // Show led status only when available
    if (show_led_status) {
        if (state == 0) {
            // turn LED on
            led.writeSync(1);
        } else {
            // turn LED off
            led.writeSync(0);
        }
    }

    var tt = process.hrtime();
    var nano = tt[0] * 1e9 + tt[1];
    var micros = nano / 1000;

    // current_state = state;
    if (state == 0) {
        pulse_start = micros;
    }
    else {
        // IR down 
        var pulse_duration = micros - pulse_start;
        if (pulse_duration > 2000) {
            // this is a header space 
            // reset the input
            pulse = [];
        }

        if (pulse.length == 0 && pulse_duration < 2000) {
            // first pulse duration is bad and we cannot decode it, so return
            return;
        }

        pulse.push(pulse_duration);
        pulse_end = micros;
        if (pulse.length >= decode_bit_length) {
            // we got a full pulse we can decode
            var data = decode(pulse);
            // console.log(data + "," + pulse.length);
            if (data != 0) {
                // understandable pulse
                var laplength = addTime(data, micros / 1000);
                if (laplength > 0) {
                    io.emit('raceData', racers);
                }
            }

            // clear the pulse as it makes no sense if we have more data than we want to decode
            pulse = [];
        }
    }

    prev_pulse = micros;

});
