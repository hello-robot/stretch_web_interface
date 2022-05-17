import { BaseComponent, Component, bootstrapCSS } from "shared/base.cmp"
import { Model } from "./model/model"
import { CancelledGoalCommand, cmd, NavGoalCommand, PoseGoalCommand } from "shared/commands"
import { RemoteRobot } from "./remoterobot"
import { RobotPose, uuid } from "shared/util"
import { Modal } from "bootstrap";
import ROSLIB from "roslib"

const template = `
<style>${bootstrapCSS}</style>
<div class="input-group input-group-sm">
    <button class="btn btn-primary btn-sm" type="button" data-ref="setup-stop-recording">Record</button>    
    <select data-ref="play-session" class="form-select form-select-sm" aria-label="Play session" disabled>
        <option value="" selected hidden>Play Session</option>
        <option value="">b</option>
        <option value="">c</option>
    </select>
    <button class="btn btn-secondary btn-sm" type="button" data-ref="download">Download</button>
</div>


<!-- Record Settings Modal -->
<div class="modal fade" id="recordSettingsModal" tabindex="-1" aria-labelledby="recordSettingsModalLabel" aria-hidden="true" data-ref="modal-container">
    <div class="modal-dialog">
    <form class="row g-3 needs-validation modal-content" noValidate>
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="recordSettingsModalLabel">Recording Settings</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="form-group mb-3">
                        <!-- <label for="poseName">Username</label> -->
                        <input type="text" class="form-control" id="poseName" placeholder="Username" required data-ref="record-setting-username">
                            <div class="invalid-feedback">
                                Please enter a username
                            </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Start Recording</button>
                </div>
            </div>
        </form>
    </div>
</div>
`

@Component("command-recorder")
export class CommandRecorder extends BaseComponent {
    _recording = false
    model?: Model

    playSessionSelector: HTMLSelectElement
    robot?: RemoteRobot

    replayer?: Replay

    modalContainer: HTMLElement
    modal: Modal

    robotState: {
        basePos: ROSLIB.Transform,
        jointStates: RobotPose
    } = {
        basePos: new ROSLIB.Transform,
        jointStates: {}
    }

    constructor() {
        super(template);

        this.modalContainer = this.refs.get("modal-container")!
        this.modal = new Modal(this.modalContainer, {})

        this.refs.get("setup-stop-recording")!.onclick = () => {
            if (this.recording) {
                this.recording = false;
            } else {
                this.modal.show();
            }
        }

        this.playSessionSelector = this.refs.get("play-session")! as HTMLSelectElement
        this.playSessionSelector.addEventListener("change", () => {
            this.playSession(this.playSessionSelector.value);
        })

        // TODO (kavidey): make a way to download a specific session instead of the whole thing?
        this.refs.get("download")!.onclick = async () => {
            if (this.model) {
                let allSessionData: { [key: string]: cmd[] } = {};
                for (let sessionId of this.model.getSessions()) {
                    allSessionData[sessionId] = await this.model.getCommands(sessionId);
                }

                var element = document.createElement('a');
                var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allSessionData, null, 4));
                element.setAttribute('href', 'data:' + data);

                // TODO [vinitha]: find better way for make unique file name
                var d = new Date();
                var pst_date = d.toLocaleString("en-US", {
                    timeZone: "America/Los_Angeles"
                })
                element.setAttribute('download', 'data-' + pst_date + '.json');
                document.body.appendChild(element);
                element.click()
                document.body.removeChild(element);
                localStorage.removeItem('commands');
            }

        }

        if (this.disabled) {
            this.shadowRoot?.querySelectorAll(".btn").forEach(button => button.disabled = "true")
        }

        const form = this.shadowRoot.querySelector("form")
        form.onsubmit = (event) => {
            event.preventDefault();
            form.classList.add('was-validated');
            // FIXME: Check that pose name doesn't already exist
            // FIXME: Add reasonable limits on pose name character set and length
            if (form.checkValidity() === false) {
                event.stopPropagation();
            } else {
                this.modal.hide();
                this.recording = true;
            }
        }
    }

    get recording() {
        return this._recording
    }

    initializeLogging(model: Model) {
        this.model = model;
        this.setSessions(model.getSessions());
    }

    logCommand(event: CustomEvent<cmd>) {
        let command = { ...event.detail };
		command.timestamp = command.timestamp ? command.timestamp : new Date().getTime();
        if (this.robot?.sensors.sensors.base.transform && this.robot?.sensors.jointState) {
            command.robotState = {
                basePos: this.robot?.sensors.sensors.base.transform as ROSLIB.Transform,
                jointStates: this.robot?.sensors.jointState
            }
        }
        console.log(this.model.uid);
        this.model?.logComand(command);
    };

    set recording(value: boolean) {
        if (value === this._recording) return;
        this._recording = value
        if (value) {
            this.refs.get("setup-stop-recording")!.innerText = "Stop";
            this.model!.startSession(this.refs.get("record-setting-username")!.value)
            window.addEventListener("commandsent", this.logCommand.bind(this));
        } else {
            window.removeEventListener('commandsent', this.logCommand.bind(this));
            this.refs.get("setup-stop-recording")!.innerText = "Record";
            this.model!.stopSession();
            this.setSessions(this.model!.getSessions());
        }
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(value) {
        if (value) {
            this.setAttribute("disabled", "")
            this.refs.get("setup-stop-recording")!.disabled = "true"
        } else {
            if (this.hasAttribute("disabled")) {
                this.removeAttribute("disabled")
            }
            this.refs.get("setup-stop-recording")!.disabled = null
            // Are we holding a recording
            if (this.recordingBuffer) {
                this.refs.get("play")!.disabled = null
                this.refs.get("download")!.disabled = null
            }
        }
    }

    setupPlayback(robot: RemoteRobot) {
        this.robot = robot;
        this.replayer = new Replay([], this.robot.robotChannel)
    }

    setSessions(sessions: string[]) {
        if (sessions.length > 0) {
            this.playSessionSelector.disabled = false;


            const items = [this.playSessionSelector.children[0], ...sessions.map((sid) => {
                const newOption = document.createElement("option")
                newOption.value = sid
                newOption.innerText = sid
                return newOption
            })]

            this.playSessionSelector.replaceChildren(...items);
        } else {
            this.playSessionSelector.disabled = true;
        }
    }

    async playSession(sid: string) {
        if (this.robot) {
            console.log("Playing session", sid)
            this.replayer?.newSession(await this.model?.getCommands(sid)!);
            this.replayer?.restart();
        }
    }

    completeGoal(id: string) {
        this.replayer?.completeGoal(id);
    }
}

