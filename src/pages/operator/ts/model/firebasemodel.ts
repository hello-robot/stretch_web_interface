import { FirebaseOptions, FirebaseError } from "firebase/app";
import { initializeApp, FirebaseApp } from 'firebase/app' // no compat for new SDK
import { getDatabase, ref, Database, set, child, get, onValue, update } from 'firebase/database'
import { getAuth, onAuthStateChanged, signInWithPopup, signInAnonymously, GoogleAuthProvider, User, signOut } from "firebase/auth";

const GAuthProvider = new GoogleAuthProvider();

import { firebaseApiKey } from "./database.config";
// import { Pose } from 'shared/util';
import { Pose } from 'shared/util';
import { Model, SettingEntry, Settings } from "./model";


const DEFAULT_CONFIG = {
	apiKey: firebaseApiKey,
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

export class FirebaseModel extends Model {
	private isAnonymous: boolean;
	private uid: string;
	private userEmail: string;
	protected enabled = true;
	private readyCallback?: (model: FirebaseModel) => void;
	private config: FirebaseOptions;
	private app: FirebaseApp;
	private database: Database;
	private auth: any;

	constructor(config?: FirebaseOptions, readyCallback?: (model: FirebaseModel) => void) {
		super();
		this.isAnonymous = false;
		this.uid = "";
		this.userEmail = "";

		/*
		* If somethings need to be initialized only after the database connection 
		* has been established, the Database.readyCallback static variable should be
		* set to the initialization function. If it is not null, it will be called
		* when successful sign in happens.
		*/
		if (readyCallback != null) {
			this.readyCallback = readyCallback.bind(this);
		}

		/* 
		* Firebase configuration information obtained from the Firebase console
		*/
		this.config = config ? config : DEFAULT_CONFIG;

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

	private handleError(error: FirebaseError) {
		const errorCode = error.code;
		const errorMessage = error.message;
		console.error("firebaseError: " + errorCode + ": " + errorMessage);
		console.trace();
	}

	private handleAuthStateChange(user: User | null) {
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
		this.enabled = false;
	}

	logEvent(eventName: string, eventInfo?: any) {
		if (!this.enabled) {
			return
		}
		var eventLog = {};
		if (eventInfo == undefined)
			eventInfo = "";
		let dir = '/users/' + (this.uid);
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

	addPose(id: string, pose: Pose) {
		if (!this.enabled) {
			return
		}
		let updates: any = {};
		updates['/users/' + this.uid + '/poses/' + id] = pose;
		return update(ref(this.database), updates);
	}

	async getPose(id: string): Promise<Pose | undefined> {
		const snapshot = await get(child(ref(this.database), '/users/' + (this.uid) + '/poses'))

		if (snapshot.exists()) {
			const poses = snapshot.val() as { [key: string]: Pose };
			if (id in poses) {
				return poses[id];
			} else {
				return
			}
		} else {
			throw "No data available";
		}
	}

	async getPoses(): Promise<Pose[]> {
		if (!this.enabled) {
			return []
		}

		const snapshot = await get(child(ref(this.database), '/users/' + (this.uid) + '/poses'))

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

	removePose(id: string) {
		if (!this.enabled) {
			return
		}
		let updates: any = {};
		updates['/users/' + (this.uid) + '/poses/' + (id)] = null;
		return update(ref(this.database), updates);
	}

	async setSetting(key: string, value: SettingEntry, namespace?: string) {
		if (!this.enabled) {
			return
		}

		let updates: any = {};
		if (namespace == undefined) {
			updates['/users/' + (this.uid) + '/settings/' + (key)] = value;
		} else {
			updates['/users/' + (this.uid) + '/settings/' + (namespace) + '/' + (key)] = value;
		}

		return update(ref(this.database), updates);
	}

	async loadSettingProfile(profileName: string): Promise<void> {
		if (!this.enabled) {
			return
		}

		const snapshot = await get(child(ref(this.database), '/users/' + (this.uid) + '/settingProfiles/' + (profileName)))

		if (snapshot.exists()) {
			const settings = snapshot.val() as Settings;
			let updates: any = {};
			updates['/users/' + (this.uid) + '/settings'] = settings;

			return update(ref(this.database), updates);
		} else {
			throw "No data available";
		}
	}

	async deleteSettingProfile(profileName: string): Promise<boolean> {
		const snapshot = await get(child(ref(this.database), '/users/' + (this.uid) + '/settingProfiles/' + (profileName)));

		if (snapshot.exists()) {
			const updates: any = {};
			updates['/users/' + (this.uid) + '/settingProfiles/' + (profileName)] = null;

			await update(ref(this.database), updates)
			return true;
		} else {
			return false
		}
	}

	async saveSettingProfile(profileName: string): Promise<void> {
		if (!this.enabled) {
			return
		}

		const settings = await this.getSettings();

		let updates: any = {};
		updates['/users/' + (this.uid) + '/settingProfiles/' + (profileName)] = settings;

		return update(ref(this.database), updates);
	}

	async getSetting(key: string, namespace?: string): Promise<SettingEntry> {
		if (!this.enabled) {
			return false
		}

		const settings = await this.getSettings();

		if (namespace == undefined) {
			if (key in settings) {
				return settings[key] as SettingEntry;
			} else {
				throw "Invalid key";
			}
		} else {
			if (key in (settings[namespace] as { [key: string]: SettingEntry })) {
				return (settings[namespace] as { [key: string]: SettingEntry })[key];
			} else {
				throw "Invalid key or namespace";
			}
		}
	}

	async getSettings(): Promise<Settings> {
		if (!this.enabled) {
			return {}
		}

		const snapshot = await get(child(ref(this.database), '/users/' + (this.uid) + '/settings'))

		if (snapshot.exists()) {
			return snapshot.val() as Settings;
		} else {
			throw "No data available";
		}
	}

	async reset() {
		if (!this.enabled) {
			return
		}
		let updates: any = {};
		updates['/users/' + (this.uid)] = null;
		return update(ref(this.database), updates);
	}
}
