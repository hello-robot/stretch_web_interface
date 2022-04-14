// Camera Position Information
import {makeRectangle, makeSquare, OverlaySVG, OverlayTHREE, rectToPoly, THREEObject} from "./overlay.js";

const global_rotation_point = new THREE.Vector3(
    -0.001328,
    0,
    -0.053331
);

const global_reference_point = new THREE.Vector3(
    -0.001328,
    0.027765,
    -0.053331
);

const global_target_point = new THREE.Vector3(
    0.037582,
    -0.002706,
    0.019540000000000113
).add(global_reference_point);

let reference_to_rotation_offset = global_rotation_point.clone().sub(global_reference_point);
let rotation_to_target_offset = global_target_point.clone().sub(global_rotation_point);

export class ReachOverlay extends OverlayTHREE {

    constructor(camera) {
        super(camera);
        let reachCircle = new THREEObject(
            'reach_visualization_circle',
            new THREE.CircleGeometry(0.52, 32), // The arm has a 52 centimeter reach (source: https://hello-robot.com/product#:~:text=range%20of%20motion%3A%2052cm)
            new THREE.MeshBasicMaterial({color: 'rgb(246, 179, 107)', transparent: true, opacity: 0.25}),
        )
        this.addItem(reachCircle);
        let outlineEffect = new POSTPROCESSING.OutlineEffect(
            this.scene,
            this.camera,
            {visibleEdgeColor: 0xff9900});
        let outlineEffectPass = new POSTPROCESSING.EffectPass(
            this.camera,
            outlineEffect
        );
        outlineEffectPass.renderToScreen = true;
        outlineEffect.selectObject(reachCircle.mesh);
        this.composer.addPass(outlineEffectPass);
    }

    updateTransform(transform) {
        // Update the rotation and translation of the THREE.js camera to match the physical one
        let q_ros_space = new THREE.Quaternion(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);

        let order = 'XYZ'
        let e = new THREE.Euler(0, 0, 0, order);
        e.setFromQuaternion(q_ros_space, order);

        let q_inverse = q_ros_space.clone().invert();

        let reference_point = new THREE.Vector3(transform.translation.x, transform.translation.y, transform.translation.z);
        // z in global space is y in ros space
        let rotated_reference_to_rotation_offset = reference_to_rotation_offset.clone().applyEuler(new THREE.Euler(0, -e.z, e.y, 'XZY'));

        // TODO: Shouldn't this always be static, meaning that the previous math is unnecessary?
        let rotation_point = reference_point.clone().add(rotated_reference_to_rotation_offset);

        let rotated_rotation_offset_to_target_offset = rotation_to_target_offset.clone().applyEuler(new THREE.Euler(0, -e.z, e.y, 'XZY'));

        let target_point = rotation_point.clone().add(rotated_rotation_offset_to_target_offset);

        //threeManager.camera.position.copy(target_point);
        this.camera.position.copy(rosPostoTHREE(transform.translation));

        let e_three_space = rosEulerToTHREE(e, 'YZX');
        this.camera.rotation.copy(e_three_space);
    }
}

