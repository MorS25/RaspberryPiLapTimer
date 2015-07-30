Lap timer for racing quadcopters using Arduino and Raspberry pi
arduino code on the quadcopter sends a IR code 6 bits long with header space of 2200 and mark as 1200us and space as 600us
raspberry pi code in node.js reads from IR sensor the unique code of each quadcopter and upon passing the pi it starts recording the laps.
RPI needs to be setup as an access point so that the web page hosting the server shows the laps of each racer and shows the winner with some highlighting and the best laps etc.
