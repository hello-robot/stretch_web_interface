import { insertCSS } from "shared/util";

import * as style from "../../../style.css";
import * as bootstrap from "bootstrap/dist/css/bootstrap.min.css"

insertCSS(style);
insertCSS(bootstrap)

import { PoseLibrary } from "./poselibrary.cmp";
import { CommandRecorder } from "./commandrecorder.cmp";
import { PoseSaveModal } from "./posesavemodal.cmp";
import { SettingsModal } from "./settings.cmp";
import { NavigationSettings } from "./navigationsettings.cmp";
import { ManipulationSettings } from "./manipulationsettings.cmp";
import { Battery } from "./battery.cmp";
import { OperatorComponent } from "./operator.cmp";

// FIXME(nickswalker,3-29-22): Webpack will shake out these modules if we don't do something with them. Need
//  to figure out how to label them as having side effects
console.log(PoseLibrary, CommandRecorder, Battery, PoseSaveModal, SettingsModal, OperatorComponent, ManipulationSettings, NavigationSettings)