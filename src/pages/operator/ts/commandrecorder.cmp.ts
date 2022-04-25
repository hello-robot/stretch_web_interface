import { BaseComponent, Component } from "shared/base.cmp"
import { Model } from "./model/model"
import { cmd } from "shared/commands"

const template = `
<link href="/bootstrap.css" rel="stylesheet">
<div id="container" class="btn-group mx-2" role="group">
      <button
    type="button"
    class="btn btn-primary btn-sm"
    data-ref="start-stop-recording">
Record
</button>
      <button
    type="button"
    class="btn btn-secondary btn-sm"
    data-ref="play" disabled>
Play 
</button>
<button
    type="button"
    class="btn btn-secondary  btn-sm"
    data-ref="download">
Download
</button>
    </div>
`

@Component("command-recorder")
export class CommandRecorder extends BaseComponent {
    _recording = false
    model?: Model
    // TODO (kavidey): remove these variables if they are unused
    recordingBuffer
    startTimestamp

    constructor() {
        super(template)

        this.refs.get("start-stop-recording")!.onclick = () => {
            this.recording = !this.recording
        }
        // TODO (kavidey): make a way to download a specific session instead of the whole thing?
        this.refs.get("download")!.onclick = async () => {
            if (this.model) {
                let allSessionData: {[key: string]: cmd[]} = {};
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
    }

    get recording() {
        return this._recording
    }

    initializeLogging(model: Model) {
        this.model = model;
    }

    logCommand(event: CustomEvent<cmd>) {
        this.model?.logComand(event.detail);
    };

    set recording(value: boolean) {
        if (value === this._recording) return;
        this._recording = value
        if (value) {
            this.refs.get("start-stop-recording")!.innerText = "Stop";
            this.model?.startSession()
            window.addEventListener("commandsent", this.logCommand.bind(this));
        } else {
            window.removeEventListener('commandsent', this.logCommand.bind(this));
            this.model?.stopSession();
            this.refs.get("start-stop-recording")!.innerText = "Record";
        }
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(value) {
        if (value) {
            this.setAttribute("disabled", "")
            this.refs.get("start-stop-recording")!.disabled = "true"
        } else {
            if (this.hasAttribute("disabled")) {
                this.removeAttribute("disabled")
            }
            this.refs.get("start-stop-recording")!.disabled = null
            // Are we holding a recording
            if (this.recordingBuffer) {
                this.refs.get("play")!.disabled = null
                this.refs.get("download")!.disabled = null
            }
        }
    }

}
