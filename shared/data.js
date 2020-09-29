

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
  console.log("User is admin? " + isAdmin);
  
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
    }

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

    let summaryDiv = document.createElement('div');
    summaryDiv.innerHTML = '<b>Number of events:</b> '+ timestamps.length;
    summaryDiv.setAttribute('class', 'mb-2');
    cardBodyDiv.appendChild(summaryDiv);

    let participantDiv = document.createElement('div');
    participantDiv.setAttribute('class', 'mb-2');
    let participantSpan = document.createElement('span');
    participantSpan.setAttribute('class', 'mr-4');
    participantSpan.innerHTML = '<b>Participant ID:</b> '+ participantID;
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

    cardHeaderDiv.appendChild(expandButton);
    collapseDiv.appendChild(cardBodyDiv);

    cardDiv.appendChild(cardHeaderDiv);
    cardDiv.appendChild(collapseDiv);

    userListDiv.appendChild(cardDiv);
  }
}

function addParticipantID(userIndex) {
  let participantText = document.getElementById('participant' + userIndex);
  let participantName = participantText.value;

  console.log("Adding participant ID " + participantName + " for user " + userIDs[userIndex]);

  // Update the database
  logUserEvent(userIDs[userIndex], "SessionStarted", participantName);
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


