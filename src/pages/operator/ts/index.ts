import { Component } from "../../../shared/base.cmp";
import { PoseLibrary } from "./poselibrary.cmp";
import { CommandRecorder } from "./commandrecorder.cmp";
import { PoseSaveModal } from "./posesavemodal.cmp";
import { SettingsModal } from "./settings.cmp";
import { OperatorComponent } from "./operator.cmp";

Component("pose-library", PoseLibrary);
Component("command-recorder", CommandRecorder);
Component('pose-save-modal', PoseSaveModal);
Component('settings-modal', SettingsModal, '/operator/css/settings.css');
Component('operator-page', OperatorComponent, '/operator/css/operator.css');