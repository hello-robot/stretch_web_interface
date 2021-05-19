

function initializeData() {
  db = new Database(config, registerCallbacks);
}

function registerCallbacks() {
  let dbRefData = firebase.database().ref('/');
  dbRefData.on("value", updateUsersList);
  console.log("Database initialized again. Callbacks registered.");
}

function signInWithGoogle() {
  Database.signInWithGoogle();
}

 var userIDs = null;
 var userData = null;
 var admins = null;

function updateUsersList(snapshot) { 
  let database = snapshot.val(); 
  admins = database['admins'];
  userData = database['users'];
  userIDs = Object.keys(userData);
  let isAdmin = !Database.isAnonymous 
                && Database.userEmail != null
                && admins.includes(Database.userEmail);  

  console.log("Received data for " + userIDs.length + " users.");
  // console.log("User is admin? " + isAdmin);
  
  let userListDiv = document.getElementById("userList");
  userListDiv.innerHTML = "";

  // Add each robot
  for (var i=0; i<userIDs.length; i++) {
    let uid = userIDs[i];
    let data = userData[uid];
    let timestamps = Object.keys(data);

    let participantID = "N/A";
    let sessionStartStamp = "N/A";
    let sessionStartDate = "N/A";
    let sessionStartTime = "N/A";
    let t1Start = "N/A";
    let t1End = "N/A";
    let t2Start = "N/A";
    let t2End = "N/A";
    let t3Start = "N/A";
    let t3End = "N/A";
    let t4Start = "N/A";
    let t4End = "N/A";

    let t1Events = 0;
    let t2Events = 0;
    let t3Events = 0;
    let t4Events = 0;
    let t1Duration = 0;
    let t2Duration = 0;
    let t3Duration = 0;
    let t4Duration = 0;

    // Figure out what data is available for the user
    for (var j=0; j<timestamps.length; j++) {
      let t = timestamps[j];
      let event = data[t];

      if (event.eventName == "SessionStarted") {
        if (sessionStartStamp == "N/A") {
          sessionStartStamp = t;
          sessionStartDate = event.date;
          sessionStartTime = event.time;
        } 
        else {
          // Update only if the new time is earlier
          if (Number(sessionStartStamp) > Number(t)) {
            sessionStartStamp = t;
            sessionStartDate = event.date;
            sessionStartTime = event.time;
          }
        }

        if (event.eventInfo != "") {
          participantID = event.eventInfo;
        }
      }

      if (event.eventName == "Task1Started")
        t1Start = t;
      if (event.eventName == "Task1Ended")
        t1End = t;
      if (event.eventName == "Task2Started")
        t2Start = t;
      if (event.eventName == "Task2Ended")
        t2End = t;
      if (event.eventName == "Task3Started")
        t3Start = t;
      if (event.eventName == "Task3Ended")
        t3End = t;
      if (event.eventName == "Task4Started")
        t4Start = t;
      if (event.eventName == "Task4Ended")
        t4End = t;

      if (event.eventName == "Task5Started")
        console.log('Task5Started: ' + t);
      if (event.eventName == "Task5Ended")
        console.log('Task5Ended: ' + t);

    }

    let t1ModeList = [];
    let t2ModeList = [];
    let t3ModeList = [];
    let t4ModeList = [];

    // Go through events again to count events per task
    for (var j=0; j<timestamps.length; j++) {
      let t = timestamps[j];
      let event = data[t];

      if (event.eventName != "SessionStarted") {
        if (t1Start != "N/A" && t1End != "N/A") {
          t1Duration = (Number(t1End) - Number(t1Start))/1000.0;
          if (Number(t) > Number(t1Start) && Number(t) < Number(t1End)) {
            t1Events++;
            if (event.eventName == "ModeChange") {
              let modeName = event.eventInfo;
              t1ModeList.push([Number(t),modeName]);
            }            
          }
        }
        if (t2Start != "N/A" && t2End != "N/A") {
          t2Duration = (Number(t2End) - Number(t2Start))/1000.0;
          if (Number(t) > Number(t2Start) && Number(t) < Number(t2End)){
            t2Events++;
            if (event.eventName == "ModeChange") {
              let modeName = event.eventInfo;
              t2ModeList.push([Number(t),modeName]);
            }            
          }
        }
        if (t3Start != "N/A" && t3End != "N/A") {
          t3Duration = (Number(t3End) - Number(t3Start))/1000.0;
          if (Number(t) > Number(t3Start) && Number(t) < Number(t3End)){
            t3Events++;
            if (event.eventName == "ModeChange") {
              let modeName = event.eventInfo;
              t3ModeList.push([Number(t),modeName]);
            }            
          }
        }
        if (t4Start != "N/A" && t4End != "N/A") {
          t4Duration = (Number(t4End) - Number(t4Start))/1000.0;
          if (Number(t) > Number(t4Start) && Number(t) < Number(t4End)){
            t4Events++;
            if (event.eventName == "ModeChange") {
              let modeName = event.eventInfo;
              t4ModeList.push([Number(t),modeName]);
            }            
          }
        }
      }
    }


    // Obtain mode statistics
    let modeCounts = {"nav":0, "look":0, "low_arm":0, "high_arm":0, "hand":0};

    for (let n=0; n<t1ModeList.length; n++){
      t1ModeList[n][0] -= Number(t1Start);
      t1ModeList[n][0] /= 1000.0;
      let mode = t1ModeList[n][1];
      modeCounts[mode]++;
    }
    for (let n=0; n<t2ModeList.length; n++){
      t2ModeList[n][0] -= Number(t2Start);
      t2ModeList[n][0] /= 1000.0;
      let mode = t2ModeList[n][1];
      modeCounts[mode]++;
    }
    for (let n=0; n<t3ModeList.length; n++){
      t3ModeList[n][0] -= Number(t3Start);
      t3ModeList[n][0] /= 1000.0;
      let mode = t3ModeList[n][1];
      modeCounts[mode]++;
    }
    for (let n=0; n<t4ModeList.length; n++){
      t4ModeList[n][0] -= Number(t4Start);
      t4ModeList[n][0] /= 1000.0;
      let mode = t4ModeList[n][1];
      modeCounts[mode]++;
    }

    let modeDurations = {"nav":0, "look":0, "low_arm":0, "high_arm":0, "hand":0};
    for (let n=0; n<t1ModeList.length-1; n++)
      modeDurations[t1ModeList[n][1]] += (t1ModeList[n+1][0] - t1ModeList[n][0]);
    for (let n=0; n<t2ModeList.length-1; n++)
      modeDurations[t2ModeList[n][1]] += (t2ModeList[n+1][0] - t2ModeList[n][0]);
    for (let n=0; n<t3ModeList.length-1; n++)
      modeDurations[t3ModeList[n][1]] += (t3ModeList[n+1][0] - t3ModeList[n][0]);
    for (let n=0; n<t4ModeList.length-1; n++)
      modeDurations[t4ModeList[n][1]] += (t4ModeList[n+1][0] - t4ModeList[n][0]);

    let keys = Object.keys(modeDurations);
    for (let k=0; k<keys.length; k++) {
      let key = keys[k];
      modeDurations[key] /= modeCounts[key];
    }

    let modesDataString = "Tab"  + "\t" + "Occurrences" + "\t" + "Average duration" + "\n" +
                          "Arm1"  + "\t" + modeCounts["low_arm"] + "\t" + modeDurations["low_arm"] + "\n" +
                          "Arm2"  + "\t" + modeCounts["high_arm"] + "\t" + modeDurations["high_arm"] + "\n" +
                          "Drive"  + "\t" + modeCounts["nav"] + "\t" + modeDurations["nav"] + "\n" +
                          "Hand"  + "\t" + modeCounts["hand"] + "\t" + modeDurations["hand"] + "\n" +
                          "Look"  + "\t" + modeCounts["look"] + "\t" + modeDurations["look"] + "\n";

    // Display available data for the user

    let cardDiv = document.createElement('div');
    cardDiv.setAttribute('class', 'card mb-2');
          
    let cardHeaderDiv = document.createElement('div');
    cardHeaderDiv.setAttribute('id', 'user'+i);
    cardHeaderDiv.setAttribute('class', 'card-header');

    let expandButton = document.createElement('button');
    expandButton.setAttribute('class', 'btn btn-link btn-lg');
    expandButton.setAttribute('type', 'button');
    expandButton.setAttribute('data-toggle', 'collapse');
    expandButton.setAttribute('data-target', '#collapse'+i);
    expandButton.setAttribute('aria-expanded', 'true');
    expandButton.setAttribute('aria-controls', 'collapse'+i);

    let userName = uid;
    if (participantID != "N/A")
      userName = participantID;
    expandButton.innerHTML = 'User: ' + userName + ' -- Date: '+ sessionStartDate;

    let collapseDiv = document.createElement('div');
    collapseDiv.setAttribute('class', 'collapse collapsed');
    collapseDiv.setAttribute('id', 'collapse'+i);
    collapseDiv.setAttribute('aria-labelledby', 'user'+i);
            
    let cardBodyDiv = document.createElement('div');
    cardBodyDiv.setAttribute('class', 'card-body');

    let timeDiv = document.createElement('div');
    timeDiv.setAttribute('class', 'mb-2');
    timeDiv.innerHTML = '<span> <b>Session start date:</b> '+ sessionStartDate + "</span> <br>" +
                        '<span> <b>Session start time:</b> '+ sessionStartTime + "</span> <br>" +
                        '<span> <b>Session start time stamp:</b> '+ sessionStartStamp + "</span>";
    cardBodyDiv.appendChild(timeDiv);
    let hr1 = document.createElement('hr');
    cardBodyDiv.appendChild(hr1);

    //====================================//

    let t1DurationString = Math.floor(t1Duration/60.0) + ":" + (Math.round(t1Duration%60)<10?"0":"") + Math.round(t1Duration%60);
    let t2DurationString = Math.floor(t2Duration/60.0) + ":" + (Math.round(t2Duration%60)<10?"0":"") + Math.round(t2Duration%60);
    let t3DurationString = Math.floor(t3Duration/60.0) + ":" + (Math.round(t3Duration%60)<10?"0":"") + Math.round(t3Duration%60);
    let t4DurationString = Math.floor(t4Duration/60.0) + ":" + (Math.round(t4Duration%60)<10?"0":"") + Math.round(t4Duration%60);

    let summaryDiv = document.createElement('div');
    summaryDiv.innerHTML = '<b>Total number of events:</b> '+ timestamps.length + '<br>' +
                  '<b>--Task 1 events:</b> '+ t1Events + '<br>' + 
                  '<b>--Task 2 events:</b> '+ t2Events + '<br>' + 
                  '<b>--Task 3 events:</b> '+ t3Events + '<br>' + 
                  '<b>--Task 4 events:</b> '+ t4Events + '<br>' +  
                  '<b>--Task 1 duration:</b> '+ t1DurationString + '<br>' + 
                  '<b>--Task 2 duration:</b> '+ t2DurationString + '<br>' + 
                  '<b>--Task 3 duration:</b> '+ t3DurationString + '<br>' + 
                  '<b>--Task 4 duration:</b> '+ t4DurationString; 
    summaryDiv.setAttribute('class', 'mb-2');
    cardBodyDiv.appendChild(summaryDiv);
    let hr2 = document.createElement('hr');
    cardBodyDiv.appendChild(hr2);

    //====================================//

    let modesDiv = document.createElement('div');
    let modesSpan = document.createElement('span');
    modesSpan.setAttribute('class', 'mr-4');
    modesSpan.innerHTML = "<b>Usage of tabs/modes</b><br>"

    let textArea = document.createElement('textarea');
    textArea.setAttribute("rows", 4);
    textArea.setAttribute("cols", 50);
    textArea.value = modesDataString;

    modesDiv.appendChild(modesSpan);
    modesDiv.appendChild(textArea);
    cardBodyDiv.appendChild(modesDiv);

    cardBodyDiv.appendChild(document.createElement('hr'));

    //====================================//

    let svg1Div = getModeSVGDiv(1, t1ModeList, t1Start, t1Duration);
    let svg2Div = getModeSVGDiv(2, t2ModeList, t2Start, t2Duration);
    let svg3Div = getModeSVGDiv(3, t3ModeList, t3Start, t3Duration);
    let svg4Div = getModeSVGDiv(4, t4ModeList, t4Start, t4Duration);
    cardBodyDiv.appendChild(svg1Div);
    cardBodyDiv.appendChild(svg2Div);
    cardBodyDiv.appendChild(svg3Div);
    cardBodyDiv.appendChild(svg4Div);

    cardBodyDiv.appendChild(document.createElement('hr'));

    //====================================//

    let participantDiv = document.createElement('div');
    participantDiv.setAttribute('class', 'mb-2');
    let participantSpan = document.createElement('span');
    participantSpan.setAttribute('class', 'mr-4');
    participantSpan.innerHTML = '<b>Database user ID:</b> ' + uid + '<br>' +
                                '<b>Participant ID:</b> ' + participantID;
    let participantText = document.createElement('input');
    participantText.setAttribute('type', 'text');
    participantText.setAttribute('id', 'participant'+i);
    let addParticipantButton = document.createElement('button');
    addParticipantButton.setAttribute('class', 'btn btn-primary btn-small');
    addParticipantButton.setAttribute('onclick', 'addParticipantID('+ i + ')');
    if (!isAdmin)
      addParticipantButton.setAttribute('disabled', 'true');
    addParticipantButton.innerHTML = "Update";
    participantDiv.appendChild(participantSpan);
    participantDiv.appendChild(participantText);
    participantDiv.appendChild(addParticipantButton);
    cardBodyDiv.appendChild(participantDiv);
    let hr3 = document.createElement('hr');
    cardBodyDiv.appendChild(hr3);

    //====================================//

    let t1Div = getTaskTimeDiv(t1Start, 1, i, true, isAdmin);
    cardBodyDiv.appendChild(t1Div);
    let t1eDiv = getTaskTimeDiv(t1End, 1, i, false, isAdmin);
    cardBodyDiv.appendChild(t1eDiv);
    let t2Div = getTaskTimeDiv(t2Start, 2, i, true, isAdmin);
    cardBodyDiv.appendChild(t2Div);
    let t2eDiv = getTaskTimeDiv(t2End, 2, i, false, isAdmin);
    cardBodyDiv.appendChild(t2eDiv);
    let t3Div = getTaskTimeDiv(t3Start, 3, i, true, isAdmin);
    cardBodyDiv.appendChild(t3Div);
    let t3eDiv = getTaskTimeDiv(t3End, 3, i, false, isAdmin);
    cardBodyDiv.appendChild(t3eDiv);
    let t4Div = getTaskTimeDiv(t4Start, 4, i, true, isAdmin);
    cardBodyDiv.appendChild(t4Div);
    let t4eDiv = getTaskTimeDiv(t4End, 4, i, false, isAdmin);
    cardBodyDiv.appendChild(t4eDiv);

    let hr4 = document.createElement('hr');
    cardBodyDiv.appendChild(hr4);

    //====================================//

    cardHeaderDiv.appendChild(expandButton);
    collapseDiv.appendChild(cardBodyDiv);

    cardDiv.appendChild(cardHeaderDiv);
    cardDiv.appendChild(collapseDiv);

    userListDiv.appendChild(cardDiv);
  }
}

