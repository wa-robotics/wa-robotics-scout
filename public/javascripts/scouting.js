  function firebaseInit() {
      firebase.initializeApp(config);
  }


  var page = "scout";
  var config = {
      apiKey: "AIzaSyAIvK9HrI4P7MJlzjOHmcWeja2BPEInuTo"
      , authDomain: "wa-robotics-scout.firebaseapp.com"
      , databaseURL: "https://wa-robotics-scout.firebaseio.com"
      , storageBucket: "wa-robotics-scout.appspot.com"
      , messagingSenderId: "490870467180"
  };
  firebaseInit();
  firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
          signedInUser = user;
          $("#sign-in").hide();
          getUserDefaults();
      } else {
          window.location = "/auth"; //user is not signed in, redirect to sign in page
      }
  });
  var globalInfo = {};
  var sku;
  function loadMatchData(data, forOtherMatch) {
      console.log("data", data);
      console.log("data.results", data.results);
      console.log("data.status", data.status);
      /*data.status = 0;
      data.error = {message: "Invalid request type specified.  Check API docs." };*/
      //console.log("data.status",parseInt(data.status));
      if (parseInt(data.status)) { //api call successful
          if (data.results.length > 0 && !forOtherMatch) {
              data.results.forEach(function (matchInfo, index, array) {
                  if (parseInt(matchInfo.round) === 2) { //only show qualification matches (round 2)
                      matchesVisible.push(matchInfo.matchnum); //now that we know we can display the match, add it to the array of visible matches
                      var red1Highlight = "", red2Highlight = "", blue1Highlight = "", blue2Highlight = "";
                      var starred = matchInfo.starred;
                      if (starred.indexOf(matchInfo.red1) > -1) {
                          red1Highlight = " option-highlight";
                      }
                      if (starred.indexOf(matchInfo.red2) > -1) {
                          red2Highlight = " option-highlight";
                      }
                      if (starred.indexOf(matchInfo.blue1) > -1) {
                          blue1Highlight = " option-highlight";
                      }
                      if (starred.indexOf(matchInfo.blue2) > -1) {
                          blue2Highlight = " option-highlight";
                      }
                      $('<div class="team-select"><div class="match-row"> <div class="row-team option-red-alliance' + red1Highlight + '">' + matchInfo.red1 + '</div><div class="row-team filler"></div><div class="row-team option-red-alliance' + red2Highlight + '">' + matchInfo.red2 + '</div><div class="match-number">Q' + matchInfo.matchnum + '</div><div class="row-team option-blue-alliance' + blue1Highlight + '">' + matchInfo.blue1 + '</div><div class="row-team filler"></div><div class="row-team option-blue-alliance' + blue2Highlight + '">' + matchInfo.blue2 + '</div></div></div>').insertBefore('#select-other-match');
                  }
              });
          }
          else if (data.results.length >= 0 && forOtherMatch) {
              console.log("inside if statement");
              var needToResetMatchSelector = false;
              //console.log("if ($('#added-by-other').hasClass('selected')) = " + $('#added-by-other').hasClass('red-alliance-selected') || $('#added-by-other').hasClass('blue-alliance-selected'));
              if ($('#added-by-other').hasClass('red-alliance-selected') || $('#added-by-other').hasClass('blue-alliance-selected')) { //if the currently selected match (before updating the display) is no longer going to be displayed, remove the not-selected classes from the other matches being shown
                  needToResetMatchSelector = true;
              }
              var oldMatchNum = parseInt($('#added-by-other.team-select > .match-row > .match-number').text().slice(1));
              $('#added-by-other').remove();
              var matchInfo = data.results[0];
              //console.log(oldMatchNum);
              //console.log("typeof omn " + typeof oldMatchNum);
              //console.log("parseInt(matchInfo.round)",parseInt(matchInfo.round));
              if (data.results.length > 0) {
                  if (parseInt(matchInfo.round) === 2) { //only show qualification matches (round 2)
                      console.log("inside second if statement");
                      $('#other-match-num').val(""); //clear the other match field
                      if (!isNaN(oldMatchNum)) { //we only need to do this when oldMatchNumber has a value and isn't NaN - i.e., only after the second other search
                          removeFromArray(oldMatchNum, matchesVisible);
                      }
                      matchesVisible.push(matchInfo.matchnum); //add to array of visible matches
                      var notSelectedPhrase = (matchSelected) ? " not-selected" : ""; //make sure the match added is styled correctly
                      $('<div class="team-select' + notSelectedPhrase + '" id="added-by-other"><div class="match-row"> <div class="row-team option-red-alliance">' + matchInfo.red1 + '</div><div class="row-team filler"></div><div class="row-team option-red-alliance">' + matchInfo.red2 + '</div><div class="match-number">Q' + matchInfo.matchnum + '</div><div class="row-team option-blue-alliance">' + matchInfo.blue1 + '</div><div class="row-team filler"></div><div class="row-team option-blue-alliance">' + matchInfo.blue2 + '</div></div></div>').insertBefore('#select-other-match');
                  }
                  else if (parseInt(matchInfo.round) < 2 || parseInt(matchInfo.round) > 2) {
                      $('<p class="error" id="added-by-other"><i class="material-icons">error_outline</i> Match found is not a qualification match; please try again with a qualifcation match number</p>').insertBefore('#select-other-match');
                  }
              } else if (data.results.length === 0) {
                  console.log("inside match not found");
                  $('<p class="error" id="added-by-other"><i class="material-icons">error_outline</i> Match not found</p>').insertBefore('#select-other-match');
              }
              if (needToResetMatchSelector) { //do this after the new match has been added to the page
                  resetMatchSelector();
              }
              console.log("got to removeattr");
              $('#other-match-num, #submit-other-match').removeAttr("disabled"); //enable submit button and entry field
          }
          else if (!forOtherMatch) {
              $('<p><i class="material-icons">info_outline</i> No unscored qualification matches</p>').insertBefore('#select-other-match');
          }
          else {
              if (forOtherMatch) { //if this function was called to add the "Other" match, and there is an error, then remove the not-selected style from the other matches being shown
                  resetMatchSelector();
              }
              $('<p class="error"><i class="material-icons">error_outline</i> Match not found</p>').insertBefore('#select-other-match');
              $('#other-match-num, #submit-other-match').removeAttr("disabled"); //enable submit button and entry field
          }
      }
      else { //status is 0 - an error occurred
          if (!forOtherMatch) {
              $('<p><i class="material-icons">error_outline</i> <strong>Couldn\'t get match data because of an error: ' + data.error.message + '</strong> If you keep getting this error, please use the Send Feedback button at the bottom of the page to get help.</p>').insertBefore('#select-other-match');
              $('#select-other-match').addClass('hidden'); //Since there was an error, don't show the option to select another match, since the API or something related to it probably isn't working right (and the page should be refreshed, at the very least)
          }
      }
      $('#match-selector-data-loading').addClass('hidden').removeClass('is-active');
      if (!forOtherMatch) {
          $('#team-select-container').removeClass('hidden');
      }
  }
  var autonTimeout, driverTimeout, autonWinner = "",
      autonStartTime, driverStartTime, matchSelected = "",
      teamSelected = "",
      allianceSelected = "",
      numStarGroupsEntered = 0,
      matchesVisible = [],
      formAnswers = {
          scoredObjs: [],
          markedTimes: {},
          text: {},
          radio: {},
          checkbox: {},
          meta: null
      },
      scoredObjsQuestionEnabled = true;

  function callLoadMatchDataReg(data) {
      "use strict";
      loadMatchData(data, false);
  }

  function resetScoredObjs() {
      "use strict";
      //make sure previous answers are discarded
      formAnswers.scoredObjs = [];
      scoredObjsQuestionEnabled = false;
      numStarGroupsEntered = 0;
      if (allianceSelected === "blue") { //blue alliance selected; make sure blue field is displayed and enabled
          $('#field-image-blue').removeClass('disabled hidden');
      }
      else { //act on red; blue is hidden
          $('#field-image-red').removeClass('disabled hidden');
      }
      $('#reset-score-locs, #undo-last-score-loc-input').addClass('soft-hidden');
      $('#obj-locs-response-done').addClass('hidden');
      $('#num-locs-entered').text(0);
  }

  function ScoredObject(time, x, y) {
      "use strict";
      this.x = x;
      this.y = y;
      this.time = time;
  }

  function finishGetUnscoredMatches(sku) {
      "use strict";
      firebase.auth().currentUser.getToken(/* forceRefresh */ false).then(function(idToken) {
          $.ajax("/api/" + sku + "/unscored/3?highlight=" + userDefaults.tournament + "&token=" + idToken, {
              success: callLoadMatchDataReg
          });
      });

  }
  $(document).ready(function () {
      "use strict";
      componentHandler.upgradeAllRegistered(); //to make sure the loading spinner appears and not just "Loading..."
      //load matches for match selector
      //DISABLE NO REFRESH FLAG!!!!!
      //$('body').append('<script src=\"https://script.google.com/a/macros/woodward.edu/s/AKfycbxsKMe0cdyYScaJXipBoA2bFSY8Aj-jxlQqyS4aDOI/exec?type=getUnscoredMatchInfo&numMatches=3&id=' + instanceID + '&prefix=loadMatchData&norefresh=true\"><\/script>');

      $('#start-auton-timer').click(function () {
          $('#ready-auton').addClass('hidden');
          $('#auton-timer-running').removeClass('hidden');
          $('#match-timer').removeClass('timer-stopped').addClass('timer-running');
          $('.mark-time-auton').removeAttr("disabled");
          formAnswers.markedTimes.autonStart = new Date().getTime(); //find time passed since this by saving marked time in a variable and then using timeDiffInSecs = new Date (event - autonStart).getSeconds();
          autonTimeout = setTimeout(endAuton, 15000);
      });
      $('#btn-stop-auton').click(function () {
          window.clearTimeout(autonTimeout);
          showMatchPaused();
      });
      //click handlers for auton winner selection
      $(".auton-winner-option.option-blue-alliance").click(blueAutonWinnerClick);
      $(".auton-winner-option.option-red-alliance").click(redAutonWinnerClick);
      $(".auton-winner-option.option-tie").click(tieAutonWinnerClick);
      $("#btn-driver-start").click(driverPeriodStart); //click handler for driver control period start button
      $('#btn-stop-driver').click(function () {
          window.clearTimeout(driverTimeout);
          showMatchEnd();
      });
      $('#team-select-container').on('click', '.team-select > .match-row > .row-team.option-red-alliance, .team-select > .match-row > .row-team.option-blue-alliance', matchSelectHandler);
      $('#select-other-match').click(showOtherInput);
      $('#submit-other-match').click(loadOtherMatch);
      $('#other-match-num').change(function () {
          //console.log("changed");
          if ($('#container-other-match-num').hasClass("is-invalid")) {
              $('#submit-other-match').attr("disabled", "disabled");
          }
          else {
              $('#submit-other-match').removeAttr("disabled");
          }
      });
      $('#submit-form').on('click', submitHandler);
      //$('#robot-auton-start > .option > #enter-time').on("click", showTimeInput);
      //$('#robot-auton-start > .option > .mark-time-auton').on("click", {timeLabel: "autonStartTime"}, markTime);
      $('.espion-radio-select > .option').on("click", "button.default, button.done", espionSwapDisplay);
      $('.espion-radio-select > .option').on("click", "button.espion-to-default", espionPanelToDefault);
      $('.img-responsive.blue-alliance, .img-responsive.red-alliance').on("click", scoringLocationsImageClicked);
      $('#reset-score-locs').on("click", resetScoredObjs);
      $('#undo-last-score-loc-input').on("click", undoLastScoredObj);
  });

  function updateAutonWinnerDisplay(winner) {
      "use strict";
      if (winner === "blue") {
          if (!$(".auton-winner-option.option-blue-alliance").hasClass("selected")) { //if the element doesn't already have the selected class, we need to add the selected class and add the not-selected class to the other two options
              $(".auton-winner-option.option-blue-alliance").removeClass("not-selected").addClass("selected");
              $(".auton-winner-option.option-red-alliance").removeClass("selected").addClass("not-selected");
              $(".auton-winner-option.option-tie").removeClass("selected").addClass("not-selected");
          }
      }
      else if (winner === "red") {
          if (!$(".auton-winner-option.option-red-alliance").hasClass("selected")) { //if the element doesn't already have the selected class, we need to add the selected class and add the not-selected class to the other two options
              $(".auton-winner-option.option-red-alliance").removeClass("not-selected").addClass("selected");
              $(".auton-winner-option.option-blue-alliance").removeClass("selected").addClass("not-selected");
              $(".auton-winner-option.option-tie").removeClass("selected").addClass("not-selected");
          }
      }
      else { //tie
          if (!$(".auton-winner-option.option-tie").hasClass("selected")) { //if the element doesn't already have the selected class, we need to add the selected class and add the not-selected class to the other two options
              $(".auton-winner-option.option-tie").removeClass("not-selected").addClass("selected");
              $(".auton-winner-option.option-red-alliance").removeClass("selected").addClass("not-selected");
              $(".auton-winner-option.option-blue-alliance").removeClass("selected").addClass("not-selected");
          }
      }
      //change the display to show that the driver period is running if the user has already pressed Start Driver
      if (formAnswers.markedTimes.driverStart) { //driverStartTime will be a number if the user has pressed Start Driver
          showDriverRunning();
      }
      else { //if the user hasn't already pressed Start Driver, then just hide the "Screen won't change" disclaimer
          $('#screen-wont-change').addClass('hidden');
      }
  }

  function blueAutonWinnerClick() {
      "use strict";
      if (autonWinner !== "blue") {
          updateAutonWinnerDisplay("blue");
          autonWinner = "blue";
      }
  }

  function redAutonWinnerClick() {
      "use strict";
      if (autonWinner !== "red") {
          updateAutonWinnerDisplay("red");
          autonWinner = "red";
      }
  }

  function tieAutonWinnerClick() {
      "use strict";
      if (autonWinner !== "tie") {
          updateAutonWinnerDisplay("tie");
          autonWinner = "tie";
      }
  }

  function showMatchPaused() {
      "use strict";
      $('.mark-time-auton').attr("disabled", "disabled");
      $('#auton-timer-running').addClass('hidden');
      $('#match-paused').removeClass('hidden');
      $('#match-timer').removeClass('timer-running').addClass('timer-paused');
  }

  function endAuton() {
      "use strict";
      showMatchPaused();
  }

  function endDriver() {
      "use strict";
      showMatchEnd();
      console.log("Auton start time: " + formAnswers.markedTimes.autonStart);
      console.log("Driver start time: " + formAnswers.markedTimes.driverStart);
      console.log("Auton winner: " + autonWinner);
  }

  function showMatchEnd() {
      "use strict";
      if (!autonWinner) { //advance automatically so that the next part works in the event that no autonomous winner has been chosen
          showDriverRunning();
      }
      $('#driver-timer-running').addClass('hidden');
      $('#match-ended').removeClass('hidden');
      $('#match-timer').removeClass('timer-running').addClass('timer-stopped');
      setTimeout(hideTimerBar, 3000);
  }

  function hideTimerBar() {
      "use strict";
      $('#match-timer').fadeOut(1000, "swing", function () {
          $('#match-timer').addClass("hidden").removeAttr("style");
      });
  }

  function showDriverRunning() {
      "use strict";
      $('#match-paused').addClass('hidden');
      $('#driver-timer-running').removeClass('hidden');
      $('#match-timer').removeClass('timer-paused').addClass('timer-running');
  }

  function driverPeriodStart() {
      "use strict";
      formAnswers.markedTimes.driverStart = new Date().getTime();
      driverTimeout = setTimeout(endDriver, 105000);
      console.log(formAnswers.markedTimes);
      //activate mark time buttons with .mark-time-driver
      $('.mark-time-driver').removeAttr('disabled');
      if (autonWinner) { //if the autonomous winner has been selected, change the display to reflect that driver control is in progress
          showDriverRunning();
      }
      else { //otherwise, change the text of the Start Driver button and wait until the user selects the autonomous winner
          $('#btn-driver-start').text("Driver started").attr("disabled", "disabled");
      }
  }

  function resetMatchSelector() {
      "use strict";
      $("#team-select-container").find("div").removeClass("not-selected");
      //reset match and team selected variables
      teamSelected = "";
      matchSelected = "";
      allianceSelected = "";
      //reset field image in "Where does this robot score stars and cubes?" question to show "Select a team" error message
      $("#field-image-red, #field-image-blue, #obj-locs-response-info, #container-num-locs-entered").addClass("hidden");
      $("#select-team-first").removeClass("hidden");
  }

  function matchSelectHandler(event) {
      var oldTeamSelected = teamSelected,
          oldMatchSelected = matchSelected;
      teamSelected = $(this).text();
      //console.log(teamSelected + " selected as team");
      matchSelected = $(this).siblings(".match-number").text(); //get the match selected by finding the sibling element to the one clicked with the .match-number class, which contains the match number
      //console.log("matchSelected: " + matchSelected);
      //console.log (oldTeamSelected + " " + teamSelected + " " + oldMatchSelected + " " + matchSelected);
      if (oldTeamSelected !== teamSelected || oldMatchSelected !== matchSelected) { //don't do anything unless a different team was clicked on - the OR for checking if a different match was selected will allow a new team to be selected if the same team is present in more than one of the three matches displayed
          if (oldMatchSelected !== matchSelected && oldTeamSelected) { //only change which match has the colored background if the new team selected is in a different match and this isn't the first time a team is being clicked on (indicated by whether or not oldTeamSelected is an empty string or not)
              $(".blue-alliance-selected, .red-alliance-selected").removeClass("blue-alliance-selected red-alliance-selected");
          }
          if (teamSelected) { //if there's already a team selected, remove the selected class from that element so the selected class can be added to the newly selected team
              $(".row-team.selected").removeClass("selected"); //the selector used here is designed to be a little more specific than necessary to reduce the risk of conflicts with other uses of the "selected" class
          }
          $(this).removeClass("not-selected").addClass("selected");
          //distribute classes to further indicate selection: red-/blue-alliance-selected, not-selected
          if ($(this).hasClass("option-red-alliance")) { //red alliance team selected
              allianceSelected = "red";
              $(this).parents(".team-select").removeClass("not-selected blue-alliance-selected").addClass("red-alliance-selected"); //remove not-selected and blue-alliance-selected classes in case they are present from previous selections before adding new class
          }
          else { //blue alliance team selected
              $(this).parents(".team-select").removeClass("not-selected red-alliance-selected").addClass("blue-alliance-selected");
              allianceSelected = "blue";
          }
          updateFieldImage();
          $(this).siblings(".row-team.option-red-alliance:not(.selected), .row-team.option-blue-alliance:not(.selected)").addClass("not-selected");
          $(this).parents(".team-select").siblings(".team-select").addClass("not-selected");
      }
  }

  function updateFieldImage() {
      if (allianceSelected === "red") { //if this is the red alliance, they are scoring on the blue side of the field, so show the blue half of the field
          $("#field-image-blue, #obj-locs-response-info, #container-num-locs-entered").removeClass("hidden");
          $("#field-image-red, #select-team-first").addClass("hidden");
          console.log("red called");
      }
      else if (allianceSelected === "blue") { //blue is selected
          $("#field-image-red, #obj-locs-response-info, #container-num-locs-entered").removeClass("hidden");
          $("#field-image-blue, #select-team-first").addClass("hidden");
          console.log("blue called");
      }
  }

  function showOtherInput(event) {
      event.preventDefault(); //make sure the page doesn't refresh
      $("#select-other-match").addClass("hidden");
      $("#show-other").removeClass("hidden");
  }

  function loadOtherMatchData(data) {
      console.log("loadothermatch",data);
      loadMatchData(data, true);
  }

  function removeFromArray(val, array) {
      for (var i = 0; i < array.length; i++) {
          if (array[i] === val) {
              array.splice(i, 1);
              break;
          }
      }
  }

  function loadOtherMatch() {
      //console.log("clicked");
      var matchNum = parseInt($('#other-match-num').val())
          , matchIsVisible = false;
      for (var i = 0; i < matchesVisible.length; i++) { //before we load this match, make sure it is not already being displayed
          if (matchNum === matchesVisible[i]) {
              matchIsVisible = true;
              break;
          }
      }
      //console.log(typeof matchNum);
      //console.log(matchesVisible);
      if (typeof matchNum === "number" && matchNum >= 1 && !matchIsVisible) { //only make the api request if there's an positive non-zero integer in the match number input
          $("#added-by-other, #match-is-visible").addClass("hidden");
          $("#match-selector-data-loading").removeClass("hidden").addClass("is-active"); //show loading spinner
          $("#other-match-num, #submit-other-match").attr("disabled", "disabled"); //disable submit button and entry field
          $.ajax("/api/" + sku + "/match/2/1/" + matchNum, {
              success: loadOtherMatchData
          });
      }
      else if (matchIsVisible) {
          $("#match-is-visible").removeClass("hidden");
      }
  }
  /*var radioHandlers = {
    showInput = function () {
      return "test";
    }
  }*/
  function espionSwapDisplay(e) {
      $(this).addClass('hidden');
      $(this).siblings().removeClass('hidden');
      //See http://stackoverflow.com/questions/5347357/jquery-get-selected-element-tag-name
      if ($(this).prop("tagName").toLowerCase() === "button" && $(this).is("[data-time-label]")) { //if the marked time button was clicked, record the time
          var timeLabel = $(this).attr('data-time-label'); //TODO: add some validation to ensure the integrity of this value
          formAnswers.markedTimes[timeLabel] = Date.now();
          //clear the entered time since we're marking the time now
          var textInputToClear = $(this).parents('.espion-radio-select').children('.option:first-child').find('input');
          var id = textInputToClear.attr("id");
          textInputToClear.val("");
          textInputToClear.parent().removeClass("is-dirty");
      }
      else { //clear the previously marked time, if any
          var timeLabelToRemove = $(this).parents('.espion-radio-select').children('.option:last-child').children('button:first-child').attr('data-time-label');
          formAnswers.markedTimes[timeLabelToRemove] = "";
      }
      //reset other sibling buttons for this question to their default state
      $(this).parent().siblings().children('.done').addClass('hidden');
      $(this).parent().siblings().children('.default').removeClass('hidden');
      console.log(formAnswers.markedTimes);
  }

  function espionPanelToDefault() {
      $(this).parent().addClass("hidden").siblings(".default").removeClass('hidden');
      var textInputToClear = $(this).siblings(".espion-text-input").children("input");
      if (textInputToClear.length === 1) { //if there was a text input in this field, we need to clear it
          var id = textInputToClear.attr("id");
          textInputToClear.val("");
          textInputToClear.parent().removeClass("is-dirty");
          //console.log(textInputToClear.parents('.option').siblings().children('button'));
      }
      else {
          //remove the marked time
          var timeLabelToRemove = $(this).parents('.espion-radio-select').children('.option:last-child').children('button:first-child').attr('data-time-label');
          formAnswers.markedTimes[timeLabelToRemove] = "";
      }
  }

  function markTime(event) {
      formAnswers.markedTimes[event.data.timeLabel] = Date.now();
      console.log(formAnswers.markedTimes);
  }
  //from MDN - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
  function round(number, precision) {
      var factor = Math.pow(10, precision);
      var tempNumber = number * factor;
      var roundedTempNumber = Math.round(tempNumber);
      return roundedTempNumber / factor;
  }
  var endScoreLocs; //for fifth object scoring group timeout
  function scoringLocationsImageClicked(e) {
      //console.log("disabled: ",!$(this).hasClass('disabled'));
      //console.log("scoredobjsquestion",scoredObjsQuestionEnabled);
      //console.log("conditional",!$(this).hasClass('disabled') || !scoredObjsQuestionEnabled);
      if (!$(this).hasClass('disabled') || scoredObjsQuestionEnabled) { //stop responding to taps on image once this question is answered
          //this algorithm converts the offsetX and offsetY coordinates which may vary by size of the image
          //   into normalized coordinates for the full-sized image - the coordinates can be scaled down again
          //   when generating a heatmap later on
          var time = Date.now();
          //console.log(e.offsetX, e.offsetY);
          var currentWidth = $(this).width();
          var percent = currentWidth / 450;
          var normX = round(e.offsetX / percent, 2);
          var normY = round(e.offsetY / percent, 2);
          formAnswers.scoredObjs.push(new ScoredObject(time, normX, normY));
          //console.log(time);
          var lastScoredObj;
          if (formAnswers.scoredObjs.length >= 2) {
              lastScoredObj = new Date(formAnswers.scoredObjs[formAnswers.scoredObjs.length - 2].time).getTime(); //since we've already added the new scored object to scoredObjs by now, we need the second-to-last element in the array
          }
          else {
              numStarGroupsEntered++; //increment numStarGroupsEntered the first time the field is clicked and there's no other ScoredObject entry to compare the time to
          }
          //console.log(lastScoredObj);
          //console.log(Math.abs((lastScoredObj - new Date(time).getTime())/1000));
          if (Math.abs((lastScoredObj - new Date(time).getTime()) / 1000) > 2.5 && numStarGroupsEntered < 5) { //if 2.5 is changed, it also needs to be changed in undoLastScoredObj!
              numStarGroupsEntered++; //increment the number of groups of game objects that have been entered
          }
          if (numStarGroupsEntered === 5) {
              window.clearTimeout(endScoreLocs); //reset the 2.5 sec timeout to maintain consistent behavior (a tap 2.5 sec after the last tap counts as the start of a new group of objects)
              endScoreLocs = window.setTimeout(endScoringLocations, 2500, this);
          }
          //console.log(formAnswers);
          $('#reset-score-locs, #undo-last-score-loc-input').removeClass('soft-hidden');
          $('#num-locs-entered').text(numStarGroupsEntered);
          //console.log(normX, normY);
      }
  }

  function undoLastScoredObj(e) {
      //TODO: undoing the last element (after which the field image is hidden) should display the field image again
      if (formAnswers.scoredObjs.length > 0) {
          var prevElemTime = -1;
          if (formAnswers.scoredObjs.length > 1) { //handle cases where this was the first object entered and there's no previous element
              prevElemTime = new Date(formAnswers.scoredObjs[formAnswers.scoredObjs.length - 2].time).getTime(); //get the second-to-last element so we can determine if we need to decrement the number of stars scored
          }
          var removedElem = formAnswers.scoredObjs.pop(); //get and remove the last element, the one being undone
          var removedElemTime = new Date(removedElem.time).getTime();
          console.log(removedElem);
          console.log("prev elem time", prevElemTime);
          console.log("removed elem time", removedElemTime);
          console.log(Math.abs(removedElemTime - prevElemTime) / 1000);
          if (numStarGroupsEntered === 5) { //if undo is pressed after a tap during the last scoring group, remove the question hide timeout until the next tap in case the user's last tap was unintentional and to avoid the question unexpectedly disappearing; the timeout will get reactivated if necessary on the next tap
              window.clearTimeout(endScoreLocs); //need to do this *before* we potentially decrement numStarGroupsEntered because this condition uses the inital value (the value before Undo was pressed) of numStarGroupsEntered
          }
          //if the time between prevElem and removedElem is more than 2.5 seconds
          if (prevElemTime === -1 || Math.abs(removedElemTime - prevElemTime) / 1000 > 2.5) {
              numStarGroupsEntered = (numStarGroupsEntered > 0) ? numStarGroupsEntered - 1 : 0; //don't make numStarGroupsEntered negative
          }
          if (formAnswers.scoredObjs.length === 0) {
              $('#reset-score-locs, #undo-last-score-loc-input').addClass('soft-hidden'); //hide the reset and undo buttons since there's nothing to reset or undo
          }
          $('#num-locs-entered').text(numStarGroupsEntered); //update text showing number of star groups entered
      }
  }

  function endScoringLocations(callerThis) {
      $(callerThis).addClass('disabled hidden');
      $('#obj-locs-response-done').removeClass('hidden');
      $('#undo-last-score-loc-input').addClass('soft-hidden'); //hide the undo button once the question times out, because it would have to have been 2.5 seconds
      //   since the last input and the user is likely done (hitting undo will also remove the 2.5 second timeout for the last scoring group
      //   and won't add one back until the next input)
      scoredObjsQuestionEnabled = false;
  }

  function checkboxToString(checkboxes) {
      var autonActions = ["Scored star in near or far zone","Scored cube in near or far zone","Knocked star(s) off fence","Hung high","Hung low"];
      var robotTypes = ["Catapult","Dumper"];
      var stem = "",
          checkboxValsArray = [],
          str = "",
          result = [];
      console.log(checkboxes);
      for (var id in checkboxes) {
          checkboxValsArray.push({"id": id, "val":checkboxes[id]});
      }

      checkboxValsArray.sort(function(a,b) {
          if (a.id > b.id) {
              return 1;
          } else if (a.id < b.id) {
              return -1;
          }
          return 0;
      });
      console.log(checkboxValsArray);

      var value,
          currGroupIndex = 0;


      stem = checkboxValsArray[0].id.substring(0,id.indexOf("-") + 1);
      for (var i = 0; i < checkboxValsArray.length; i++) {
          id = checkboxValsArray[i].id;
          console.log(id.substring(0,id.indexOf("-") + 1))
          if (id.substring(0,id.indexOf("-") + 1) !== stem) {
              console.log("new stem");
              stem = id.substring(0,id.indexOf("-") + 1);
              result[currGroupIndex] = [str.substring(0,str.length-2)];
              currGroupIndex++; //increment current group index now that we've added the old one to the array
              str = "";
          }
          str += checkboxValsArray[i].val + ", ";
          console.log(str);
          console.log(checkboxValsArray);
      }

      result[currGroupIndex] = [str.substring(0,str.length-2)];
      console.log(result);
      return result;
  }

  /*
   Returns the time in seconds between time1 and time2
   */
  function getSecondsBetween_(time1, time2) {
      return (new Date(Math.abs(time1 - time2)).getTime())/1000;
  }

  function submitHandler(e) {
      $('#submit-form').attr("disabled", "disabled");
      $('input[type="number"]').each(function () {
          formAnswers.text[$(this).attr('id')] = ($(this).val());
      });
      $('input[type="text"]').each(function () {
          formAnswers.text[$(this).attr('id')] = ($(this).val());
      });
      $('input[type="radio"]:checked').each(function () {
          formAnswers.radio[$(this).attr('name')] = ($(this).val());
      });
      $('input[type="checkbox"]:checked').each(function (index) {
          formAnswers.checkbox[$(this).attr('id')] = $(this).siblings('span').text();
      });
      /*$('input[type="checkbox"]:not(:checked)').each(function() {
       formAnswers.checkbox[$(this).attr('id')] = $(this).siblings('span').text();
       });*/
      formAnswers.meta = {
          autonWinner: autonWinner,
          match: matchSelected,
          team: teamSelected,
          alliance: allianceSelected,
          submitTime: firebase.database.ServerValue.TIMESTAMP,
          user: firebase.auth().currentUser.uid
      };

      var r = {
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          user: firebase.auth().currentUser.uid,
          match: formAnswers.meta.match,
          team: formAnswers.meta.team,
          alliance: formAnswers.meta.alliance,
          auton: {
              startTime: null,
              pointsScored: parseInt(formAnswers.text["auton-pts-scored"]) || "Unknown",
              actions: null
          },
          robot: {
              type: null,
              strafes: formAnswers.radio["robot-strafes"] || "Unknown",
              platformStability: formAnswers.radio["platform-stability"] || "Unknown",
              platformHolding: formAnswers.radio["objs-fall"] || "Unknown",
              platformStars: formAnswers.text["driver-stars-held"] || "Unknown",
              platformCubes: formAnswers.text["driver-cubes-held"] || "Unknown"
          },
          hang: {
              startTime: null,
              endTime: null,
              duration: null,
              result: formAnswers.radio["driver-hang-result"] || "Unknown",
              partnerHelp: formAnswers.radio["hang-assistance"] || "Unknown"
          }

      }; //r is the processed formResponses object; in the future, this should be
      //done server-side to reduce client JS load and to prevent tampering with data


      console.log("Object.keys(formAnswers.checkbox).length > 0",Object.keys(formAnswers.checkbox).length > 0);
      if (Object.keys(formAnswers.checkbox).length > 0) {
          var checkboxStrings = checkboxToString(formAnswers.checkbox);
          r.robot.type = checkboxStrings[0].toString() || "Unknown";
      } else {
          r.robot.type = "Unknown";
      }

      console.log("r",r);
      console.log("form answrs",formAnswers)

      var autonPlayStart,
          dcHangDuration,
          dcHangStart,
          dcHangEnd;

      try {
          if (formAnswers.text["other-team-num"] !== "") {
              r.team = formAnswers.text["other-team-num"].toUpperCase();
          }
      } catch (e) {
          console.log(e);
      }

      try {
          if (formAnswers.text["manual-match-num"] !== "") {
              r.match = "Q" + formAnswers.text["manual-match-num"];
          }
      } catch (e) {
          //Logger.log(e);
      }

      //autonStart is when the autonomous period starts
      //auton-start-time is the marked time (result of pressing "Mark time" button) for when the autonomous period starts
      if (formAnswers.markedTimes["auton-start-time"] !== "") {
          autonPlayStart = 15 - getSecondsBetween_(parseInt(formAnswers.markedTimes["autonStart"]),parseInt(formAnswers.markedTimes["auton-start-time"]));
      } else if (formAnswers.text["auton-play-start-time"] !== "") {
          if (parseInt(formAnswers.text["auton-play-start-time"]) >= 0 && parseInt(formAnswers.text["auton-play-start-time"]) <= 15) {
              autonPlayStart = parseInt(formAnswers.text["auton-play-start-time"]);
          }
      } else {
          autonPlayStart = "unknown";
      }

      console.log(autonPlayStart);
      r.auton.startTime = autonPlayStart || "Unknown";

      if (formAnswers.markedTimes["dc-hang-start"] !== "") {
          dcHangStart = 105 - getSecondsBetween_(parseInt(formAnswers.markedTimes.driverStart),parseInt(formAnswers.markedTimes["dc-hang-start"]));
      } else if (parseInt(formAnswers.text["dc-hang-start-time"]) >= 0 && parseInt(formAnswers.text["dc-hang-start-time"]) <= 105) {
          dcHangStart = parseInt(formAnswers.text["dc-hang-start-time"]);
      } else {
          dcHangStart = "unknown";
      }
      r.hang.startTime = dcHangStart  || "Unknown";

      if (formAnswers.markedTimes["dc-hang-end"] !== "") {
          dcHangEnd = 105 - getSecondsBetween_(parseInt(formAnswers.markedTimes.driverStart),parseInt(formAnswers.markedTimes["dc-hang-end"]));
      } else if (parseInt(formAnswers.text["dc-hang-end-time"]) >= 0 && parseInt(formAnswers.text["dc-hang-end-time"]) <= 105) {
          dcHangEnd = parseInt(formAnswers.text["dc-hang-end-time"]);
      } else {
          dcHangEnd = "unknown";
      }


      r.hang.endTime = dcHangEnd || "Unknown";

      if (dcHangStart > dcHangEnd) {
          dcHangDuration = dcHangStart - dcHangEnd;
      } else {
          dcHangDuration = "Unknown (invalid hang time(s))";
      }
      r.hang.duration = dcHangDuration;

      var orgID = 0;
      var tournamentID = 0;
      console.log("ran");
      console.log(formAnswers);
      let autonActions = [];
      $("#simpleList2 li").each(function() {
          if ($(this).children("div").length > 0) {
              autonActions.push($($($(this).children("div")[0]).children("input")[0]).val()); //HACK: yeah... that's a triple-nested jQuery selector.  I am sorry future self.  You should refactor that someday
              //console.log($(this).children("div")[0].children("input")[0].val());
          } else {
              autonActions.push($(this).text().substring(12));
          }
      });
      r.auton.actions = autonActions.toString();

      for (var prop in r) {
          if (prop === "robot" || prop === "hang" || prop === "auton") {
              for (var nestedProp in r[prop]) {
                  console.log("nestedProp",nestedProp);
                  if (Number.isNaN(r[prop][nestedProp])) {
                      r[prop][nestedProp] = "Unknown";
                  }
              }
          } else {
              if (Number.isNaN(r[prop])) {
                  r[prop] = "Unknown";
              }
          }
      }
      console.log("new r",r);

      var pushRef= firebase.database().ref("/scouting/" + userDefaults.org + "/" + userDefaults.tournament).push();
      pushRef.set(r).then(function() {
          $('#submit-form').removeAttr("disabled");
          $('#submit-success').removeClass("hidden");
      }).catch(function(e) {
          console.error(error);
          $('#submit-form').removeAttr("disabled");
          $('#submit-error-msg').text(error);
          $('#submit-error').removeClass("hidden");
      });

      /*google.script.run.withSuccessHandler(function (result) {
          console.log(result);
          $('#submit-form').removeAttr("disabled");
          $('#submit-success').removeClass("hidden");
      }).withFailureHandler(function (error) {
          console.error(error);
          $('#submit-form').removeAttr("disabled");
          $('#submit-error-msg').text(error);
          $('#submit-error').removeClass("hidden");
      }).submitResponses(formAnswers);*/
  }

  function signOut() {
      firebase.auth().signOut();
  }

