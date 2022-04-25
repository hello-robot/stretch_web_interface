import { FirebaseOptions, FirebaseError } from "firebase/app";
import { initializeApp, FirebaseApp } from 'firebase/app' // no compat for new SDK
import { getDatabase, ref, Database, set, child, get, onValue, update, push } from 'firebase/database'
import { getAuth, onAuthStateChanged, signInWithPopup, signInAnonymously, GoogleAuthProvider, User, signOut } from "firebase/auth";

const GAuthProvider = new GoogleAuthProvider();

import { CONFIG } from "./firebase.config";
import { Pose } from 'shared/util';
import { cmd } from "shared/commands"
import { Model, SettingEntry, Settings, DEFAULTS, generateSessionID } from "./model";

export class FirebaseModel extends Model {
	private isAnonymous: boolean;
	private uid: string;
	private sid: string;
	private userEmail: string;
	protected enabled = true;
	private readyCallback: (model: FirebaseModel) => void;
	private config: FirebaseOptions;
	private app: FirebaseApp;
	private database: Database;
	private auth: any;

	private localSettings?: Settings
	private sessions: string[] = [];

	constructor(config = CONFIG, readyCallback = (model: FirebaseModel) => { }) {
		super();
		this.isAnonymous = false;
		this.uid = "";
		this.sid = "";
		this.userEmail = "";

		this.readyCallback = readyCallback.bind(this);

		this.config = config;

		this.app = initializeApp(this.config);
		this.database = getDatabase(this.app);
		this.auth = getAuth(this.app);
		onAuthStateChanged(this.auth, (user) => this.handleAuthStateChange(user));

		this.signInAnonymous(); // the user can manually sign in with google later
	}

	private signInAnonymous() {
		if (!(this.uid && this.userEmail)) {
			signInAnonymously(this.auth).catch(this.handleError);
		}
	}

	private signInWithGoogle() {
		if (this.userEmail == "") {
			signInWithPopup(this.auth, GAuthProvider)
				.then((result) => {
					const credential = GoogleAuthProvider.credentialFromResult(result);
					const token = credential!.accessToken;
					const user = result.user;
				})
				.catch(this.handleError);
		}
	}

	authenticate() {
		this.signInWithGoogle();
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

			this.getSettingsFirebase().then(async (settings) => {
				this.localSettings = settings;
				this.readyCallback(this);
			}).catch((error) => {
				console.warn("Detected that FirebaseModel isn't initialized. Reinitializing.");
				this.reset();
				this.readyCallback(this);
			})
		} else {
			console.log("User is signed out.");
		}
	}

	signOut() {
		signOut(this.auth).catch(this.handleError);
		this.uid = "";
		this.enabled = false;
	}

	addPose(id: string, pose: Pose) {
		if (!this.enabled) {
			return
		}
		this.localSettings!.pose[id] = pose;
		return this.writeSettings(this.localSettings!)
	}

	getPose(id: string): Pose | undefined {
		return this.localSettings!.pose[id];
	}

	getPoses(): Pose[] {
		if (!this.enabled) {
			return []
		}


		const poses = this.localSettings!.pose
		if (poses)
			return Object.keys(poses)
				.map(function (key) {
					return poses[key];
				});
		return []
	}

	removePose(id: string) {
		if (!this.enabled) {
			return
		}
		delete this.localSettings!.pose[id]
		return this.writeSettings(this.localSettings!);
	}

	setSetting(key: string, value: SettingEntry, namespace?: string) {
		if (!this.enabled) {
			return
		}

		if (namespace == '') {
			this.localSettings!.setting[key] = value;
		} else {
			if (this.localSettings!.setting[namespace!]) {
				(this.localSettings!.setting[namespace!] as { [key: string]: SettingEntry })[key] = value;
			} else {
				this.localSettings!.setting[namespace!] = { key: value }
			}
		}

		return this.writeSettings(this.localSettings!);
	}

	loadSettingProfile(profileName: string) {
		if (!this.enabled) {
			return
		}

		this.localSettings!.setting = { ...this.localSettings!.settingsProfiles[profileName] }
		return this.writeSettings(this.localSettings!)
	}

	deleteSettingProfile(profileName: string): boolean {
		if (this.localSettings!.settingsProfiles[profileName]) {
			delete this.localSettings!.settingsProfiles[profileName];

			this.writeSettings(this.localSettings!)
			return true
		} else {
			return false
		}
	}

	async saveSettingProfile(profileName: string) {
		if (!this.enabled) {
			return
		}

		this.localSettings!.settingsProfiles[profileName] = { ...this.localSettings!.setting }
		return this.writeSettings(this.localSettings!)
	}

	getSetting(key: string, namespace?: string): SettingEntry {
		if (!this.enabled) {
			return false
		}

		const settings = this.localSettings!;

		if (namespace == undefined) {
			if (key in settings.setting) {
				return settings.setting[key] as SettingEntry;
			} else {
				throw "Invalid key";
			}
		} else {
			if (key in (settings.setting[namespace] as { [key: string]: SettingEntry })) {
				return (settings.setting[namespace] as { [key: string]: SettingEntry })[key];
			} else {
				throw "Invalid key or namespace";
			}
		}
	}

	getSettings() {
		return JSON.parse(JSON.stringify(this.localSettings!.setting));
	}

	private async getSettingsFirebase() {
		const snapshot = await get(child(ref(this.database), '/users/' + (this.uid) + '/settings'))

		if (snapshot.exists()) {
			return snapshot.val();
		} else {
			throw "No data available";
		}
	}

	async startSession(sessionId: string) {
		if (!this.enabled) {
			return
		}
        this.sid = sessionId ? sessionId : generateSessionID();

        this.sessions.push(this.sid);

		const updates: any = {};
		updates[`/users/${this.uid}/sessions`] = this.sessions;
		await update(ref(this.database), updates);

		return this.logComand({
			type: "startSession",
		});
	}

	stopSession() {
		if (!this.enabled) {
			return
		}

		this.sid = "";

		return this.logComand({
			type: "stopSession",
		})
	}

	async logComand(cmd: cmd) {
		if (!this.enabled || this.sid == "") {
			return
		}

		let command = { ...cmd };
		command.timestamp = command.timestamp ? command.timestamp : new Date().getTime();

		const commandKey = push(child(ref(this.database), `/sessions/${this.sid}`)).key;

		const updates: any = {};
		updates[`/sessions/${this.sid}/${commandKey}`] = command;

		return update(ref(this.database), updates);
	}

	getSessions(): string[] {
		return this.sessions;
	}

	async getCommands(sessionId: string): Promise<cmd[]> {
		if (!this.enabled || this.sid == "") {
			return []
		}

		let snapshot = await get(child(ref(this.database), `sessions/${sessionId}`));

		if (snapshot.exists()) {
			let commands = snapshot.val();
			return Object.keys(commands)
				.map(function (key) {
					return commands[key];
				});
		} else {
			throw "No data available";
		}
	}

	async reset() {
		if (!this.enabled) {
			return
		}

		return this.writeSettings(DEFAULTS);
	}

	private async writeSettings(settings: Settings) {
		if (!this.enabled) {
			return
		}

		this.localSettings = settings;

		let updates: any = {};
		updates['/users/' + (this.uid) + '/settings'] = settings;
		return update(ref(this.database), updates);
	}
}
