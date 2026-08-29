/*
 * WebBlox Player Camera
 * Stage 3A
 *
 * Third person camera
 * Mouse look
 * Mouse wheel zoom
 * Character following
 */

(() => {
    "use strict";

    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};

    const CameraSystem = {};

    let camera = null;
    let canvas = null;

    let enabled = false;

    let yaw = 0;
    let pitch = -15;

    let distance = 12;

    const minDistance = 1.2;
    const maxDistance = 30;

    let sensitivity = 0.25;

    let rotating = false;

    let lastX = 0;
    let lastY = 0;

    const forward = {
        x: 0,
        y: 0,
        z: -1
    };

    const right = {
        x: 1,
        y: 0,
        z: 0
    };

    function setup(options = {}) {
        camera =
            options.camera ||
            camera;

        canvas =
            options.canvas ||
            options.renderer?.domElement ||
            canvas;

        if (!camera || !canvas) {
            return false;
        }

        enable();

        updateVectors();

        return true;
    }

    function enable() {
        if (enabled) {
            return;
        }

        enabled = true;

        if (!canvas) {
            return;
        }

        canvas.addEventListener(
            "mousedown",
            onMouseDown
        );

        canvas.addEventListener(
            "mousemove",
            onMouseMove
        );

        window.addEventListener(
            "mouseup",
            onMouseUp
        );

        canvas.addEventListener(
            "wheel",
            onWheel,
            {
                passive: false
            }
        );

        canvas.addEventListener(
            "contextmenu",
            blockContextMenu
        );

        canvas.style.cursor =
            "default";
    }

    function disable() {
        if (!enabled) {
            return;
        }

        enabled = false;

        if (canvas) {
            canvas.removeEventListener(
                "mousedown",
                onMouseDown
            );

            canvas.removeEventListener(
                "mousemove",
                onMouseMove
            );

            canvas.removeEventListener(
                "wheel",
                onWheel
            );

            canvas.removeEventListener(
                "contextmenu",
                blockContextMenu
            );
        }

        window.removeEventListener(
            "mouseup",
            onMouseUp
        );

        rotating = false;
    }

    function blockContextMenu(event) {
        event.preventDefault();
    }

    function onMouseDown(event) {
        if (
            event.button !== 2 &&
            event.button !== 1
        ) {
            return;
        }

        event.preventDefault();

        rotating = true;

        lastX =
            event.clientX;

        lastY =
            event.clientY;

        if (canvas) {
            canvas.style.cursor =
                "grabbing";
        }
    }

    function onMouseMove(event) {
        if (!rotating) {
            return;
        }

        const dx =
            event.clientX -
            lastX;

        const dy =
            event.clientY -
            lastY;

        lastX =
            event.clientX;

        lastY =
            event.clientY;

        yaw -=
            dx *
            sensitivity;

        pitch -=
            dy *
            sensitivity;

        pitch =
            Math.max(
                -80,
                Math.min(
                    75,
                    pitch
                )
            );

        updateVectors();
    }

    function onMouseUp() {
        rotating = false;

        if (canvas) {
            canvas.style.cursor =
                "default";
        }
    }

    function onWheel(event) {
        event.preventDefault();

        distance +=
            event.deltaY * 0.01;

        distance =
            Math.max(
                minDistance,
                Math.min(
                    maxDistance,
                    distance
                )
            );
    }

    function updateVectors() {
        const yawRadians =
            yaw *
            Math.PI /
            180;

        forward.x =
            Math.sin(yawRadians);

        forward.y = 0;

        forward.z =
            -Math.cos(yawRadians);

        right.x =
            Math.cos(yawRadians);

        right.y = 0;

        right.z =
            Math.sin(yawRadians);
    }

    function update(delta) {
        if (
            !enabled ||
            !camera
        ) {
            return;
        }

        const character =
            PlayerSystem.character;

        if (!character) {
            return;
        }

        const target =
            character.position.clone();

        const height =
            character.userData.height ||
            5.4;

        target.y +=
            height * 0.58;

        const pitchRadians =
            pitch *
            Math.PI /
            180;

        const yawRadians =
            yaw *
            Math.PI /
            180;

        const horizontal =
            Math.cos(
                pitchRadians
            );

        const vertical =
            Math.sin(
                pitchRadians
            );

        const offsetX =
            Math.sin(
                yawRadians
            ) *
            horizontal *
            distance;

        const offsetZ =
            Math.cos(
                yawRadians
            ) *
            horizontal *
            distance;

        const offsetY =
            vertical *
            distance;

        const desiredX =
            target.x +
            offsetX;

        const desiredY =
            target.y -
            offsetY;

        const desiredZ =
            target.z +
            offsetZ;

        const smoothing =
            1 -
            Math.pow(
                0.001,
                delta
            );

        camera.position.x +=
            (
                desiredX -
                camera.position.x
            ) *
            smoothing;

        camera.position.y +=
            (
                desiredY -
                camera.position.y
            ) *
            smoothing;

        camera.position.z +=
            (
                desiredZ -
                camera.position.z
            ) *
            smoothing;

        camera.lookAt(
            target
        );

        PlayerSystem.camera =
            CameraSystem;
    }

    function setDistance(value) {
        distance =
            Math.max(
                minDistance,
                Math.min(
                    maxDistance,
                    Number(value) || 12
                )
            );
    }

    function getDistance() {
        return distance;
    }

    function getYaw() {
        return yaw;
    }

    function getPitch() {
        return pitch;
    }

    CameraSystem.setup =
        setup;

    CameraSystem.enable =
        enable;

    CameraSystem.disable =
        disable;

    CameraSystem.update =
        update;

    CameraSystem.setDistance =
        setDistance;

    CameraSystem.getDistance =
        getDistance;

    CameraSystem.getYaw =
        getYaw;

    CameraSystem.getPitch =
        getPitch;

    CameraSystem.forward =
        forward;

    CameraSystem.right =
        right;

    CameraSystem.isEnabled =
        () => enabled;

    PlayerSystem.cameraSystem =
        CameraSystem;

})();
