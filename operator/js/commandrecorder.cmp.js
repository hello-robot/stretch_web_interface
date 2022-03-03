import {BaseComponent, Component} from "../../shared/base.cmp.js";

const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
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

export class CommandRecorder extends BaseComponent {
    _recording = false
    recordingBuffer
    startTimestamp

    constructor() {
        super(template)

        this.refs.get("start-stop-recording").onclick = () => {
            this.recording = !this.recording
        }
        this.refs.get("download").onclick = () => {
            var element = document.createElement('a');
            var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(JSON.parse(localStorage.getItem('commands')), null, 4));
            element.setAttribute('href','data:' + data);

            // TODO [vinitha]: find better way for make unique file name
            var d = new Date();
            var pst_date = d.toLocaleString("en-US", {
                timeZone: "America/Los_Angeles"
            })
            element.setAttribute('download','data-' + pst_date + '.json');
            document.body.appendChild(element);
            element.click()
            document.body.removeChild(element);
            localStorage.removeItem('commands');
        }
        if (this.disabled) {
            this.shadowRoot.querySelectorAll(".btn").forEach(button => button.disabled = "true")
        }
    }

    get recording() {
        return this._recording
    }

    logCommand = (event) => { 
        var commandData = localStorage.getItem('commands')
        var commands = commandData ? JSON.parse(commandData) : []
        commands.push(event.detail)
        localStorage.setItem('commands', JSON.stringify(commands));
    };

    set recording(value) {
        if (value === this._recording) return;
        this._recording = value
        if (value) {
            this.refs.get("start-stop-recording").innerText = "Stop"
            window.addEventListener("commandsent", this.logCommand);
        } else {
            window.removeEventListener('commandsent', this.logCommand);
            this.refs.get("start-stop-recording").innerText = "Record"
        }
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(value) {
        if (value) {
            this.setAttribute("disabled", "")
            this.refs.get("start-stop-recording").disabled = "true"
        } else {
            if (this.hasAttribute("disabled")) {
                this.removeAttribute("disabled")
            }
            this.refs.get("start-stop-recording").disabled = null
            // Are we holding a recording
            if (this.recordingBuffer) {
                this.refs.get("play").disabled = null
                this.refs.get("download").disabled = null
            }
        }
    }

}

Component("command-recorder", CommandRecorder)
