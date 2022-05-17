import { FirebaseOptions, FirebaseError } from "firebase/app";
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, Database, child, get, update, push } from 'firebase/database';
import { getAuth, onAuthStateChanged, signInWithPopup, signInAnonymously, GoogleAuthProvider, User, signOut } from "firebase/auth";

const GAuthProvider = new GoogleAuthProvider();

import { CONFIG } from "./firebase.config";
import { NamedPose } from 'shared/util';
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

	constructor(config: FirebaseOptions = CONFIG, readyCallback = (model: FirebaseModel) => { }) {
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

		// this.signInAnonymous(); // the user can manually sign in with google later
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
			if (user.isAnonymous && this.uid && this.userEmail) {
				return
			}

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

			this.getUserDataFirebase().then(async (userData) => {
				this.localSettings = userData.settings;
				this.sessions = userData.sessions ? userData.sessions : [];
				this.localSettings.settingsProfiles = userData.settings.settingsProfiles ? userData.settings.settingsProfiles : {} 
				console.log(userData.settings.settingsProfiles)
				this.readyCallback(this);
			}).catch((error) => {
				console.trace(error)
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

	addPose(id: string, pose: NamedPose) {
		if (!this.enabled) {
			return
		}
		if (!("pose" in this.localSettings!))
			this.localSettings!.pose = {}

		this.localSettings!.pose[id] = pose;

		return this.writeSettings(this.localSettings!)
	}

	getPose(id: string): NamedPose | undefined {
		return this.localSettings!.pose[id];
	}

	getPoses(): NamedPose[] {
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

		console.log(profileName)
		if (profileName === "default") {
			console.log("default")
			this.localSettings!.setting = JSON.parse(JSON.stringify(DEFAULTS.setting))	
		} else {
			this.localSettings!.setting = JSON.parse(JSON.stringify(this.localSettings!.settingsProfiles[profileName]))
		}
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

	getSettingProfiles(): string[] {
		return Object.keys(this.localSettings!.settingsProfiles)
	}

	async saveSettingProfile(profileName: string) {
		if (!this.enabled) {
			return
		}

		this.localSettings!.settingsProfiles[profileName] = JSON.parse(JSON.stringify(this.localSettings!.setting))
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
				throw `Invalid key: ${key}`;
			}
		} else {
			if (key in (settings.setting[namespace] as { [key: string]: SettingEntry })) {
				return (settings.setting[namespace] as { [key: string]: SettingEntry })[key];
			} else {
				throw `Invalid key or namespace: {key: ${key}, namespace: ${namespace}}`;
			}
		}
	}

	getSettings() {
		return JSON.parse(JSON.stringify(this.localSettings!.setting));
	}

	private async getUserDataFirebase() {
		const snapshot = await get(child(ref(this.database), '/users/' + (this.uid)))

		if (snapshot.exists()) {
			return snapshot.val();
		} else {
			throw "No data available";
		}
	}

	async startSession(username: string, sessionId: string) {
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
			username: username,
			settings: this.getSettings(),
            timestamp: new Date().getTime()
		});
	}

	stopSession() {
		if (!this.enabled) {
			return
		}
		this.logComand({
			type: "stopSession",
            timestamp: new Date().getTime()
		})

		this.sid = "";
	}

	async logComand(cmd: cmd) {
		if (!this.enabled || this.sid == "") {
			return
		}

		const commandKey = push(child(ref(this.database), `/sessions/${this.sid}`)).key;

		const updates: any = {};
		updates[`/sessions/${this.sid}/${commandKey}`] = cmd;

		return update(ref(this.database), updates);
	}

	getSessions(): string[] {
		return this.sessions;
	}

	async getCommands(sessionId: string): Promise<cmd[]> {
		if (!this.enabled) {
			return []
		}

		let snapshot = await get(child(ref(this.database), `/sessions/${sessionId}`));

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

		return this.writeSettings(JSON.parse(JSON.stringify(DEFAULTS)));
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

	static isConfigurationValid(config: FirebaseOptions) {
		// Do we atleast have a key configured?
		return config.apiKey != undefined
	}
}
