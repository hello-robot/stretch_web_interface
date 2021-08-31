
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
class Database {
  
  constructor(config, readyCallback) {
    this.isAnonymous = false;
    this.uid = null;
    this.userEmail = null;
    this.isLogging = true;

    /*
    * If somethings need to be initialized only after the database connection 
    * has been established, the Database.readyCallback static variable should be
    * set to the initialization function. If it is not null, it will be called
    * when successful sign in happens.
    */
    this.readyCallback = readyCallback;

    /* 
    * Firebase configuration information obtained from the Firebase console
    */
    this.config = config;


    // this.nLibrariesLoaded = 0;
    // this.loadJSLibrary(src="https://www.gstatic.com/firebasejs/8.6.8/firebase-app.js");
    // this.loadJSLibrary(src="https://www.gstatic.com/firebasejs/8.6.8/firebase-auth.js");
    // this.loadJSLibrary(src="https://www.gstatic.com/firebasejs/8.6.8/firebase-database.js");

    this.initialize();
  }

  /*
  * Function to initialize firebase and sign in anonymously
  */
  initialize() {
      this.app = firebase.initializeApp(this.config);

      /*
       * This callback syntax is necessary to access
       * `this` from the callback function.
      */
      firebase.auth().onAuthStateChanged((user) => this.handleAuthStateChange(user)); 

      // Wait a little bit to see is we are already logged in
      // then attempt an anonymous sign in
      // window.setTimeout(function() {
      //   this.signInAnonymously();
      // }, 500);

      //this.signInWithGoogle();
  }
  
  /*
  * Callback function for when a library is dynamically loaded
  * Will need to wait for all libraries to be loaded before
  * initializing the database.
  */
  
  // libraryLoadCallback() {
  //   this.nLibrariesLoaded++;
  //   console.log("Loaded " + this.nLibrariesLoaded);
  //   if (this.nLibrariesLoaded == 3) {
  //     this.initialize();
  //   }
  // }
  
  // loadJSLibrary(path) {
  //     var js = document.createElement("script");
  //     js.type = "text/javascript";
  //     //js.onreadystatechange = this.libraryLoadCallback;
  //     js.onload = this.libraryLoadCallback;
  //     js.src = path;
  //     document.head.appendChild(js);
  //     console.log("Will load: " + path);
  // }


  signInAnonymously() {
    if (this.uid == null && this.userEmail == null) {
      firebase
        .auth()
        .signInAnonymously()
        .catch(this.handleError);
    }
  }

  signInWithGoogle() {
    if (this.userEmail == null) {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().useDeviceLanguage();
      firebase
        .auth()
        .signInWithPopup(provider)
        .then((result) => {
          // This gives you a Google Access Token. You can use it to access the Google API.
          var token = result.credential.accessToken;
          // The signed-in user info.
          var user = result.user;
        })
        .catch(this.handleError);
    }
  }

  handleError(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.error("firebaseError: " + errorCode + ": " + errorMessage);
    console.trace();
  }

  handleAuthStateChange(user) {
    if (user) {
      this.isAnonymous = user.isAnonymous;
      this.uid = user.uid;

      if (!this.isAnonymous) {
        console.log("Signed in as " + user.displayName);
        console.log("Email: " + user.email);
        this.userEmail = user.email;

        console.log(user);

        let signInButton = document.getElementById('googleSignInButton');
        let signInInfo = document.getElementById('googleSignInInfo');
        if (signInButton != null) {
          signInButton.style.display = 'none';
        }
        if (signInInfo != null) {
          signInInfo.style.display = 'block';
          signInInfo.innerHTML="<i>Signed in as " + user.displayName + "</i>";
        }
      } else {
        console.log("Signed in anonymously as " + user.uid);
        this.userEmail = null;
        let signInButton = document.getElementById('googleSignInButton');
        let signInInfo = document.getElementById('googleSignInInfo');
        if (signInButton != null) {
          signInButton.style.display = 'block';
        }
        if (signInInfo != null) {
          signInInfo.style.display = 'none';
        }
      }

      if (this.readyCallback != null || this.readyCallback != undefined)
      this.readyCallback();

    } else {
      console.log("User is signed out.");
    }
  }

  signOut() {
    firebase.auth().signOut().catch(this.handleError);
    this.uid = null;
  }
  
  logEvent(eventName, eventInfo) {
    if (this.isLogging) {
      var eventLog = {};
      if (eventInfo == undefined)
        eventInfo = "";
      let dir = 'users/' + (this.uid);
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

  addPose(id, description, pose) {
    let dir = 'users/' + (this.uid) + '/poses/' + (id);
    let dbRef = firebase.database().ref(dir);
    dbRef.update({pose: pose, description: description});
  }

  getGlobalPoses() {
    let dir = '/poses';
    let dbRef = firebase.database().ref(dir);
    return dbRef.once("value");
  }

  getUserPoses() {
    let dir = 'users/' + (this.uid) + '/poses';
    let dbRef = firebase.database().ref(dir);
    return dbRef.once("value");
  }
}
