import { FirebaseOptions, FirebaseError } from "firebase/app";
import { initializeApp, FirebaseApp } from 'firebase/app' // no compat for new SDK
import { getDatabase, ref, Database, set, child, get, onValue } from 'firebase/database'
import { getAuth, onAuthStateChanged, signInWithPopup, signInAnonymously, GoogleAuthProvider, User, signOut } from "firebase/auth";

const GAuthProvider = new GoogleAuthProvider();

import { firebaseApiKey } from "./database.config";
import { Pose } from './util';


const config = {
	apiKey: typeof firebaseApiKey !== 'undefined' ? firebaseApiKey : "",
	authDomain: "stretchteleop.firebaseapp.com",
	databaseURL: "https://stretchteleop.firebaseio.com",
	projectId: "stretchteleop",
	storageBucket: "stretchteleop.appspot.com",
	messagingSenderId: "410461558772",
	appId: "1:410461558772:web:e0bb0518c01269b1eacba1"
};

function databaseReadyCallback(model: FirebaseModel) {
	console.log("Ready to log data on the database.");

	model.logEvent("SessionStarted");
}

/*
* Database class for interfacing with the Firebase realtime database
*/
class FirebaseModel {
	private isAnonymous: boolean;
	private uid: string;
	private userEmail: string;
	private enabled: boolean;
	private readyCallback: (model: FirebaseModel) => void;
	private config: FirebaseOptions;
	private app: FirebaseApp;
	private database: Database;
	private auth: any;

	constructor(config: FirebaseOptions, readyCallback: (model: FirebaseModel) => void) {
		this.isAnonymous = false;
		this.uid = "";
		this.userEmail = "";
		this.enabled = true;

		/*
		* If somethings need to be initialized only after the database connection 
		* has been established, the Database.readyCallback static variable should be
		* set to the initialization function. If it is not null, it will be called
		* when successful sign in happens.
		*/
		this.readyCallback = readyCallback.bind(this);

		/* 
		* Firebase configuration information obtained from the Firebase console
		*/
		this.config = config;

		this.app = initializeApp(this.config);
		this.database = getDatabase(this.app);
		this.auth = getAuth(this.app);
		onAuthStateChanged(this.auth, (user) => this.handleAuthStateChange(user));
	}

	signInAnonymously() {
		if (this.uid == null && this.userEmail == null) {
			signInAnonymously(this.auth).catch(this.handleError);
		}
	}

	signInWithGoogle() {
		if (this.userEmail == null) {
			signInWithPopup(this.auth, GAuthProvider)
				.then((result) => {
					const credential = GoogleAuthProvider.credentialFromResult(result);
					const token = credential!.accessToken;
					const user = result.user;
				})
				.catch(this.handleError);
		}
	}

	handleError(error: FirebaseError) {
		const errorCode = error.code;
		const errorMessage = error.message;
		console.error("firebaseError: " + errorCode + ": " + errorMessage);
		console.trace();
	}

	handleAuthStateChange(user: User | null) {
		if (user) {
			this.isAnonymous = user.isAnonymous;
			this.uid = user.uid;

			if (!this.isAnonymous) {
				console.log("Signed in as " + user.displayName);
				console.log("Email: " + user.email);
				this.userEmail = user.email!;

				console.log(user);

				let signInButton = document.getElementById('googleSignInButton');
				let signInInfo = document.getElementById('googleSignInInfo');
				if (signInButton != null) {
					signInButton.style.display = 'none';
				}
				if (signInInfo != null) {
					signInInfo.style.display = 'block';
					signInInfo.innerHTML = "<i>Signed in as " + user.displayName + "</i>";
				}
			} else {
				console.log("Signed in anonymously as " + user.uid);
				this.userEmail = "";
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
				this.readyCallback(this);

		} else {
			console.log("User is signed out.");
		}
	}

	signOut() {
		signOut(this.auth).catch(this.handleError);
		this.uid = "";
	}

	logEvent(eventName: string, eventInfo?: any) {
		if (this.enabled!) {
			return
		}
		var eventLog = {};
		if (eventInfo == undefined)
			eventInfo = "";
		let dir = 'users/' + (this.uid);
		let dbRef = ref(this.database, dir);
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

	addPose(name: string, pose: Pose) {
		if (this.enabled!) {
			return
		}
		let dir = 'users/' + (this.uid) + '/poses/' + (name);
		let dbRef = ref(this.database, dir);
		dbRef.update(pose);
	}

	async getGlobalPoses(): Promise<Pose[]> {
		const snapshot = await get(child(ref(this.database), '/poses'))

		if (snapshot.exists()) {
			const poses = snapshot.val() as { [key: string]: Pose };
			return Object.keys(poses)
				.map(function (key) {
					return poses[key];
				});
		} else {
			throw "No data available";
		}
	}

	async getUserPoses(): Promise<Pose[]> {
		const snapshot = await get(child(ref(this.database), 'users/' + (this.uid) + '/poses'))

		if (snapshot.exists()) {
			const poses = snapshot.val() as { [key: string]: Pose };
			return Object.keys(poses)
				.map(function (key) {
					return poses[key];
				});
		} else {
			throw "No data available";
		}
	}

	get disabled() {
		return this.enabled;
	}

	set disabled(value) {
		this.enabled = value;
	}
}