function getTaskTimeDiv(current, taskID, userIndex, isStart, isAdmin) {
  let t1Div = document.createElement('div');
  t1Div.setAttribute('class', 'mb-2');
  let t1Span = document.createElement('span');
  t1Span.setAttribute('class', 'mr-4');
  t1Span.innerHTML = '<b>Task ' + taskID + ' ' + 
                      (isStart?'start':'end') + ':</b> ' + current;
  let t1Text = document.createElement('input');
  t1Text.setAttribute('type', 'text');
  let uniqueID = 'task'+taskID+'user'+userIndex+'start'+isStart;
  t1Text.setAttribute('id', uniqueID);
  let t1AddButton = document.createElement('button');
  t1AddButton.setAttribute('class', 'btn btn-primary btn-small');
  t1AddButton.setAttribute('onclick', 'addTaskTime('+ taskID +','+ userIndex +','+ isStart + ')');
  if (!isAdmin)
    t1AddButton.setAttribute('disabled', 'true');
  t1AddButton.innerHTML = "Update";
  t1Div.appendChild(t1Span);
  t1Div.appendChild(t1Text);
  t1Div.appendChild(t1AddButton);
  return t1Div;
}


function getModeSVGDiv(tID, t1ModeList, t1Start, t1Duration) {
  let svg1Div = document.createElement('div');
  let t1SVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
  t1SVG.setAttribute('width', "600px");
  t1SVG.setAttribute('height', "50px");
  // t1SVG.setAttribute('style', "border: 1px red solid;");

  // console.log(JSON.stringify(t1ModeList));

  for (let n=1; n<t1ModeList.length-1; n++){
    let w = Math.round(600.0*(t1ModeList[n+1][0] - t1ModeList[n][0])/t1Duration) + 1;
    let x = Math.round(600.0*(t1ModeList[n][0] - t1ModeList[0][0])/t1Duration);
    let rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
    // console.log("w: " + w + " x: " + x);
    rect.setAttribute('width', w);
    rect.setAttribute('height', 25);
    rect.setAttribute('x', x);
    rect.setAttribute('y', 5);
    rect.setAttribute('height', 30);
    if (t1ModeList[n][1] == "nav")
      rect.setAttribute('fill', "#ff9900");
    else if (t1ModeList[n][1] == "look")
      rect.setAttribute('fill', "#ffd966");
    else if (t1ModeList[n][1] == "low_arm")
      rect.setAttribute('fill', "#6d9eeb");
    else if (t1ModeList[n][1] == "high_arm")
      rect.setAttribute('fill', "#3c78d8");
    else if (t1ModeList[n][1] == "hand")
      rect.setAttribute('fill', "yellowgreen");
    t1SVG.appendChild(rect);
  }

  let t1span = document.createElement('span');
  t1span.setAttribute("class", "mr-2");
  t1span.innerHTML = "Task " + tID;
  svg1Div.appendChild(t1span);
  svg1Div.appendChild(t1SVG);
  return svg1Div;
}

