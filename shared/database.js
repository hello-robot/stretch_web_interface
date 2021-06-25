
var config = {
  apiKey: "AIzaSyAJxcCk9Wp9GtFcveVTG_jgQgGbaUlruJA",
  authDomain: "stretchteleop.firebaseapp.com",
  databaseURL: "https://stretchteleop.firebaseio.com",
  projectId: "stretchteleop",
  storageBucket: "stretchteleop.appspot.com",
  messagingSenderId: "410461558772",
  appId: "1:410461558772:web:e0bb0518c01269b1eacba1"
};

function databaseReadyCallback() {
  console.log("Ready to log data on the database.");
  // Create directory in database to save this user's data
  Database.logEvent("SessionStarted");
}

/*
* Database class for interfacing with the Firebase realtime database
*/
function Database(config, readyCallback) {
  
  Database.isAnonymous = false;
  Database.uid = null;
  Database.userEmail = null;
  Database.isLogging = true;

  /*
  * If somethings need to be initialized only after the database connection 
  * has been established, the Database.readyCallback static variable should be
  * set to the initialization function. If it is not null, it will be called
  * when successful sign in happens.
  */
  Database.readyCallback = readyCallback;

  /* 
  * Firebase configuration information obntained from the Firebase console
  */
  Database.config = config;

  /*
  * Function to initialize firebase and sign in anonymously
  */
  Database.initialize = function(){
      Database.app = firebase.initializeApp(Database.config);
      firebase.auth().onAuthStateChanged(Database.handleAuthStateChange);
      // Wait a little bit to see is we are already logged in
      // then attempt an anonymous sign in
      window.setTimeout(function(){
        Database.signInAnonymously();
      }, 500);
  }
  
  /*
  * Callback function for when a library is dynamically loaded
  * Will need to wait for all libraries to be loaded before
  * initializing the database.
  */
  
  // Database.nLibrariesLoaded = 0;
  // Database.libraryLoadCallback = function(){
  //   Database.nLibrariesLoaded++;
  //   console.log("Loaded " + Database.nLibrariesLoaded);
  //   if (Database.nLibrariesLoaded == 3) {
  //     Database.initialize();
  //   }
  // }
  
  // Database.loadJSLibrary = function(path) {
  //     var js = document.createElement("script");
  //     js.type = "text/javascript";
  //     //js.onreadystatechange = Database.libraryLoadCallback;
  //     js.onload = Database.libraryLoadCallback;
  //     js.src = path;
  //     document.head.appendChild(js);
  //     console.log("Loaded: " + path);
  // }

  // Database.loadJSLibrary(src="https://www.gstatic.com/firebasejs/8.6.8/firebase-app.js");
  // Database.loadJSLibrary(src="https://www.gstatic.com/firebasejs/8.6.8/firebase-auth.js");
  // Database.loadJSLibrary(src="https://www.gstatic.com/firebasejs/8.6.8/firebase-database.js");

  Database.initialize();

  Database.signInAnonymously = function() {
    if (Database.uid == null && Database.userEmail == null) {
      firebase
        .auth()
        .signInAnonymously()
        .catch(Database.handleError);
    }
  }

  Database.signInWithGoogle = function () {
    if (Database.userEmail == null) {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().useDeviceLanguage();
      firebase
        .auth()
        .signInWithPopup(provider)
        .then(function (result) {
          // This gives you a Google Access Token. You can use it to access the Google API.
          var token = result.credential.accessToken;
          // The signed-in user info.
          var user = result.user;
        })
        .catch(Database.handleError);
    }
  }

  Database.handleError = function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log("Error " + errorCode + ": " + errorMessage);
  }

  Database.handleAuthStateChange = function(user) {
    if (user) {
      Database.isAnonymous = user.isAnonymous;
      Database.uid = user.uid;

      if (!Database.isAnonymous) {
        console.log("Signed in as " + user.displayName);
        console.log("Email: " + user.email);
        Database.userEmail = user.email;

        let signinButton = document.getElementById('googleSignInButton');
        let signinInfo = document.getElementById('googleSignInInfo');
        if (signinButton != null) {
          signinButton.style.display = 'none';
        }
        if (signinInfo != null) {
          signinInfo.style.display = 'block';
          signinInfo.innerHTML="<i>Signed in as " + user.displayName + "</i>";
        }
      } else {
        console.log("Signed in anonymously as " + user.uid);
        Database.userEmail = null;
        let signinButton = document.getElementById('googleSignInButton');
        let signinInfo = document.getElementById('googleSignInInfo');
        if (signinButton != null) {
          signinButton.style.display = 'block';
        }
        if (signinInfo != null) {
          signinInfo.style.display = 'none';
        }
      }

      if (Database.readyCallback != null || Database.readyCallback != undefined)
        Database.readyCallback();

    } else {
      console.log("User is signed out.");
    }
  }

  Database.signOut = function() {
    firebase.auth().signOut().catch(Database.handleError);
    Database.uid = null;
  }
  
  Database.logEvent = function(eventName, eventInfo) {
    if (Database.isLogging) {
      eventLog = {};
      if (eventInfo == undefined)
        eventInfo = "";
      let dir = 'users/' + (Database.uid);
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
      console.log("Logging event: ------");
      console.log(newEventLog);
    }
  }
}