export class GripperOverlay extends OverlaySVG {
    constructor(aspectRatio) {
        super(aspectRatio);
        let w = 100 * aspectRatio
        let h = 100
        let wrist_region_width = w / 5.0;
        let lift_region_height = h / 5.0;

        let fingertip_width = w / 5.0;
        let fingertip_height = h / 5.0;

        let fingertipRect = makeRectangle((w / 2.0) - (fingertip_width / 2.0),
            (h / 2.0) - (fingertip_height / 2.0),
            fingertip_width, fingertip_height);

        let liftUpRect = makeRectangle(0, 0,
            w, lift_region_height);
        let liftDownRect = makeRectangle(0, h - lift_region_height,
            w, lift_region_height);

        let wristInRect = makeRectangle(0, lift_region_height,
            wrist_region_width, h - (2.0 * lift_region_height));
        let wristOutRect = makeRectangle(w - wrist_region_width, lift_region_height,
            wrist_region_width, h - (2.0 * lift_region_height));

        this.createRegion("gripperClose", {
            label: 'close hand',
            poly: rectToPoly(fingertipRect),
            iconImage: icon('gripper_close')
        });
        let regionPoly = [wristInRect.ur, wristOutRect.ul, wristOutRect.ll, fingertipRect.lr,
            fingertipRect.ur, fingertipRect.ul, fingertipRect.ll, fingertipRect.lr,
            wristOutRect.ll, wristInRect.lr];
        this.createRegion("gripperOpen", {
            label: 'open hand',
            poly: regionPoly,
            iconImage: icon('gripper_open'),
            iconPosition: {x: 70, y: 50}
        });
        this.createRegion("joint_wrist_yaw_pos", {
            label: 'turn wrist in',
            poly: rectToPoly(wristInRect),
            iconImage: icon('turn_left')
        });
        this.createRegion("joint_wrist_yaw_neg", {
            label: 'turn wrist out',
            poly: rectToPoly(wristOutRect),
            iconImage: icon('turn_right')
        });
        this.createRegion("joint_lift_pos", {
            label: 'lift arm up',
            poly: rectToPoly(liftUpRect),
            iconImage: icon('arrow_up'),
        });
        this.createRegion("joint_lift_neg", {
            label: 'lower arm down',
            poly: rectToPoly(liftDownRect),
            iconImage: icon('arrow_down'),
        });
    }
}

export class OverheadNavigationOverlay extends OverlaySVG {
    constructor(aspectRatio) {
        super(aspectRatio);
        let w = 100 * aspectRatio
        let h = 100

        let bgRect = makeRectangle(0, 0, w, h);
        let arm_region_width = w / 6.0;
        let navRect = makeRectangle(arm_region_width, 0,
            w - 2.0 * arm_region_width, h);
        let mobile_base_width = w / 10.0;
        let mobile_base_height = h / 10.0;

        // small rectangle around the mobile base
        let baseRect = makeSquare((w / 2.0) - (mobile_base_width*1.25),
            (2.0 * h / 3.0) - (mobile_base_height*1.25),
            mobile_base_width*1.5);

        this.createRegion("doNothing", {label: 'do nothing', poly: rectToPoly(baseRect)});
        this.createRegion("translate_mobile_base_pos", {
            label: 'drive forward',
            poly: [bgRect.ul, bgRect.ur, baseRect.ur, baseRect.ul],
            iconImage: icon("arrow_up")
        });
        this.createRegion("translate_mobile_base_neg", {
            label: 'drive back',
            poly: [bgRect.ll, bgRect.lr, baseRect.lr, baseRect.ll],
            iconImage: icon("arrow_down")
        });
        this.createRegion("rotate_mobile_base_pos", {
            label: 'turn left',
            poly: [bgRect.ul, baseRect.ul, baseRect.ll, bgRect.ll],
            iconImage: icon("turn_left")
        });
        this.createRegion("rotate_mobile_base_neg", {
            label: 'turn right',
            poly: [bgRect.ur, baseRect.ur, baseRect.lr, bgRect.lr],
            iconImage: icon("turn_right")
        });
        // this.createRegion("wrist_extension_neg", {
        //     label: 'retract arm',
        //     poly: [bgRect.ul, navRect.ul, navRect.ll, bgRect.ll],
        //     iconImage: icon("arrow_left")
        // });
        // this.createRegion("wrist_extension_pos", {
        //     label: 'extend arm',
        //     poly: [navRect.ur, bgRect.ur, bgRect.lr, navRect.lr],
        //     iconImage: icon("arrow_right")
        // });

    }
}

