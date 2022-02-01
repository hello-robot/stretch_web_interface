import {BaseComponent, Component} from "../../shared/base.cmp.js";

const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<button
    type="button"
    class="btn btn-primary btn-sm mx-2"
    data-ref="record">
Start recording
</button>
<button
    type="button"
    class="btn btn-secondary  btn-sm"
    data-ref="download">
Download Recording
</button>
`

// FIXME: Listen and record command events
export class CommandRecorder extends BaseComponent {

    constructor() {
        super(template)

        this.refs.get("record").onclick = async () => {
            this.getCurrentPose().then(pose => this.creationModal.pose = pose)
            this.creationModal.modal.toggle()
        }
        this.refs.get("download").onclick = () => {

        }
        if (this.disabled) {
            this.shadowRoot.querySelectorAll(".btn").forEach(button => button.disabled = "true")
        }
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(value) {
        if (value) {
            this.setAttribute("disabled", "")
            this.shadowRoot.querySelectorAll(".btn").forEach(button => button.disabled = "true")
        } else {
            if (this.hasAttribute("disabled")) {
                this.removeAttribute("disabled")
            }
            this.shadowRoot.querySelectorAll(".btn").forEach(button => button.disabled = null)
        }
    }

}

Component("command-recorder", CommandRecorder)