function addTaskTime(taskID, userIndex, isStart) {
  let uniqueID = 'task'+taskID+'user'+userIndex+'start'+isStart;
  let timeText = document.getElementById(uniqueID);
  let time = timeText.value;
  console.log("Adding task time for user " + userIDs[userIndex]);
  console.log('task: '+taskID+' start: '+isStart + ' @time:' + time);
  let eventName = "Task" + taskID + (isStart?"Started":"Ended")
  removeAllEvents(userIndex, eventName);
  logUserTimedEvent(userIDs[userIndex], time, eventName, "");
}

function removeAllEvents(userIndex, eventName) {
  let uid = userIDs[userIndex];
  let data = userData[uid];
  let timestamps = Object.keys(data);
  for (let i=0; i<timestamps.length; i++) {
    let t = timestamps[i];
    let event = data[t];
    let dir = 'users/' + uid + '/' + t + '/';
    let dbRef = firebase.database().ref(dir);
    if (event.eventName == eventName){
      dbRef.remove();
      console.log("Deleting " + t);
    }
  }
}

function addParticipantID(userIndex) {
  let participantText = document.getElementById('participant' + userIndex);
  let participantName = participantText.value;
  console.log("Adding participant ID " + participantName + " for user " + userIDs[userIndex]);
  // Update the database
  logUserEvent(userIDs[userIndex], "SessionStarted", participantName);
}