export class OverheadManipulationOverlay extends OverlaySVG {
    constructor(aspectRatio) {
        super(aspectRatio);
        let w = 100 * aspectRatio
        let h = 100

        let turn_region_width = w / 5.0;
        let arm_region_height = h / 3.0;

        let turnLeftRect = makeRectangle(0, 0, turn_region_width, h);
        let turnRightRect = makeRectangle(w - turn_region_width, 0, turn_region_width, h);

        let armExtendRect = makeRectangle(turn_region_width, 0,
            w - (2.0 * turn_region_width), arm_region_height);
        let armRetractRect = makeRectangle(turn_region_width, h - arm_region_height,
            w - (2.0 * turn_region_width), arm_region_height);

        let base_region_width = (w / 2.0) - turn_region_width;

        let baseForwardRect = makeRectangle(turn_region_width, arm_region_height,
            base_region_width, h - (2.0 * arm_region_height));
        let baseBackwardRect = makeRectangle(turn_region_width + base_region_width, arm_region_height,
            base_region_width, h - (2.0 * arm_region_height));

        this.createRegion("joint_wrist_yaw_pos", {
            label: 'turn wrist in',
            poly: rectToPoly(turnLeftRect),
            iconImage: icon('turn_left')
        });
        this.createRegion("joint_wrist_yaw_neg", {
            label: 'turn wrist out',
            poly: rectToPoly(turnRightRect),
            iconImage: icon('turn_right')
        });
        this.createRegion("translate_mobile_base_pos", {
            label: 'drive base forward',
            poly: rectToPoly(baseForwardRect),
            iconImage: icon('arrow_left')
        });
        this.createRegion("translate_mobile_base_neg", {
            label: 'drive base backward',
            poly: rectToPoly(baseBackwardRect),
            iconImage: icon('arrow_right')
        });
        this.createRegion("wrist_extension_neg", {
            label: 'retract arm',
            poly: rectToPoly(armRetractRect),
            iconImage: icon('arrow_down_left')
        });
        this.createRegion("wrist_extension_pos", {
            label: 'extend arm',
            poly: rectToPoly(armExtendRect),
            iconImage: icon('arrow_up_right')
        });
    }
}

export class OverheadClickNavigationOverlay extends OverlaySVG {
    w 
    h 

    constructor(aspectRatio) {
        super(aspectRatio);
        let w = 100 * aspectRatio
        let h = 100
        let cornerRectSize = 20
        let mobile_base_width = w / 10.0;
        let mobile_base_height = h / 10.0;

        let baseRect = makeSquare(0, 0, w, h);
        this.w = w;
        this.h = h;
        this.createRegion("clickNavigate", {label: 'clickNavigate', poly: rectToPoly(baseRect)});
    }

    normalizeAngle(angle) {
        return Math.atan2(Math.sin(angle), Math.cos(angle))
    }

    svgArcString(x1, y1, r, largeArcFlag, sweepFlag, x2, y2) {
        return [
            "M", x1, y1, 
            "A", r, r, 0, largeArcFlag, sweepFlag, x2, y2
        ].join(" "); 
    }

    drawRotateIcon() {
        this.createTraj({iconImage: icon('rotate')});
    }

    drawArc(x, y, startHeading, goalHeading, circle=true) {
        let largeArcFlag = goalHeading - startHeading <= Math.PI ? "0" : "1";
        let sweepFlag = goalHeading < Math.PI/2 ? "0" : "1";
        let sign = goalHeading < Math.PI/2 ? 1 : -1;
        let diffHeading = Math.abs(goalHeading - startHeading)
        // If user clicked behind the robot, offset trajectory
        let y_offset = y > 80 ? 10 : 0

        // Left wheel traj
        let end_angle = this.normalizeAngle(goalHeading + (Math.PI/2 - sign*diffHeading))
        let x1 = 39
        let y1 = 70 + y_offset
        let x2 = y > 80 ? x1 : x+6.5*Math.cos(end_angle);
        let y2 = y > 80 ? 95 : y+6.5*Math.sin(end_angle);
        let q = Math.sqrt(Math.pow(Math.abs(x1-x2), 2) + Math.pow(Math.abs(y1-y2), 2))
        let r = (q/2)/(1 - Math.cos(diffHeading))
        let leftTraj = this.svgArcString(x1, y1, r, largeArcFlag, sweepFlag, x2, y2);

        // Center traj
        end_angle = this.normalizeAngle(startHeading + diffHeading/2);
        x1 = 45
        y1 = 70 + y_offset
        x2 = y > 80 ? x1 : x+Math.cos(end_angle);
        y2 = y > 80 ? 95 : y+Math.sin(end_angle);
        q = Math.sqrt(Math.pow(Math.abs(x1-x2), 2) + Math.pow(Math.abs(y1-y2), 2))
        r = (q/2)/(1 - Math.cos(diffHeading))
        let centerTraj = this.svgArcString(x1, y1, r, largeArcFlag, sweepFlag, x2, y2);  

        // Right wheel traj
        end_angle = this.normalizeAngle(goalHeading - (Math.PI/2 + sign*diffHeading))
        x1 = 51
        y1 = 70 + y_offset
        x2 = y > 80 ? x1 : x+6.5*Math.cos(end_angle);
        y2 = y > 80 ? 95 : y+6.5*Math.sin(end_angle);
        q = Math.sqrt(Math.pow(Math.abs(x1-x2), 2) + Math.pow(Math.abs(y1-y2), 2))
        r = (q/2)/(1 - Math.cos(diffHeading))
        let rightTraj = this.svgArcString(x1, y1, r, largeArcFlag, sweepFlag, x2, y2);

        // Circle center
        let center = circle ? {x: x, y: y} : null;
        let icon = null;
        this.createTraj({icon, leftTraj, centerTraj, rightTraj, center});     
    }
}

