  $(document).ready(function () {
      $("#feedback-form-link").click(function (e) {
          e.preventDefault();
          if (reqFromAndroidApp) { //make sure this function can't be accidentally run from outside the Android app
              //noinspection JSUnresolvedVariable
              Android.openFeedbackForm();
          }
      });

      $("#match-container").on("click","div > div.match-info-card div.mdl-card__title > button.star-match-btn","",matchToggleStar);
      serviceWorkerInit();

  });
  var page = "index"; //so getUserDefaults in global.js can know to call getTeamMatches when it's done
  function matchToggleStar() {
      var match = $(this).parent().find("h4").text();
      var state = $(this).children("i").text();
      var tournament = $("#tournament-select").val();
      var starLabel = $(this).children("i");
      if (state === "star_border") {
          console.log("star match");
          console.log("/tournament_match_stars/" + userDefaults.tournament + "/" + match);
          firebase.database().ref("/tournament_match_stars/" + userDefaults.tournament + "/" + match).set(true).then(function() { //this line not running
              //starLabel.text("star");
          });

      } else if (state === "star") {
          console.log("unstar match");
          firebase.database().ref("/tournament_match_stars/" + userDefaults.tournament + "/" + match).remove().then(function() {
              //starLabel.text("star_border");
          });


      }
      console.log(match,state);
  }

  var reqFromAndroidApp = false;
  var matchesVisible = [];
  var lastTournamentLoaded = -1;

  function goToScoutingForm() {
      window.location = "/scout/" + $('#org-select').val() + "/" + $('#tournament-select').val();
  }

  function processResults(value) {
      var currentMatch;
      var alliance;
      var effectiveAllianceColor; //the color the card representing this match should be; if the match already has a score, then this won't be the same as this team's color in the match
      var alliancePosition;
      var partner;
      var opponents;
      var detailsURL;
      var winningAlliance; //the alliance, if any (e.g., if there was a tie), that won the match
      var matchResult; //whether this team won, lost, or tied this match
      //variables that need to be reset to their original values each iteration
      var matchDone = false;
      var matchResultsString = "";
      var scoresString = "";
      var scoreAvailable = false,
          androidAppUrl, matchDetailsJsAndroid, matchLetter, matchDescriptor;
      $("#match-container").empty(); //this is actually the second emptying of this div; this time, we're removing the loading indication now that the match data has loaded and just needs to be processed
      matchesVisible = []; //reset the list of matches being displayed

      console.log(value);
      console.log("queryTeam", queryTeam);
      if (value.results.length === 0) {
          $("#match-container").append("<i class='material-icons'>info_outline</i> No matches found for this team");
      }

      //get division for this team and save to Firebase
      var division = value.results[0].division;
      firebase.database().ref("/tournaments/" + userDefaults.tournament + "/divisions/" + queryTeam).set(division).then(function(s) {
          console.log("saved team division successfully");
      });

      for (var i = 0; i < value.results.length; i++) {
          currentMatch = value.results[i];
          console.log(currentMatch);
          console.log("currentMatch.red1 = " + currentMatch.red1 + "; team = " + queryTeam);
          //determine alliance and position on alliance
          if (currentMatch.red1 === queryTeam) {
              console.log("red1 matches");
              alliance = "red-alliance";
              alliancePosition = "red1";
          }
          else if (currentMatch.red2 === queryTeam) {
              alliance = "red-alliance";
              alliancePosition = "red2";
          }
          else if (currentMatch.red3 === queryTeam) {
              alliance = "red-alliance";
              alliancePosition = "red3";
          }
          else if (currentMatch.blue1 === queryTeam) {
              alliance = "blue-alliance";
              alliancePosition = "blue1";
          }
          else if (currentMatch.blue2 === queryTeam) {
              alliance = "blue-alliance";
              alliancePosition = "blue2";
          }
          else if (currentMatch.blue3 === queryTeam) {
              alliance = "blue-alliance";
              alliancePosition = "blue3";
          }
          if (parseInt(currentMatch.scored)) { //if this match has been scored
              scoreAvailable = true;
              effectiveAllianceColor = "match-done";
          }
          else {
              effectiveAllianceColor = alliance;
          }
          //determine partner for this match
          if (alliance === "red-alliance") {
              switch (alliancePosition) {
              case "red1":
                  partner = currentMatch.red2; //this team is red1, so the partner is red2
                  if (currentMatch.round >= 3) { //also add the third team for elimination matches
                      partner += "/" + currentMatch.red3;
                  }
                  break;
              case "red2":
                  partner = currentMatch.red1; //this team is red2, so the partner is red1
                  if (currentMatch.round >= 3) { //also add the third team for elimination matches
                      partner += "/" + currentMatch.red3;
                  }
                  break;
              case "red3":
                  partner = currentMatch.red1 + "/" + currentMatch.red2; //no need for an if statement to check if this is an elimination match for this case since the presence of red3 as an alliance position indicates this
                  break;
              }
          }
          else if (alliance === "blue-alliance") {
              switch (alliancePosition) {
              case "blue1":
                  partner = currentMatch.blue2; //this team is blue1, so the partner is blue2
                  if (currentMatch.round >= 3) { //also add the third team for elimination matches
                      partner += "/" + currentMatch.blue3;
                  }
                  break;
              case "blue2":
                  partner = currentMatch.blue1; //this team is blue2, so the partner is blue1
                  if (currentMatch.round >= 3) { //also add the third team for elimination matches
                      partner += "/" + currentMatch.blue3;
                  }
                  break;
              case "blue3":
                  partner = currentMatch.blue1 + "/" + currentMatch.blue2; //no need for an if statement to check if this is an elimination match for this case since the presence of red3 as an alliance position indicates this
                  break;
              }
          }
          //determine and construct a string containing both teams in the opposing alliance
          if (alliance === "red-alliance") {
              opponents = currentMatch.blue1 + "/" + currentMatch.blue2;
              if (currentMatch.round >= 3) { //if this is an elimination match, add the third opposing team
                  opponents += "/" + currentMatch.blue3;
              }
          }
          else {
              opponents = currentMatch.red1 + "/" + currentMatch.red2;
              if (currentMatch.round >= 3) { //if this is an elimination match, add the third opposing team
                  opponents += "/" + currentMatch.red3;
              }
          }
          //output the match result if available
          if (scoreAvailable) {
              //determine which alliance won
              if (parseInt(currentMatch.redscore) > parseInt(currentMatch.bluescore)) {
                  winningAlliance = "red-alliance";
                  scoresString = '<span class="red-alliance-text">' + currentMatch.redscore + '</span>-<span class="blue-alliance-text">' + currentMatch.bluescore + '</span>'; //higher score always goes first
              }
              else if (parseInt(currentMatch.redscore) < parseInt(currentMatch.bluescore)) {
                  winningAlliance = "blue-alliance";
                  scoresString = '<span class="blue-alliance-text">' + currentMatch.bluescore + '</span>-<span class="red-alliance-text">' + currentMatch.redscore + '</span>'; //higher score always goes first
              }
              else { //tie
                  winningAlliance = "tie";
                  scoresString = '<span class="red-alliance-text">' + currentMatch.redscore + '</span>-<span class="blue-alliance-text">' + currentMatch.bluescore + '</span>'; //the order doesn't really matter, so put red alliance first
              }
              //console.log(winningAlliance);
              if (alliance === winningAlliance) {
                  matchResult = "won";
              }
              else if (winningAlliance === "tie") {
                  matchResult = "tied";
              }
              else {
                  matchResult = "lost";
              }
              if (winningAlliance === "tie") {
                  matchResultsString ="<strong>You "+ matchResult +"</strong> "+ scoresString +"<br />";
              }
              else {
                  matchResultsString = '<span class="' + alliance + '-text"><strong>You ' + matchResult + '</strong></span> ' + scoresString +"<br />";
              }
          }
          //console.log("reqFromAndroidApp: " + reqFromAndroidApp);
          //console.log("typeof reqFromAndroidApp: " + typeof reqFromAndroidApp);
          if (reqFromAndroidApp === "true") { //if the user is using the WARS Web Android app.  The if statement is formatted like this because reqFromAndroidApp is a string (apparently.)
              androidAppUrl = "&fromandroidapp"; //add a URL GET parameter so that the details page doesn't show the header
              matchDetailsJsAndroid = ' onclick="Android.deselectNavDrawerItems()"'; //add a function that runs when the match details link is clicked in the Android app to deselect the currently selected item in the nav drawer
              //console.log("Line 111 ran");
          }
          else {
              androidAppUrl = ""; //if the user is not using the Android app, don't add anything to the URL
              matchDetailsJsAndroid = ""; //if the user is not using the Android app, don't add any function to be run when the match details link is clicked
              //console.log("Line 114 ran");
          }
          //console.log("AndroidAppUrl: " + androidAppUrl);
          //for now, the first part of this URL will be hard-coded; in the future there will need to be a method to keep track of what users are using what WARS instances
          detailsURL = "/scout/matchinfo/" + $('#org-select').val() + "/" + $('#tournament-select').val() + "/" + value.results[i].matchnum;
          if (parseInt(value.results[i].round === 1) || parseInt(value.results[i].round) === 2) {
              matchLetter = parseInt(currentMatch.round) === 1 ? "P" : "Q";
              matchDescriptor = matchLetter + currentMatch.matchnum;
          }
          else { //this is a quarterfinals, semifinals, or finals match
              switch (parseInt(currentMatch.round)) {
                  case 3: //quarterfinal matches, QF1-1
                      matchLetter = "QF";
                      break;
                  case 4: //quarterfinal matches, QF1-1
                      matchLetter = "SF";
                      break;
                  case 5: //quarterfinal matches, QF1-1
                      matchLetter = "F";
                      break;
              }
              matchDescriptor = matchLetter + currentMatch.instance + "-" + currentMatch.matchnum;
          }
          var starIcon = '<button class="mdl-button mdl-js-button mdl-button--icon star-match-btn"><i id="' + matchDescriptor + '" class="material-icons">star_border</i></button>';
          matchesVisible.push(matchDescriptor);

          var matchInfo = '<div class="mdl-cell--2-col mdl-cell--3-col-tablet mdl-cell--3-col-desktop"><div class="match-info-card mdl-card mdl-shadow--2dp ' + effectiveAllianceColor + '"><div class="mdl-card__title"><h4 id="match-num">' + matchDescriptor + '</h4>' + starIcon + '</div><div class="mdl-card__supporting-text">' + matchResultsString + '<em>With</em> ' + partner + '<br /><em>Against</em> ' + opponents + '</div><div class="mdl-card__actions mdl-card--border"><a href="' + detailsURL + '"' + matchDetailsJsAndroid + ' class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">Details</a><div class="mdl-layout-spacer"></div><i class="material-icons">info_outline</i></div></div></div>';
              //console.log(matchInfo);
          $("#match-container").append(matchInfo);
          //reset variables
          matchDone = false;
          matchResultsString = "";
          scoreAvailable = false;
          scoresString = "";
      }


      starsRef = firebase.database().ref("/tournament_match_stars/" + userDefaults.tournament);
      starsRef.off();
      starsRef.on('child_added',function(snapshot) {
          console.log("value listener function ran");
          console.log(snapshot.key,snapshot.val());
          $("button > i#" + snapshot.key).text("star");
      });

      starsRef.on('child_removed',function(snapshot) {
          console.log("value removed listener function ran");
          console.log(snapshot.key,snapshot.val());
          $("button > i#" + snapshot.key).text("star_border");
      });
  }

  function getTeamMatches() {
      console.log("called2");
      console.log(userDefaults);
      queryTeam = userDefaults.team;
      var sku = userDefaults.tournamentSku;
      console.log("tournament sku id", userDefaults.tournamentSku);
      var url = "/api/" + userDefaults.tournamentSku + "/" + userDefaults.team;
      console.log(url);
      $.ajax(url, {
          success: processResults
      });
      console.log("sku", sku);
  }