function logUserTimedEvent(uid, timeStamp, eventName, eventInfo) {
  eventLog = {};
  if (eventInfo == undefined)
    eventInfo = "";
  let dir = 'users/' + uid + '/';
  let dbRef = firebase.database().ref(dir);
  let date = new Date(Number(timeStamp));
  eventLog["eventName"] = eventName;
  eventLog["eventInfo"] = eventInfo;
  eventLog["date"] = date.toDateString();
  eventLog["time"] = date.toTimeString();
  let newEventLog = {};
  newEventLog[timeStamp] = eventLog;
  dbRef.update(newEventLog);
  console.log("Adding timed event: ------");
  console.log(newEventLog);
}

function logUserEvent(uid, eventName, eventInfo) {
  eventLog = {};
  if (eventInfo == undefined)
    eventInfo = "";
  let dir = 'users/' + uid + '/';
  let dbRef = firebase.database().ref(dir);
  let date = new Date();
  let timeStamp = date.getTime();
  eventLog["eventName"] = eventName;
  eventLog["eventInfo"] = eventInfo;
  eventLog["date"] = date.toDateString();
  eventLog["time"] = date.toTimeString();
  let newEventLog = {};
  newEventLog[timeStamp] = eventLog;
  dbRef.update(newEventLog);
  console.log("Adding event: ------");
  console.log(newEventLog);
}