export class PanTiltNavigationOverlay extends OverlaySVG {
    constructor(aspectRatio) {
        super(aspectRatio);
        let w = 100 * aspectRatio
        let h = 100
        let cornerRectSize = 20

        // Big rectangle at the borders of the video
        let bgRect = makeRectangle(0, 0, w, h);
        let smRect = makeSquare((w / 2.0) - (w / 20.0), (h * (3.0 / 4.0)) - (h / 20.0), w / 10.0, h / 10.0);
        let leftRect = makeSquare(0, h - cornerRectSize, cornerRectSize);
        let rightRect = makeSquare(w - cornerRectSize, h - cornerRectSize, cornerRectSize);

        this.createRegion("doNothing", {label: 'do nothing', poly: rectToPoly(smRect)});
        this.createRegion("translate_mobile_base_pos", {
            label: 'drive forward',
            poly: [bgRect.ul, bgRect.ur, smRect.ur, smRect.ul],
            iconImage: icon("arrow_up")
        });
        this.createRegion("translate_mobile_base_neg", {
            label: 'drive backward',
            // poly: [leftRect.ur, leftRect.lr, rightRect.ll, rightRect.ul, smRect.lr, smRect.ll],
            poly: [leftRect.ul, leftRect.ll, rightRect.lr, rightRect.ur, smRect.lr, smRect.ll],
            iconImage: icon("arrow_down")
        });
        this.createRegion("rotate_mobile_base_pos", {
            label: 'turn left',
            poly: [bgRect.ul, smRect.ul, smRect.ll, leftRect.ur, leftRect.ul],
            iconImage: icon("turn_left")
        });
        this.createRegion("rotate_mobile_base_neg", {
            label: 'turn right',
            poly: [bgRect.ur, smRect.ur, smRect.lr, rightRect.ul, rightRect.ur],
            iconImage: icon("turn_right")
        });
        // this.createRegion("turnCCW", {
        //     label: 'turn 90 degrees CCW',
        //     poly: rectToPoly(leftRect),
        //     iconImage: icon("rotate_ccw")
        // });
        // this.createRegion("turnCW", {
        //     label: 'turn 90 degrees CW',
        //     poly: rectToPoly(rightRect),
        //     iconImage: icon("rotate_cw")
        // });

    }
}

