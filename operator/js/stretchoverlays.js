// Camera Position Information
import {OverlayTHREE, THREEObject} from "./overlay.js";

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