// https://stackoverflow.com/a/61890905/6454085
/** Represents the `setTimeout` with an ability to perform pause/resume actions */
export class PausableTimer {
    private _start: Date;
    private _remaining: number;
    private _durationTimeoutId?: NodeJS.Timeout;
    private _callback: (...args: any[]) => void;
    private _done = false;
    get done () {
        return this._done;
    }

    constructor(callback: (...args: any[]) => void, ms = 0) {
        this._callback = () => {
            callback();
            this._done = true;
        };
        this._remaining = ms;
        this.resume();
    }

    /** pauses the timer */
    pause(): PausableTimer {
        if (this._durationTimeoutId && !this._done) {
            this._clearTimeoutRef();
            this._remaining -= new Date().getTime() - this._start.getTime();
        }
        return this;
    }

    /** resumes the timer */
    resume(): PausableTimer {
        if (!this._durationTimeoutId && !this._done) {
            this._start = new Date;
            this._durationTimeoutId = setTimeout(this._callback, this._remaining);
        }
        return this;
    }

    /** 
     * clears the timeout and marks it as done. 
     * 
     * After called, the timeout will not resume
     */
    clearTimeout() {
        this._clearTimeoutRef();
        this._done = true;
    }

    private _clearTimeoutRef() {
        if (this._durationTimeoutId) {
            clearTimeout(this._durationTimeoutId);
            this._durationTimeoutId = undefined;
        }
    }

}

class Replay {
    session: cmd[];
    curr_action = 0;
    timeOut?: PausableTimer
    cmdCallback: (cmd: cmd) => void

    private pendingGoals: Map<uuid, () => void> = new Map()

    constructor(session: cmd[], cmdCallback: (cmd: cmd) => void) {
        this.session = session;
        this.curr_action = 0;
        this.cmdCallback = cmdCallback;
    }

    newSession(session: cmd[]) {
        this.session = session;
        this.curr_action = 0;
        this.timeOut = undefined;
    }

    resume() {
        if (this.timeOut) {
            this.timeOut.resume();
        }
        this.step();
    }

    step() {
        let action = this.session[this.curr_action];
        if (action.type == "navGoal" || action.type == "poseGoal") {

            if ((this.curr_action + 1 < this.session.length) && (this.session[this.curr_action + 1].type == "cancelledGoal")) {
                this.curr_action += 1;
                const cancelledGoal: CancelledGoalCommand = this.session[this.curr_action + 1] as CancelledGoalCommand;
                action = {
                    type: cancelledGoal.name == "nav" ? "navGoal" : "poseGoal",
                    timestamp: cancelledGoal.timestamp,
                    goal: cancelledGoal.goal,
                    id: cancelledGoal.id
                } as NavGoalCommand | PoseGoalCommand;
            }

            this.cmdCallback(action);
            const waitForGoal = new Promise<void>((resolve, reject) => {
                this.pendingGoals.set(action.id, resolve);
            })

            waitForGoal.then(() => {
                this.curr_action += 1;
                this.step;
            })
        } else {
            this.cmdCallback(action);
    
            if (this.curr_action + 1 < this.session.length) {
                this.timeOut = new PausableTimer(this.step.bind(this), this.session[this.curr_action+1].timestamp! - this.session[this.curr_action].timestamp!);
                this.curr_action += 1;
            }
        }
    }

    pause() {
        if (this.timeOut) {
            this.timeOut.pause();
        }
    }

    restart() {
        this.curr_action = 0;
        this.timeOut?.clearTimeout();
        this.timeOut = undefined;
        this.resume();
    }

    completeGoal(id: string) {
        if (this.pendingGoals.has(id)) {
            this.pendingGoals.get(id)!();
        }
    }
}