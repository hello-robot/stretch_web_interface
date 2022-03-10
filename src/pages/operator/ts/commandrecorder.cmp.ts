import { BaseComponent } from "../../../shared/base.cmp"

const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div class="btn-group mx-2" role="group">
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
    data-ref="download" disabled>
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

        }
        if (this.disabled) {
            this.shadowRoot?.querySelectorAll(".btn").forEach(button => button.disabled = "true")
        }
    }

    get recording() {
        return this._recording
    }

    set recording(value) {
        if (value === this._recording) return;
        this._recording = value
        if (value) {
            this.refs.get("start-stop-recording").innerText = "Stop"
        } else {
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
