/*
 * WebBlox Player Controller
 * Stage 3A
 *
 * WASD
 * Space = Jump
 * Shift = Sprint
 * Camera-relative movement
 */

(() => {
    "use strict";

    const PlayerSystem =
        window.WebBloxPlayer =
            window.WebBloxPlayer || {};

    const Controller = {};

    const keys = new Set();

    let enabled = false;
    let jumpRequested = false;

    let walkSpeed = 16;
    let sprintSpeed = 26;

    function isTyping() {
        const element = document.activeElement;

        if (!element) {
            return false;
        }

        return (
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.tagName === "SELECT" ||
            element.isContentEditable
        );
    }

    function onKeyDown(event) {
        if (isTyping()) {
            return;
        }

        const key =
            event.key.toLowerCase();

        keys.add(key);

        if (
            key === " " ||
            key === "spacebar"
        ) {
            event.preventDefault();
            jumpRequested = true;
        }

        if (
            [
                "w",
                "a",
                "s",
                "d",
                "arrowup",
                "arrowdown",
                "arrowleft",
                "arrowright",
                " "
            ].includes(key)
        ) {
            event.preventDefault();
        }
    }

    function onKeyUp(event) {
        keys.delete(
            event.key.toLowerCase()
        );
    }

    function enable() {
        if (enabled) {
            return;
        }

        enabled = true;

        window.addEventListener(
            "keydown",
            onKeyDown,
            {
                passive: false
            }
        );

        window.addEventListener(
            "keyup",
            onKeyUp
        );

        window.addEventListener(
            "blur",
            clearKeys
        );
    }

    function disable() {
        if (!enabled) {
            return;
        }

        enabled = false;

        clearKeys();

        window.removeEventListener(
            "keydown",
            onKeyDown
        );

        window.removeEventListener(
            "keyup",
            onKeyUp
        );

        window.removeEventListener(
            "blur",
            clearKeys
        );
    }

    function clearKeys() {
        keys.clear();
        jumpRequested = false;
    }

    function getInput() {
        let forward = 0;
        let right = 0;

        if (
            keys.has("w") ||
            keys.has("arrowup")
        ) {
            forward += 1;
        }

        if (
            keys.has("s") ||
            keys.has("arrowdown")
        ) {
            forward -= 1;
        }

        if (
            keys.has("d") ||
            keys.has("arrowright")
        ) {
            right += 1;
        }

        if (
            keys.has("a") ||
            keys.has("arrowleft")
        ) {
            right -= 1;
        }

        const length =
            Math.hypot(
                forward,
                right
            );

        if (length > 0) {
            forward /= length;
            right /= length;
        }

        const sprint =
            keys.has("shift");

        const jump =
            jumpRequested;

        jumpRequested = false;

        return {
            forward,
            right,
            sprint,
            jump
        };
    }

    function update(delta) {
        if (!enabled) {
            return;
        }

        const character =
            PlayerSystem.character;

        if (!character) {
            return;
        }

        const runtime =
            character.userData.runtime;

        if (!runtime) {
            return;
        }

        const input =
            getInput();

        const camera =
            PlayerSystem.camera;

        let forwardX = 0;
        let forwardZ = -1;

        let rightX = 1;
        let rightZ = 0;

        if (camera) {
            forwardX =
                camera.forward.x;

            forwardZ =
                camera.forward.z;

            rightX =
                camera.right.x;

            rightZ =
                camera.right.z;
        }

        let moveX =
            forwardX *
                input.forward +
            rightX *
                input.right;

        let moveZ =
            forwardZ *
                input.forward +
            rightZ *
                input.right;

        const moveLength =
            Math.hypot(
                moveX,
                moveZ
            );

        if (moveLength > 0) {
            moveX /= moveLength;
            moveZ /= moveLength;
        }

        const speed =
            input.sprint
                ? sprintSpeed
                : walkSpeed;

        runtime.input = {
            x: moveX,
            z: moveZ,
            moving:
                moveLength > 0,
            sprint:
                input.sprint
        };

        runtime.moveSpeed =
            speed;

        if (input.jump) {
            if (
                runtime.grounded &&
                typeof PlayerSystem.jump ===
                    "function"
            ) {
                PlayerSystem.jump();
            }
        }

        if (
            typeof PlayerSystem.applyMovement ===
            "function"
        ) {
            PlayerSystem.applyMovement(
                moveX,
                moveZ,
                speed,
                delta
            );
        }
    }

    Controller.enable =
        enable;

    Controller.disable =
        disable;

    Controller.update =
        update;

    Controller.getInput =
        getInput;

    Controller.isEnabled =
        () => enabled;

    PlayerSystem.controller =
        Controller;

})();
