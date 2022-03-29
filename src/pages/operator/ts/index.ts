import {PoseLibrary} from "./poselibrary.cmp";
import {CommandRecorder} from "./commandrecorder.cmp";
import {PoseSaveModal} from "./posesavemodal.cmp";
import {SettingsModal} from "./settings.cmp";
import {OperatorComponent} from "./operator.cmp";

// FIXME(nickswalker,3-29-22): Webpack will shake out these modules if we don't do something with them. Need
//  to figure out how to label them as having side effects
console.log(PoseLibrary, CommandRecorder, PoseSaveModal, SettingsModal, OperatorComponent)