import {BaseComponent, bootstrapCSS, Component} from "shared/base.cmp"
import { NamedPose } from "shared/util"

const template = `
<style>${bootstrapCSS}</style>
<div class="container-fluid d-flex flex-row px-0 gap-2">

<button
    type="button"
    class="btn btn-primary btn-sm"
    data-ref="save-pose-button">
Save pose
</button>

<select data-ref="delete-pose" class="form-select form-select-sm w-auto" aria-label="Select pose to delete" disabled>
    <option selected>Delete pose</option>
</select>

<div data-ref="custom-poses" class="d-flex flex-wrap gap-2">
<template data-ref="pose-button-template">
    <button type="button" class="btn btn-sm btn-secondary"></button>
</template>
</div>
</div>
<pose-save-modal data-ref="pose-create-modal"></pose-save-modal>
`

@Component("pose-library")
export class PoseLibrary extends BaseComponent {
    creationModal?: Element
    saveButton?: HTMLButtonElement
    deleteSelect?: HTMLSelectElement

    constructor() {
        super(template)
        this.creationModal = this.refs.get("pose-create-modal")
        this.creationModal?.addEventListener("posecreated", event => this.addPose(event.detail))
        this.saveButton = this.refs.get("save-pose-button")
        this.deleteSelect = this.refs.get("delete-pose")
        this.saveButton.onclick = async () => {
            this.getCurrentPose().then(pose => this.creationModal.pose = pose)
            this.creationModal.modal.toggle()
        }
        this.deleteSelect.onchange = () => {
            let nameToDelete = this.deleteSelect.value
            this.removePose(nameToDelete)
        }

        this.refs.get("custom-poses")?.addEventListener("click", event => {
            let target = event.target!;
            if (target?.type !== "button") return;
            this.dispatchEvent(new CustomEvent("poseclicked", {
                bubbles: true,
                composed: true,
                detail: {
                    name: target.dataset.poseName,
                    description: target.dataset.description,
                    jointState: JSON.parse(target.dataset.pose)
                }
            }))
        })

        if (this.disabled) {
            this.deleteSelect.disabled = true
            this.shadowRoot?.querySelectorAll(".btn").forEach(button => button.disabled = "true")
        }
    }

    addPose(pose: NamedPose) {
        let newButton = this.refs.get("pose-button-template")!.content.querySelector("*").cloneNode(true)
        newButton.innerText = pose.name
        newButton.title = pose.description
        newButton.dataset.poseName = pose.name
        newButton.dataset.pose = JSON.stringify(pose.jointState)
        newButton.dataset.description = pose.description
        if (this.disabled) {
            newButton.disabled = "true"
        }
        this.refs.get("custom-poses")!.appendChild(newButton)

        let newOption = document.createElement("option")
        newOption.value = pose.name
        newOption.innerText = pose.name
        this.deleteSelect?.appendChild(newOption)
        if (!this.disabled) {
            this.deleteSelect!.disabled = false
        }
    }

    removePose(name: string) {
        this.shadowRoot?.querySelector(`option[value='${name}']`)?.remove()
        this.shadowRoot?.querySelector(`button[data-pose-name='${name}']`)?.remove()
        if (this.deleteSelect?.options.length === 1) {
            this.deleteSelect.disabled = true
        }
        this.dispatchEvent(new CustomEvent("posedeleted", { bubbles: true, composed: true, detail: name }))
    }

    clearPoses() {
        this.refs.get("custom-poses")!.textContent = '';
        this.deleteSelect!.replaceChildren(this.deleteSelect!.children[0]);
        this.deleteSelect!.disabled = false;
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(value) {
        if (value) {
            this.setAttribute("disabled", "")
            this.getAllDisableable()?.forEach(element => element.disabled = "true")
        } else {
            if (this.hasAttribute("disabled")) {
                this.removeAttribute("disabled")
            }
            this.getAllDisableable()?.forEach(element => element.disabled = null)
        }
        // If we can't delete anything, leave this disabled
        if (this.deleteSelect?.options.length === 1) {
            this.deleteSelect.disabled = true
        }
    }

    getAllDisableable() {
        return this.shadowRoot?.querySelectorAll(".btn, select")
    }

}
