var webApp = angular.module('webApp', ['chart.js']);

var max_lap_time = 60;

function sortNumber(a,b) {
    return a - b;
}

webApp.controller('mainCtrl', function ($scope) {

$scope.data = [];
$scope.Data2 = [];



$scope.RaceData = [];

$scope.IsWinner = function(racer, lapNum)
{
  return $scope.LapWinner(lapNum) == racer;
}

$scope.LapWinner = function(lapNum)
{
  // For this racer and lap the winner should have done most laps (max 5) and best total time
  var lapRank = 9999;
  var winnerRacer = -1;
  for(var x=0;x<$scope.Data2.length;x++)
  {
    // each racer check the current lap number
    //console.log($scope.Data2[x].lapRank);
    if($scope.Data2[x].lapRank[lapNum] < lapRank)
    {
      lapRank = $scope.Data2[x].lapRank[lapNum];
      winnerRacer = $scope.Data2[x].Id;
    }
  }

  return winnerRacer;
}

  $scope.SetData2 = function()
  {

    $scope.Data2 = [];
    // $scope.Data2.Racers = []

    var tempAll = [];

    for(var i=0;i<$scope.data.length;i++)
    {
      // $scope.Data2.Racers.push($scope.data[i].Id);
      tempAll = tempAll.concat($scope.data[i].val);
    }
    
    var raceStarts = [];
    tempAll.sort();

    // Identify race starts
    for(var i=tempAll.length-1;i>0;i--)
    {
      var curDiff = tempAll[i]-tempAll[i-1];
      curDiff = curDiff/1000;
      //console.log(curDiff);
      if(curDiff > 60)
      {
        raceStarts.push(tempAll[i]);
      }
    }

    raceStarts.push(0);

    $scope.LapNums = [];
    for(var y=0;y<raceStarts.length;y++)
    {
      $scope.LapNums.push(y);
    }

    $scope.LapCount = $scope.LapNums.length;
    
    

    // Iterate the racers again
    for(var i=0;i<$scope.data.length;i++)
    {
      

      var temp2 = {};
      temp2.besttime = 9999;
      temp2.Id = $scope.data[i].Id;
      temp2.val = [];
      temp2.bestTimes = [];
      temp2.laps = []; // array of arrays of laps with 1st dimension as lap number
      temp2.lapRank = [];

      var c2 = $scope.data[i].val;
      // temp.Id = $scope.data[i].Id;
      // For each racer 
      for(var j=c2.length-1;j>0;j--)
      {
        var laptime = c2[j]-c2[j-1];
        
        // needed if dealing with micros
        // laptime = Math.floor(laptime/10)/100;
        laptime = laptime/1000;
        laptime = laptime.toFixed(2);
        var temp = {};
        temp.Id = $scope.data[i].Id;
        temp.laptime = laptime;
        temp.lapNum = 0;
        for(var x=0;x<raceStarts.length;x++)
        {
          if(raceStarts[x] > c2[j-1])
          {
            temp.lapNum = x+1;
          }
        }

        if(temp.laptime < 60)
        {
          temp2.val.push(temp);
          //console.log(temp.lapNum);
        }
      }

      // Calculate best time in current lap
      for(var z=0;z<temp2.val.length;z++)
      {
        if(temp2.besttime > temp2.val[z].laptime)
        {
          temp2.besttime = temp2.val[z].laptime;
        }

        if(!temp2.bestTimes[temp2.val[z].lapNum])
        {
          temp2.bestTimes[temp2.val[z].lapNum] = 9999;
        }

        if(temp2.bestTimes[temp2.val[z].lapNum] > temp2.val[z].laptime)
        {
          temp2.bestTimes[temp2.val[z].lapNum] = temp2.val[z].laptime;
        }

        // push to laps 
        if(!temp2.laps[temp2.val[z].lapNum])
        {
          temp2.laps[temp2.val[z].lapNum] = [];
        }

        temp2.laps[temp2.val[z].lapNum].push(temp2.val[z].laptime);
      }


      // for each lap calculate the sum of top 3 laps
      for(var h=0;h<temp2.laps.length;h++)
      {
        if(!temp2.laps[h])
        {
          continue;
        }

        

        var th = temp2.laps[h].map(Number);
        th.sort(sortNumber);
        var sum = 9999;
        
        if(th.length > 2)
        {
          // atleast 3 laps are done
          sum = th[0] + th[1] + th[2];
        }
        temp2.lapRank[h] = sum;
        
      }

      // console.log(temp2);
      $scope.Data2.push(temp2);
    }

  }

  $scope.SetData = function()
  {

    $scope.RaceData = [];

    $scope.Racers = [];
    $scope.LapData = [];
    
  	for(var i=0;i<$scope.data.length;i++)
  	{
      if($scope.data[i].Id == 0)
      {
        // skip 0
        continue;
      }


      var temp = {};

      var curData = $scope.data[i];
      temp.Id = curData.Id;
      temp.val = [];
      temp.bestTime = 999999999999999;
      var count = 0;

      $scope.Racers.push("Racer " + curData.Id);

      for(var j=curData.val.length-1;j>1;j--)
      {
        var laptime = (curData.val[j]-curData.val[j-1])/10;
        laptime = Math.floor(laptime)/100;

        if(laptime < temp.bestTime)
        {
          temp.bestTime = laptime;
        }

        if(laptime > max_lap_time)
        {
          // continue;
          temp.val.push(-1);
          continue;
        }
        
        if(count++ < 12)
        {
          temp.val.push(laptime);
        }
      }

      temp.val = temp.val.reverse();

      $scope.LapData.push(temp.val);
      $scope.RaceData.push(temp);
      
  	}
  };


  var socket = io();
  // console.log('registering io 1');
        socket.on('raceData', function(data){
          
          $scope.data = data;
          //$scope.SetData();
          $scope.SetData2();
          $scope.$apply();

        });

    socket.emit('fetch', 'data');

        $scope.options = { scaleShowVerticalLines: false };
		    $scope.labels = ['1', '2', '3', '4', '5'];
		    $scope.series = $scope.Racers;
		    $scope.data2 = $scope.LapData;
});