/*
  By: Hopkins; 
  Date: 2017-08-14;
  github: http://github.com/hopkins0;
*/

$(function() {
  var frozen_on = true;
  var API_URL = 'http://mictlan.utm.mx:5000';

  var contestInfo = {};
  $.ajax({
      url: API_URL + "/api/1.0/contest-activo-informacion",
      dataType: "json",
      async: false,
      success: function( response ) {
          $('#contest-title').text(response.data.contestname);
          contestInfo = response.data;
      }
  });

  var contestProblems = [];
  $.ajax({
      url: API_URL + "/api/1.0/problemas",
      dataType: "json",
      async: false,
      success: function( response ) {
          contestProblems = response.data;

          $("#score-table-header > tr > th").remove();
          $("#score-table-header > tr").append('<th class="equipo-ranking">#</th>');
          $("#score-table-header > tr").append('<th class="equipo-nombre">Equipo</th>');
          $("#score-table-header > tr").append('<th class="equipo-aceptados">#AC</th>');
          $("#score-table-header > tr").append('<th class="equipo-time">Tiempo</th>');

          for (var i = 0; i < response.data.length; i++) {
            var p = response.data[i];
            var e = ['<th class="problema">', p.shortname,
                    '<span style="color:#'+ p.color +'"> <i class="shadow fa fa-circle"></i></span>',
                    '</th>'];
            $("#score-table-header > tr").append(e.join(''));
          }
      }
  });

  var contestUsers = [];
  $.ajax({
      url: API_URL + "/api/1.0/equipos",
      dataType: "json",
      async: false,
      success: function( response ) {
          contestUsers = response.data;
          $("#score-table-body > tr").remove();
          
          for (var i = 0; i < response.data.length; i++) {
            var u = response.data[i];
            var e = ['<tr>', '<th scope="row">1</th>','<td>'+ u.userfullname +'</td>',
                     '<td>0</td>', '<td>0</td>','</tr>'];
            $("#score-table-body").append(e.join(''));
          }
      }
  });



  /* Problem status:
   *  -2 => Wrong answer
   *  -1 => judging
   *   0 => problem has been not tryed
   *   1 => problem has been solved
   *   2 => problem has been solved, first time solved
   *   3 => First AC in the contest
  */

  var StatusEnum = Object.freeze({
    WRONG_ANSWER: -2,
    JUDDING: -1,
    NOT_ATTEMPT: 0,
    ACCEPTED: 1,
    FIRST_ACCEPTED_PROBLEM: 2,
    FIRST_ACCEPTED_CONTEST: 3
  });
  var tableScore = [];
  var problemStatus = [];
  function initilizeTable() {
    for (var i = 0; i < contestUsers.length; i++) {
      var row = []
      for (var j = 0; j < contestProblems.length; j++) {
        row.push({'status': 0,
                  'penaltyTime': 0,
                  'attempts':0,
                  'attemptsBefore': []
                }); 
      }
      tableScore.push(row);
      
    }

    for (var j = 0; j < contestProblems.length; j++) {
        problemStatus.push(0); 
      }
  }

  function getLastRuns(run = 0) {
    // body...
    var contestRuns = [];
    $.ajax({
        url: API_URL + "/api/1.0/envios",
        dataType: "json",
        async: false,
        data: { 
          'last_run' : run
        },
        success: function( response ) {
            contestRuns = response.data;
        }
    });
    return contestRuns
  }

  function getIdForUserNumber(id){
    for (var i = 0; i < contestUsers.length; i++) {
      if (contestUsers[i].usernumber == id ) return i;
    }
    return -1;
  }
  function getIdForProblemNumber(id){
    for (var i = 0; i < contestProblems.length; i++) {
      if (contestProblems[i].number == id ) return i;
    }
    return -1;
  }


  function printTable(usersScore) {
    $("#score-table-body > tr").remove();
          
    for (var i = 0; i < usersScore.length; i++) {
      var userId = usersScore[i].id;

      var e = ['<tr>',
               '<th scope="row">'+ (i+1) +'</th>',
               '<td>'+ contestUsers[ userId ].userfullname +'</td>',
               '<td>'+ usersScore[ i ].solvedProblems +'</td>',
               '<td>'+ parseInt(usersScore[ i ].penaltyTime) +'</td>'];


      for (var j = 0; j < contestProblems.length; j++) {
        var cell = tableScore[ userId ][ j ];

        var info = [ '<td class="'];
        if (cell.status == StatusEnum.ACCEPTED) info.push('ACC');
        if (cell.status == StatusEnum.FIRST_ACCEPTED_PROBLEM) info.push('FPAC');
        if (cell.status == StatusEnum.FIRST_ACCEPTED_CONTEST) info.push('FPS');
        if (cell.status == StatusEnum.WRONG_ANSWER) info.push('WA');
        if (cell.status == StatusEnum.JUDDING) info.push('JD');

        info.push('">');

        if (cell.status != StatusEnum.NOT_ATTEMPT){
          if (cell.status >= StatusEnum.ACCEPTED){
            info.push('<strong>');
            info.push(parseInt(cell.penaltyTime));
            info.push('</strong>');
          }
          
          if (cell.attemptsBefore.length > 0){
            info.push('<small>');
            info.push(' ('+ cell.attemptsBefore.length +')');
            info.push('</small>');
          }
        }
        info.push('</td>');
        e.push(info.join(''));
      }
      e.push('</tr>');
      $("#score-table-body").append(e.join(''));

    }

  }


  var last_run = -1
  function updateTable(){
    console.log("UPDATING TABLE");
    var runs = getLastRuns(last_run);

    for (var i = 0; i < runs.length; i++) {
      var r = runs[i];
      var userId = getIdForUserNumber(r.usernumber);
      var problemId = getIdForProblemNumber(r.problemnumber);


      last_run = r.runnumber;
      if (userId == -1 || problemId == -1) continue;

      var cell = tableScore[ userId ][ problemId ];


      if (r.yes == true){
        var f = problemStatus.find(function (v) { return v >= 1; });
        if (typeof f != 'undefined') {
          if (problemStatus[ problemId ] == 0){
            cell.status = StatusEnum.FIRST_ACCEPTED_PROBLEM;
            cell.penaltyTime = r.rundatediff / 60;
          } else {
            if (cell.status <= StatusEnum.NOT_ATTEMPT) {
              cell.penaltyTime = r.rundatediff / 60;
              cell.status = StatusEnum.ACCEPTED;
            }
          }
        } else {
          if (cell.status <= StatusEnum.NOT_ATTEMPT){
            cell.status = StatusEnum.FIRST_ACCEPTED_CONTEST;
            cell.penaltyTime = r.rundatediff / 60;
          }
        }
        problemStatus[ problemId ] = 1;

        for(var v = cell.attemptsBefore.length - 1; v >= 0; v--) {
          if(cell.attemptsBefore[v] === r.runnumber) {
            cell.attemptsBefore.splice(v, 1);
          }
        }

      } else {

        if (r.runstatus == 'judged' || r.runstatus == 'judged+') {

          if (cell.status == StatusEnum.NOT_ATTEMPT){
            cell.status = StatusEnum.WRONG_ANSWER;
            cell.attempts = 1;
            cell.attemptsBefore = [r.runnumber];
          }else if (cell.status == StatusEnum.WRONG_ANSWER){
            cell.attempts++;
            cell.attemptsBefore.push(r.runnumber);
          } else if (cell.status == StatusEnum.ACCEPTED) {
            cell.attempts++;
          }
          // To check if the team sends again the problem that
          // hasbeen already accepted
          // else if (cell.status >= StatusEnum.ACCEPTED) {
          //   cell.attempts++;
          // }
        } else {
          if (cell.status <= StatusEnum.NOT_ATTEMPT)
            cell.status = StatusEnum.JUDDING;
        }
      }

      if (frozen_on && r.rundatediff > contestInfo.contestlastmilescore){
        cell.status = StatusEnum.JUDDING;
      }
    }


    var usersScore = [];
    for (var i = 0; i < contestUsers.length; i++) {
      usersScore.push({
        'id': i,
        'solvedProblems': 0,
        'penaltyTime': 0
      });
    }

    for (var i = 0; i < contestUsers.length; i++) {
      for (var j = 0; j < contestProblems.length; j++) {
        var cell = tableScore[ i ][ j ];
        

        var uniqueRunNumber = [];
        $.each(cell.attemptsBefore, function(i, el){
            if($.inArray(el, uniqueRunNumber) === -1) uniqueRunNumber.push(el);
        });

        cell.attemptsBefore = uniqueRunNumber;

        if (cell.status >= StatusEnum.ACCEPTED){
          usersScore[ i ].solvedProblems ++;
          usersScore[ i ].penaltyTime += parseInt(cell.penaltyTime) + parseInt(cell.attemptsBefore.length * contestInfo.contestpenalty / 60);
        }
      }
    }

    usersScore.sort(function (a, b) {
      if (a.solvedProblems > b.solvedProblems) return -1;
      if (a.solvedProblems == b.solvedProblems){
        if (a.penaltyTime == b.penaltyTime) return -1;
        if (a.penaltyTime < b.penaltyTime) return -1;
      }
      return 1;
    });


    // request the last 5 RUNS, if it is 
    last_run = last_run - 5;
    printTable(usersScore);
  }


  var refreshIntervalId = -1;
  $('#final').click(function() {
    frozen_on = false;

    if (refreshIntervalId != -1){
      clearInterval(refreshIntervalId);
    }
    updateTable();  
  });

  initilizeTable();
  updateTable();

  // Update the table each  five minutes.
  refreshIntervalId = setInterval(updateTable, 50000);

});