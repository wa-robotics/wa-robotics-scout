function doGet(e) {
  var requestType = e.parameter.type;
  var returnVal;
  Logger.log(requestType);
  
  switch (requestType) {
    case "getTeamMatches":
      returnVal = { status: 1, results: getTeamMatches(e) };
      break;
    default:
      returnVal = { status: 0, error: {code: 100, message: "Invalid request type specified.  Check API docs."}, result: [] };
  }
  
  return ContentService.createTextOutput(e.parameter.prefix + "(" + JSON.stringify(returnVal) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getTeamMatches(e) {
  var matchesRawData = [];
  var matches = [];
  matchesRawData.push(getRows("DB_MATCHES",{ blue1: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ blue2: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ red1: e.parameter.team }, "data", e.parameter.id));
  matchesRawData.push(getRows("DB_MATCHES",{ red2: e.parameter.team }, "data", e.parameter.id));
    
    
    //matchesRawData ends up being a 2D array full of the results of the getRows searches.  Now, create one array full of the getRows results
    for(var k = 0; k < matchesRawData.length; k++) {
      for(var l = 0; l < matchesRawData[k].length; l++) {
        matches.push(matchesRawData[k][l]);
      }
    }
   
   matches.sort(function (a,b) {
     if (a.matchnumber < b.matchnumber) {
       return -1;
     }
     if (b.matchnumber > b.matchnumber) {
       return 1;
     }
     return 0;
   });
   
 return matches;
}
