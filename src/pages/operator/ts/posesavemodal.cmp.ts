import { BaseComponent } from "../../../shared/base.cmp";
import { Modal } from "bootstrap";
import { Pose } from "../../../shared/util";

const template = `
<link href="/shared/bootstrap.min.css" rel="stylesheet">
<div class="modal fade" tabIndex="-1" role="dialog" aria-labelledby="posesTitle"
                      aria-hidden="true" data-ref="modal-container">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <form role="form" id="addPoseForm" class="needs-validation modal-content" noValidate>
            <div class="modal-header">
                <h5 class="modal-title" id="posesModalTitle">Add pose</h5>
                 <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-group mb-2">
                    <label for="poseName">Pose name</label>
                    <input type="text" class="form-control" id="poseName"
                           placeholder="Enter name" required>
                        <div class="invalid-feedback">
                            Please enter a name for this pose
                        </div>
                </div>
                <div class="form-group mb-2">
                <label for="poseDescription">Pose description</label>
                    <textarea type="text" class="form-control" id="poseDescription"
                           placeholder="Enter a description, if you want"></textarea>
</div>
                <label>Sections to save</label>
                <fieldset>
                    <div class="form-check">
                        <input type="checkbox" class="pose-part form-check-input"
                               value="head" id="partHead" required> 
                               <label class="form-check-label" for="partHead">Head</label> 
                    </div>
                    <div class="form-check">
                        <input type="checkbox" class="pose-part form-check-input"
                                value="gripper" id="partGripper" required>
                                <label class="form-check-label" for="partGripper">Gripper</label>
                    </div>
                    <div class="form-check">
                        <input type="checkbox" class="pose-part form-check-input"
                               value="arm" id="partArm" required> 
                               <label class="form-check-label" for="partArm">Arm</label>
                        <div class="invalid-feedback">
                            Please select at least one section to save
                        </div>
                    </div>
                </fieldset>
            </div>
            <div class="modal-footer">
               <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
               <button type="submit" class="btn btn-primary">Save Pose</button>
            </div>
        </form>
    </div>
</div>`

export class PoseSaveModal extends BaseComponent {
    modalContainer?: Element
    modal: Modal

    constructor() {
        super(template);
        this.modalContainer = this.refs.get("modal-container")
        this.modal = new Modal(this.refs.get('modal-container'), {})
        let requiredCheckboxes = this.shadowRoot.querySelectorAll(".pose-part")
        requiredCheckboxes.forEach(
            checkbox => {
                checkbox.onchange = () => {
                    // Bootstrap will pull the modal out of the shadowroot when it's shown. Query container reference
                    if (this.modalContainer.querySelectorAll(".pose-part:checked").length > 0) {
                        requiredCheckboxes.forEach(checkbox => checkbox.required = null)
                    } else {
                        requiredCheckboxes.forEach(checkbox => checkbox.required = "true")
                    }
                };
            }
        )
        const form = this.shadowRoot.querySelector("form")
        form.onsubmit = (event) => {
            event.preventDefault();
            form.classList.add('was-validated');
            // FIXME: Check that pose name doesn't already exist
            // FIXME: Add reasonable limits on pose name character set and length
            if (form.checkValidity() === false) {
                event.stopPropagation();
            } else {
                this.dispatchEvent(new CustomEvent("posecreated", {
                    bubbles: true,
                    composed: true,
                    detail: this.currentState()
                }))
                this.modal.toggle()
                this.reset()
            }

        }
    }

    reset() {
        let form = this.modalContainer.querySelector("form")
        form.classList.remove("was-validated")
        form.reset()
    }

    currentState() {
        const checkedParts = this.modalContainer.querySelectorAll(".pose-part:checked")
        const partsToKeep = new Set(Array(...checkedParts).map(checkbox => checkbox.value))

        let pose: Pose = {};

        if (partsToKeep.has("head")) {
            pose.joint_head_tilt = this.pose.joint_head_tilt;
            pose.joint_head_pan = this.pose.joint_head_pan;
        }

        if (partsToKeep.has("gripper")) {
            pose.joint_gripper_finger_left = this.pose.joint_gripper_finger_left
            pose.joint_wrist_yaw = this.pose.joint_wrist_yaw;
        }

        if (partsToKeep.has("arm")) {
            pose.wrist_extension = this.pose.wrist_extension;
            pose.joint_lift = this.pose.joint_lift;
        }

        return {
            name: this.modalContainer.querySelector("#poseName").value,
            description: this.modalContainer.querySelector("#poseDescription").value,
            jointState: pose
        }
    }
}