export class PanTiltManipulationOverlay extends OverlaySVG {
    constructor(aspectRatio) {
        super(aspectRatio);
        let w = 100 * aspectRatio
        let h = 100

        let bgRect = makeRectangle(0, h / 6.0, w, h - 2.0 * h / 6.0);
        // Small rectangle at the top of the middle of the video
        let tpRect = makeRectangle(w * (3.0 / 10.0), 2.0 * h / 6.0, w * (4.0 / 10.0), h / 6.0);
        // small rectangle at the bottom of the middle of the video
        let btRect = makeRectangle(w * (3.0 / 10.0), 3.0 * h / 6.0, w * (4.0 / 10.0), h / 6.0);

        let leftRect = makeRectangle(0, 0, w / 2.0, h / 6.0);
        let rightRect = makeRectangle(w / 2.0, 0, w / 2.0, h / 6.0);

        let leftRect2 = makeRectangle(0, 5.0 * h / 6.0, w / 2.0, h / 6.0);
        let rightRect2 = makeRectangle(w / 2.0, 5.0 * h / 6.0, w / 2.0, h / 6.0);

        this.createRegion("joint_lift_pos", {
            label: 'lift arm',
            poly: rectToPoly(tpRect),
            iconImage: icon('arrow_up')
        })
        this.createRegion("joint_lift_neg", {
            label: 'lower arm',
            poly: rectToPoly(btRect),
            iconImage: icon('arrow_down')
        });
        this.createRegion("wrist_extension_pos", {
            label: 'extend arm',
            poly: [bgRect.ul, bgRect.ur, tpRect.ur, tpRect.ul],
            iconImage: icon('arrow_up_right')
        });
        this.createRegion("wrist_extension_neg", {
            label: 'retract arm',
            poly: [bgRect.ll, bgRect.lr, btRect.lr, btRect.ll],
            iconImage: icon('arrow_down_left')
        });
        this.createRegion("translate_mobile_base_pos", {
            label: 'drive forward',
            poly: [bgRect.ul, tpRect.ul, btRect.ll, bgRect.ll],
            iconImage: icon('arrow_left')
        });
        this.createRegion("translate_mobile_base_neg", {
            label: 'drive backward',
            poly: [bgRect.ur, tpRect.ur, btRect.lr, bgRect.lr],
            iconImage: icon('arrow_right')
        });
        this.createRegion("joint_wrist_yaw_pos", {
            label: 'turn hand in',
            poly: rectToPoly(leftRect),
            iconImage: icon('turn_left')
        });
        this.createRegion("joint_wrist_yaw_neg", {
            label: 'turn hand out',
            poly: rectToPoly(rightRect),
            iconImage: icon('turn_right')
        });
        this.createRegion("gripperClose", {
            label: 'close hand',
            poly: rectToPoly(leftRect2),
            iconImage: '/operator/images/gripper_close.svg'
        });
        this.createRegion("gripperOpen", {
            label: 'open hand',
            poly: rectToPoly(rightRect2),
            iconImage: icon('gripper_open')
        });
    }

    updateLiftJointLimits(value) {
        let armUpRegion = this.regions.get("joint_lift_pos").path
        let armDownRegion = this.regions.get("joint_lift_neg").path
        this.updateJointLimits(value, armDownRegion, armUpRegion)
    }

    updateExtensionJointLimits(value) {
        let armExtendRegion = this.regions.get("wrist_extension_pos").path
        let armRetractRegion = this.regions.get("wrist_extension_neg").path
        this.updateJointLimits(value, armRetractRegion, armExtendRegion)
    }

    updateWristJointLimits(value) {
        let yawInRegion = this.regions.get("joint_wrist_yaw_pos").path
        let yawOutRegion = this.regions.get("joint_wrist_yaw_neg").path
        this.updateJointLimits(value, yawOutRegion, yawInRegion)
    }

    updateJointLimits(value, region1, region2) {
        let redRegion;
        let nothingRegion;
        if (!value[0]) {
            redRegion = region1
            nothingRegion = region2
        } else if (!value[1]) {
            redRegion = region2
            nothingRegion = region1
        }

        if (redRegion) {
            redRegion.setAttribute('fill', 'red');
            redRegion.setAttribute('fill-opacity', 0.3);
        } 

        if (nothingRegion) { 
            nothingRegion.setAttribute('fill', 'white');
            nothingRegion.setAttribute('fill-opacity', 0.0);
        }

        if (!redRegion && !nothingRegion) {
            region1.setAttribute('fill', 'white');
            region1.setAttribute('fill-opacity', 0.0);
            region2.setAttribute('fill', 'white');
            region2.setAttribute('fill-opacity', 0.0);
        }
    }

