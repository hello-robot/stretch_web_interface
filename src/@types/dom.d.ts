import { cmd } from "shared/commands";
import { NamedPose } from "shared/util";
import { SettingEntry } from "../pages/operator/ts/model/model";

interface CustomEventMap {
    "commandsent": CustomEvent<cmd>;
    "posecreated": CustomEvent<NamedPose>;
    "posedeleted": CustomEvent<string>;
    "poseclicked": CustomEvent<NamedPose>;
    "createprofile": CustomEvent<{name: string}>;
    "loadprofile": CustomEvent<{name: string}>;
    "deleteprofile": CustomEvent<{name: string}>;
    "downloadsettings": CustomEvent<{}>;
    "settingchanged": CustomEvent<{key: string, value: SettingEntry, namespace: string}>;
}

declare global {
    interface Window {
        addEventListener<K extends keyof CustomEventMap>(type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void): void;

        removeEventListener<K extends keyof CustomEventMap>(type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void): void;
    }
    interface HTMLElement {
        addEventListener<K extends keyof CustomEventMap>(type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void): void;

        removeEventListener<K extends keyof CustomEventMap>(type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void): void;
    }
    interface Document {
        addEventListener<K extends keyof CustomEventMap>(type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void): void;

        removeEventListener<K extends keyof CustomEventMap>(type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void): void;
    }
}