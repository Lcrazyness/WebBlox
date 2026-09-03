/*
 * WebBlox Player Controller
 * Stage 3A+
 *
 * Existing file:
 * /Player/controller.js
 *
 * Responsibilities:
 * - Keyboard input
 * - Editable hotkeys
 * - Movement intent
 * - Jump intent
 * - Sprint intent
 * - Input state
 * - Safe focus handling
 *
 * IMPORTANT:
 * This controller DOES NOT make movement camera-relative.
 *
 * Movement directions are always:
 *   W / Forward  = -Z
 *   S / Backward = +Z
 *   A / Left     = -X
 *   D / Right    = +X
 *
 * Camera rotation belongs to camera.js.
 * Physics belongs to physics.js.
 * Player runtime execution belongs to player.js.
 */

(() => {
    "use strict";


    // ============================================================
    // GLOBAL API GUARD
    // ============================================================

    const existing =
        window.WebBloxController;

    if (
        existing &&
        existing.__stage
    ) {
        console.warn(
            "[WebBlox Controller] Controller already initialized."
        );

        return;
    }


    // ============================================================
    // CONSTANTS
    // ============================================================

    const STORAGE_KEY =
        "webblox_controller_hotkeys_v2";


    const DEFAULT_HOTKEYS = {

        forward:
            "w",

        backward:
            "s",

        left:
            "a",

        right:
            "d",

        jump:
            " ",

        sprint:
            "shift"

    };


    const MOVEMENT_KEYS = [

        "forward",

        "backward",

        "left",

        "right",

        "jump",

        "sprint"

    ];


    // ============================================================
    // INTERNAL STATE
    // ============================================================

    const controllerState = {

        enabled:
            true,

        focused:
            true,

        capturingHotkey:
            null,

        keys:
            new Set(),

        hotkeys:
            {
                ...DEFAULT_HOTKEYS
            },

        intent:
            {

                forward:
                    false,

                backward:
                    false,

                left:
                    false,

                right:
                    false,

                jump:
                    false,

                sprint:
                    false

            },

        axis:
            {

                x:
                    0,

                z:
                    0

            },

        movement:
            {

                x:
                    0,

                z:
                    0

            },

        jumping:
            false,

        running:
            false,

        listenersAttached:
            false

    };


    // ============================================================
    // STORAGE
    // ============================================================

    function loadHotkeys() {

        try {

            const raw =
                window.localStorage.getItem(
                    STORAGE_KEY
                );


            if (
                !raw
            ) {

                return;

            }


            const data =
                JSON.parse(
                    raw
                );


            if (
                !data ||
                typeof data !==
                "object"
            ) {

                return;

            }


            for (
                const action
                of MOVEMENT_KEYS
            ) {

                if (
                    typeof data[action] ===
                    "string" &&
                    data[action].length > 0
                ) {

                    controllerState.hotkeys[action] =
                        data[action];

                }

            }

        } catch (
            error
        ) {

            console.warn(
                "[WebBlox Controller] Unable to load saved hotkeys.",
                error
            );

        }

    }


    function saveHotkeys() {

        try {

            window.localStorage.setItem(

                STORAGE_KEY,

                JSON.stringify(
                    controllerState.hotkeys
                )

            );

        } catch (
            error
        ) {

            console.warn(
                "[WebBlox Controller] Unable to save hotkeys.",
                error
            );

        }

    }


    loadHotkeys();


    // ============================================================
    // NORMALIZE KEY
    // ============================================================

    function normalizeKey(
        event
    ) {

        if (
            !event
        ) {

            return "";

        }


        if (
            event.code ===
            "Space"
        ) {

            return " ";

        }


        if (
            event.code ===
                "ShiftLeft" ||
            event.code ===
                "ShiftRight"
        ) {

            return "shift";

        }


        if (
            event.code ===
            "ControlLeft" ||
            event.code ===
            "ControlRight"
        ) {

            return "ctrl";

        }


        if (
            event.code ===
            "AltLeft" ||
            event.code ===
            "AltRight"
        ) {

            return "alt";

        }


        if (
            event.code ===
            "Tab"
        ) {

            return "tab";

        }


        return String(
            event.key ||
            ""
        ).toLowerCase();

    }


    // ============================================================
    // IS TEXT INPUT
    // ============================================================

    function isTextInput(
        element
    ) {

        if (
            !element
        ) {

            return false;

        }


        const tag =
            String(
                element.tagName ||
                ""
            ).toUpperCase();


        if (
            tag ===
            "TEXTAREA"
        ) {

            return true;

        }


        if (
            tag ===
            "SELECT"
        ) {

            return true;

        }


        if (
            tag ===
            "INPUT"
        ) {

            const type =
                String(
                    element.type ||
                    "text"
                ).toLowerCase();


            return ![
                "checkbox",
                "radio",
                "range",
                "button",
                "submit",
                "reset",
                "file",
                "color"
            ].includes(
                type
            );

        }


        return (
            element.isContentEditable ===
            true
        );

    }


    // ============================================================
    // SET INTENT
    // ============================================================

    function updateIntent() {

        const keys =
            controllerState.keys;

        const hotkeys =
            controllerState.hotkeys;


        controllerState.intent.forward =
            keys.has(
                hotkeys.forward
            );


        controllerState.intent.backward =
            keys.has(
                hotkeys.backward
            );


        controllerState.intent.left =
            keys.has(
                hotkeys.left
            );


        controllerState.intent.right =
            keys.has(
                hotkeys.right
            );


        controllerState.intent.jump =
            keys.has(
                hotkeys.jump
            );


        controllerState.intent.sprint =
            keys.has(
                hotkeys.sprint
            );


        // --------------------------------------------------------
        // World-relative movement axes.
        //
        // X:
        //   Left  = -1
        //   Right = +1
        //
        // Z:
        //   Forward  = -1
        //   Backward = +1
        // --------------------------------------------------------

        let x =
            0;

        let z =
            0;


        if (
            controllerState.intent.left
        ) {

            x -=
                1;

        }


        if (
            controllerState.intent.right
        ) {

            x +=
                1;

        }


        if (
            controllerState.intent.forward
        ) {

            z -=
                1;

        }


        if (
            controllerState.intent.backward
        ) {

            z +=
                1;

        }


        const length =
            Math.hypot(
                x,
                z
            );


        if (
            length >
            0
        ) {

            x /=
                length;

            z /=
                length;

        }


        controllerState.axis.x =
            x;

        controllerState.axis.z =
            z;


        controllerState.movement.x =
            x;

        controllerState.movement.z =
            z;


        controllerState.running =
            controllerState.intent.sprint &&
            length >
            0;


        controllerState.jumping =
            controllerState.intent.jump;

    }


    // ============================================================
    // KEY DOWN
    // ============================================================

    function onKeyDown(
        event
    ) {

        // --------------------------------------------------------
        // Hotkey capture mode.
        // --------------------------------------------------------

        if (
            controllerState.capturingHotkey
        ) {

            return;

        }


        // --------------------------------------------------------
        // Ignore typing into editors and inputs.
        // --------------------------------------------------------

        if (
            isTextInput(
                document.activeElement
            )
        ) {

            return;

        }


        if (
            !controllerState.enabled
        ) {

            return;

        }


        const key =
            normalizeKey(
                event
            );


        if (
            !key
        ) {

            return;

        }


        controllerState.keys.add(
            key
        );


        updateIntent();


        // --------------------------------------------------------
        // Only prevent browser behavior for movement keys.
        // --------------------------------------------------------

        const movementKey =
            Object.values(
                controllerState.hotkeys
            ).includes(
                key
            );


        if (
            movementKey
        ) {

            event.preventDefault();

        }

    }


    // ============================================================
    // KEY UP
    // ============================================================

    function onKeyUp(
        event
    ) {

        const key =
            normalizeKey(
                event
            );


        if (
            !key
        ) {

            return;

        }


        controllerState.keys.delete(
            key
        );


        updateIntent();

    }


    // ============================================================
    // WINDOW BLUR
    // ============================================================

    function onBlur() {

        controllerState.keys.clear();

        updateIntent();

    }


    // ============================================================
    // VISIBILITY CHANGE
    // ============================================================

    function onVisibilityChange() {

        if (
            document.hidden
        ) {

            controllerState.keys.clear();

            updateIntent();

        }

    }


    // ============================================================
    // FOCUS
    // ============================================================

    function setFocused(
        focused
    ) {

        controllerState.focused =
            focused !== false;


        if (
            !controllerState.focused
        ) {

            controllerState.keys.clear();

        }


        updateIntent();

    }


    // ============================================================
    // ENABLE / DISABLE
    // ============================================================

    function setEnabled(
        enabled
    ) {

        controllerState.enabled =
            enabled !== false;


        if (
            !controllerState.enabled
        ) {

            controllerState.keys.clear();

        }


        updateIntent();

    }


    // ============================================================
    // ATTACH
    // ============================================================

    function attach() {

        if (
            controllerState.listenersAttached
        ) {

            return;

        }


        window.addEventListener(

            "keydown",

            onKeyDown,

            true

        );


        window.addEventListener(

            "keyup",

            onKeyUp,

            true

        );


        window.addEventListener(

            "blur",

            onBlur

        );


        document.addEventListener(

            "visibilitychange",

            onVisibilityChange

        );


        controllerState.listenersAttached =
            true;

    }


    // ============================================================
    // DETACH
    // ============================================================

    function detach() {

        window.removeEventListener(

            "keydown",

            onKeyDown,

            true

        );


        window.removeEventListener(

            "keyup",

            onKeyUp,

            true

        );


        window.removeEventListener(

            "blur",

            onBlur

        );


        document.removeEventListener(

            "visibilitychange",

            onVisibilityChange

        );


        controllerState.keys.clear();


        updateIntent();


        controllerState.listenersAttached =
            false;

    }


    // ============================================================
    // HOTKEY ACTION VALIDATION
    // ============================================================

    function isValidAction(
        action
    ) {

        return MOVEMENT_KEYS.includes(
            action
        );

    }


    // ============================================================
    // SET HOTKEY
    // ============================================================

    function setHotkey(
        action,
        key
    ) {

        if (
            !isValidAction(
                action
            )
        ) {

            throw new Error(
                `Unknown WebBlox controller action: ${action}`
            );

        }


        let normalized =
            String(
                key ||
                ""
            ).toLowerCase();


        if (
            normalized ===
            "space"
        ) {

            normalized =
                " ";

        }


        if (
            normalized ===
            "spacebar"
        ) {

            normalized =
                " ";

        }


        if (
            !normalized
        ) {

            throw new Error(
                "Hotkey cannot be empty."
            );

        }


        // --------------------------------------------------------
        // Prevent duplicate movement bindings.
        // --------------------------------------------------------

        for (
            const [existingAction, existingKey]
            of Object.entries(
                controllerState.hotkeys
            )
        ) {

            if (
                existingAction !==
                action &&
                existingKey ===
                normalized
            ) {

                throw new Error(
                    `The key "${normalized === " " ? "Space" : normalized}" is already assigned to ${existingAction}.`
                );

            }

        }


        controllerState.hotkeys[action] =
            normalized;


        saveHotkeys();


        updateIntent();


        return normalized;

    }


    // ============================================================
    // SET MULTIPLE HOTKEYS
    // ============================================================

    function setHotkeys(
        newHotkeys = {}
    ) {

        const proposed = {

            ...controllerState.hotkeys,

            ...newHotkeys

        };


        const used =
            new Map();


        for (
            const action
            of MOVEMENT_KEYS
        ) {

            const key =
                String(
                    proposed[action] ||
                    ""
                ).toLowerCase();


            if (
                !key
            ) {

                throw new Error(
                    `${action} cannot have an empty hotkey.`
                );

            }


            if (
                used.has(
                    key
                )
            ) {

                throw new Error(
                    `Duplicate hotkey: ${key}`
                );

            }


            used.set(
                key,
                action
            );

            proposed[action] =
                key;

        }


        controllerState.hotkeys =
            proposed;


        saveHotkeys();


        updateIntent();


        return getHotkeys();

    }


    // ============================================================
    // RESET HOTKEYS
    // ============================================================

    function resetHotkeys() {

        controllerState.hotkeys =
            {
                ...DEFAULT_HOTKEYS
            };


        saveHotkeys();


        controllerState.keys.clear();


        updateIntent();


        return getHotkeys();

    }


    // ============================================================
    // GET HOTKEYS
    // ============================================================

    function getHotkeys() {

        return {

            ...controllerState.hotkeys

        };

    }


    // ============================================================
    // GET INTENT
    // ============================================================

    function getIntent() {

        updateIntent();


        return {

            forward:
                controllerState.intent.forward,

            backward:
                controllerState.intent.backward,

            left:
                controllerState.intent.left,

            right:
                controllerState.intent.right,

            jump:
                controllerState.intent.jump,

            sprint:
                controllerState.intent.sprint

        };

    }


    // ============================================================
    // GET AXIS
    // ============================================================

    function getMovement() {

        updateIntent();


        return {

            x:
                controllerState.movement.x,

            z:
                controllerState.movement.z

        };

    }


    // ============================================================
    // IS MOVING
    // ============================================================

    function isMoving() {

        updateIntent();


        return (

            controllerState.movement.x !==
                0 ||

            controllerState.movement.z !==
                0

        );

    }


    // ============================================================
    // IS SPRINTING
    // ============================================================

    function isSprinting() {

        updateIntent();

        return (
            controllerState.running
        );

    }


    // ============================================================
    // IS JUMPING
    // ============================================================

    function isJumpHeld() {

        updateIntent();

        return (
            controllerState.jumping
        );

    }


    // ============================================================
    // SIMULATED INPUT
    // ============================================================
    //
    // Useful for mobile/controller support later.
    // ============================================================

    function setVirtualInput(
        action,
        active
    ) {

        if (
            !isValidAction(
                action
            )
        ) {

            return false;

        }


        if (
            active
        ) {

            controllerState.intent[action] =
                true;

        } else {

            controllerState.intent[action] =
                false;

        }


        let x =
            0;

        let z =
            0;


        if (
            controllerState.intent.left
        ) {

            x -=
                1;

        }


        if (
            controllerState.intent.right
        ) {

            x +=
                1;

        }


        if (
            controllerState.intent.forward
        ) {

            z -=
                1;

        }


        if (
            controllerState.intent.backward
        ) {

            z +=
                1;

        }


        const length =
            Math.hypot(
                x,
                z
            );


        if (
            length
        ) {

            x /=
                length;

            z /=
                length;

        }


        controllerState.movement.x =
            x;

        controllerState.movement.z =
            z;


        return true;

    }


    // ============================================================
    // HOTKEY CAPTURE
    // ============================================================

    function captureHotkey(
        action
    ) {

        if (
            !isValidAction(
                action
            )
        ) {

            return Promise.reject(
                new Error(
                    `Unknown hotkey action: ${action}`
                )
            );

        }


        controllerState.capturingHotkey =
            action;


        return new Promise(
            (
                resolve,
                reject
            ) => {

                const handler =
                    event => {

                        event.preventDefault();
                        event.stopPropagation();


                        if (
                            event.key ===
                            "Escape"
                        ) {

                            cleanup();


                            reject(
                                new Error(
                                    "Hotkey capture cancelled."
                                )
                            );


                            return;

                        }


                        const key =
                            normalizeKey(
                                event
                            );


                        try {

                            setHotkey(
                                action,
                                key
                            );


                            cleanup();


                            resolve(
                                key
                            );

                        } catch (
                            error
                        ) {

                            cleanup();


                            reject(
                                error
                            );

                        }

                    };


                function cleanup() {

                    window.removeEventListener(

                        "keydown",

                        handler,

                        true

                    );


                    controllerState.capturingHotkey =
                        null;

                }


                window.addEventListener(

                    "keydown",

                    handler,

                    true

                );

            }
        );

    }


    // ============================================================
    // CONTROLLER STATE
    // ============================================================

    function getState() {

        updateIntent();


        return {

            enabled:
                controllerState.enabled,

            focused:
                controllerState.focused,

            moving:
                isMoving(),

            sprinting:
                isSprinting(),

            jump:
                isJumpHeld(),

            intent:
                getIntent(),

            movement:
                getMovement(),

            hotkeys:
                getHotkeys()

        };

    }


    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxController = {

        __stage:
            "3A+",

        version:
            "3A.2",

        state:
            controllerState,

        attach,

        detach,

        setEnabled,

        setFocused,

        setHotkey,

        setHotkeys,

        resetHotkeys,

        getHotkeys,

        getIntent,

        getMovement,

        isMoving,

        isSprinting,

        isJumpHeld,

        setVirtualInput,

        captureHotkey,

        getState

    };


    // ============================================================
    // ATTACH IMMEDIATELY
    // ============================================================

    attach();


    console.log(
        "[WebBlox Controller] Loaded."
    );


    console.log(
        "[WebBlox Controller] Movement is world-relative."
    );


    console.log(
        "[WebBlox Controller] Camera rotation is not used to calculate movement axes."
    );


    console.log(
        "[WebBlox Controller] Editable hotkeys enabled."
    );

})();