    updateLiftEffort(value) {
        // adjust for the effort needed to hold the arm in place
        // against gravity
        let adjusted_value = value - 53.88;
        let armUpRegion1 = this.regions.get("joint_lift_pos").path
        let armDownRegion1 = this.regions.get("joint_lift_neg").path
        let redRegion1;
        let nothingRegion1;

        if (adjusted_value > 0.0) {
            redRegion1 = armUpRegion1;
            nothingRegion1 = armDownRegion1;
        } else {
            redRegion1 = armDownRegion1;
            nothingRegion1 = armUpRegion1;
        }
        // make the torque positive and multiply it by a factor to
        // make sure the video will always be visible even with
        let redOpacity = Math.abs(adjusted_value) * 0.005;

        if (redRegion1) {
            redRegion1.setAttribute('fill', 'red');
            redRegion1.setAttribute('fill-opacity', redOpacity);
        }

        if (nothingRegion1)
            nothingRegion1.setAttribute('fill-opacity', 0.0);
    }

    updateExtensionEffort(value) {
        let redRegion1;
        let nothingRegion1;

        let armExtendRegion1 = this.regions.get("wrist_extension_pos").path
        let armRetractRegion1 = this.regions.get("wrist_extension_neg").path

        if (value > 0.0) {
            redRegion1 = armExtendRegion1;
            nothingRegion1 = armRetractRegion1;
        } else {
            redRegion1 = armRetractRegion1;
            nothingRegion1 = armExtendRegion1;
        }

        // make the torque positive and multiply it by a factor to
        // make sure the video will always be visible even with

        let redOpacity = Math.abs(value) * 0.005;

        if (redRegion1) {
            redRegion1.setAttribute('fill', 'red');
            redRegion1.setAttribute('fill-opacity', redOpacity);
        }

        if (nothingRegion1)
            nothingRegion1.setAttribute('fill-opacity', 0.0);
    }

    updateGripperEffort(value) {
        let handCloseRegion = this.regions.get("gripperClose").path
        let handOpenRegion = this.regions.get("gripperOpen").path
        if (handCloseRegion && handOpenRegion) {
            let redRegion;
            let nothingRegion;
            if (value > 0.0) {
                redRegion = handOpenRegion;
                nothingRegion = handCloseRegion;
            } else {
                redRegion = handCloseRegion;
                nothingRegion = handOpenRegion;
            }

            // make the torque positive and multiply it by a factor to
            // make sure the video will 	always be visible even with

            let redOpacity = Math.abs(value) * 0.015;
            if (redRegion) {
                redRegion.setAttribute('fill', 'red');
                redRegion.setAttribute('fill-opacity', redOpacity);
            }
            if (nothingRegion)
                nothingRegion.setAttribute('fill-opacity', 0.0);
        }
    }

    updateWristEffort(value) {
        let yawInRegion = this.regions.get("joint_wrist_yaw_pos").path
        let yawOutRegion = this.regions.get("joint_wrist_yaw_neg").path
        if (yawInRegion && yawOutRegion) {
            let redRegion;
            let nothingRegion;
            if (value > 0.0) {
                redRegion = yawOutRegion;
                nothingRegion = yawInRegion;
            } else {
                redRegion = yawInRegion;
                nothingRegion = yawOutRegion;
            }
            redRegion.setAttribute('fill', 'red');
            // make the torque positive and multiply it by a factor to
            // make sure the video will always be visible even with
            let redOpacity = Math.abs(value) * 0.015;
            redRegion.setAttribute('fill-opacity', redOpacity);
            nothingRegion.setAttribute('fill-opacity', 0.0);
        }

    }
}

function icon(name) {
    return `/operator/images/${name}.svg`
}

function rosPostoTHREE(p) {
    return new THREE.Vector3(p.x, -p.y, p.z);
}

function rosEulerToTHREE(e, order) {
    return new THREE.Euler(
        e.z + (Math.PI / 2),
        0,
        e.y + (Math.PI / 2),
        order
    )
}
