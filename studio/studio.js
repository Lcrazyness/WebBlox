"use strict";

/*
============================================================
 WebBlox Studio
 3D Editor Core
============================================================

 Systems:
 - 3D viewport
 - Editor camera
 - WASD movement
 - Mouse look
 - Shift speed boost
 - Object selection
 - Explorer
 - Properties
 - Part creation
 - Part deletion
 - Transform editing
 - Color editing

============================================================
*/

(() => {

    /*
    ============================================================
     THREE.JS
    ============================================================
    */

    const THREE_CDN =
        "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";


    /*
    ============================================================
     STATE
    ============================================================
    */

    let THREE = null;

    let scene = null;
    let camera = null;
    let renderer = null;

    let raycaster = null;
    let mouse = null;

    let clock = null;

    let selectedObject = null;

    const objects = [];

    const keys = {};

    let pointerLocked = false;

    let cameraSpeed = 10;
    let mouseSensitivity = 0.0025;

    let cameraYaw = 0;
    let cameraPitch = 0;


    /*
    ============================================================
     HTML ELEMENTS
    ============================================================
    */

    let viewport = null;
    let explorer = null;
    let properties = null;


    /*
    ============================================================
     LOAD THREE.JS
    ============================================================
    */

    async function loadThree() {

        if (window.THREE) {

            THREE = window.THREE;

            return;

        }


        try {

            const module =
                await import(
                    THREE_CDN
                );

            THREE = module;

        } catch (error) {

            console.error(
                "[WebBlox Studio] Could not load Three.js:",
                error
            );

            showViewportError(
                "Could not load the 3D engine."
            );

        }

    }


    /*
    ============================================================
     FIND ELEMENTS
    ============================================================
    */

    function findElements() {

        viewport =
            document.querySelector(
                "#viewport"
            ) ||
            document.querySelector(
                "#viewport3d"
            ) ||
            document.querySelector(
                ".viewport"
            ) ||
            document.querySelector(
                ".viewport-container"
            );


        explorer =
            document.querySelector(
                "#explorer"
            ) ||
            document.querySelector(
                "#explorerPanel"
            ) ||
            document.querySelector(
                ".explorer"
            );


        properties =
            document.querySelector(
                "#properties"
            ) ||
            document.querySelector(
                "#propertiesPanel"
            ) ||
            document.querySelector(
                ".properties"
            );

    }


    /*
    ============================================================
     CREATE VIEWPORT IF MISSING
    ============================================================
    */

    function ensureViewport() {

        if (viewport) {
            return;
        }


        viewport =
            document.createElement(
                "div"
            );

        viewport.id =
            "viewport";

        viewport.style.position =
            "absolute";

        viewport.style.left =
            "0";

        viewport.style.top =
            "0";

        viewport.style.right =
            "0";

        viewport.style.bottom =
            "0";

        viewport.style.overflow =
            "hidden";


        document.body.appendChild(
            viewport
        );

    }


    /*
    ============================================================
     INITIALIZE THREE
    ============================================================
    */

    function createEngine() {

        if (!THREE || !viewport) {
            return;
        }


        scene =
            new THREE.Scene();


        scene.background =
            new THREE.Color(
                0x15171b
            );


        camera =
            new THREE.PerspectiveCamera(
                70,
                viewport.clientWidth /
                Math.max(
                    viewport.clientHeight,
                    1
                ),
                0.1,
                5000
            );


        camera.position.set(
            0,
            8,
            18
        );


        raycaster =
            new THREE.Raycaster();


        mouse =
            new THREE.Vector2();


        clock =
            new THREE.Clock();


        renderer =
            new THREE.WebGLRenderer({
                antialias: true
            });


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );


        renderer.setSize(
            viewport.clientWidth,
            viewport.clientHeight
        );


        renderer.shadowMap.enabled =
            true;


        renderer.domElement.style.width =
            "100%";

        renderer.domElement.style.height =
            "100%";


        viewport.appendChild(
            renderer.domElement
        );


        /*
        ========================================================
         LIGHTING
        ========================================================
        */

        const ambient =
            new THREE.HemisphereLight(
                0xffffff,
                0x333333,
                2
            );


        scene.add(
            ambient
        );


        const directional =
            new THREE.DirectionalLight(
                0xffffff,
                3
            );


        directional.position.set(
            20,
            40,
            20
        );


        directional.castShadow =
            true;


        scene.add(
            directional
        );


        /*
        ========================================================
         GRID
        ========================================================
        */

        const grid =
            new THREE.GridHelper(
                500,
                500,
                0x555555,
                0x292929
            );


        scene.add(
            grid
        );


        /*
        ========================================================
         AXES
        ========================================================
        */

        const axes =
            new THREE.AxesHelper(
                10
            );


        scene.add(
            axes
        );


        /*
        ========================================================
         DEFAULT BASEPLATE
        ========================================================
        */

        createPart({
            name: "Baseplate",
            position: {
                x: 0,
                y: -0.5,
                z: 0
            },
            size: {
                x: 40,
                y: 1,
                z: 40
            },
            color: "#555555"
        });


        /*
        ========================================================
         DEFAULT PART
        ========================================================
        */

        createPart({
            name: "Part",
            position: {
                x: 0,
                y: 1,
                z: 0
            },
            size: {
                x: 4,
                y: 2,
                z: 4
            },
            color: "#4da6ff"
        });


        setupViewportEvents();

        setupKeyboard();

        setupResize();

        updateExplorer();

        render();

    }


    /*
    ============================================================
     CREATE PART
    ============================================================
    */

    function createPart(options = {}) {

        if (!THREE || !scene) {
            return null;
        }


        const size =
            options.size || {
                x: 4,
                y: 1,
                z: 4
            };


        const geometry =
            new THREE.BoxGeometry(
                size.x,
                size.y,
                size.z
            );


        const material =
            new THREE.MeshStandardMaterial({
                color:
                    options.color ||
                    "#ffffff"
            });


        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );


        mesh.position.set(
            options.position?.x || 0,
            options.position?.y || 0,
            options.position?.z || 0
        );


        mesh.rotation.set(
            THREE.MathUtils.degToRad(
                options.rotation?.x || 0
            ),
            THREE.MathUtils.degToRad(
                options.rotation?.y || 0
            ),
            THREE.MathUtils.degToRad(
                options.rotation?.z || 0
            )
        );


        mesh.castShadow =
            true;


        mesh.receiveShadow =
            true;


        mesh.userData.webblox =
            true;


        mesh.userData.type =
            "Part";


        mesh.userData.name =
            options.name ||
            `Part${objects.length + 1}`;


        mesh.userData.color =
            options.color ||
            "#ffffff";


        scene.add(
            mesh
        );


        objects.push(
            mesh
        );


        updateExplorer();


        return mesh;

    }


    /*
    ============================================================
     DELETE PART
    ============================================================
    */

    function deleteSelected() {

        if (
            !selectedObject ||
            !selectedObject.userData?.webblox
        ) {
            return;
        }


        scene.remove(
            selectedObject
        );


        const index =
            objects.indexOf(
                selectedObject
            );


        if (index !== -1) {

            objects.splice(
                index,
                1
            );

        }


        selectedObject = null;


        updateExplorer();

        updateProperties();

    }


    /*
    ============================================================
     SELECT OBJECT
    ============================================================
    */

    function selectObject(object) {

        if (
            selectedObject === object
        ) {
            updateProperties();

            return;
        }


        selectedObject =
            object;


        updateExplorer();

        updateProperties();

    }


    /*
    ============================================================
     CLICK VIEWPORT
    ============================================================
    */

    function setupViewportEvents() {

        renderer.domElement.addEventListener(
            "mousedown",
            event => {

                /*
                 * Right mouse button controls camera.
                 */

                if (
                    event.button === 2
                ) {

                    event.preventDefault();

                    renderer.domElement.requestPointerLock();

                    return;

                }


                /*
                 * Left click selects parts.
                 */

                if (
                    event.button !== 0
                ) {
                    return;
                }


                const rect =
                    renderer.domElement.getBoundingClientRect();


                mouse.x =
                    (
                        (event.clientX - rect.left) /
                        rect.width
                    ) * 2 - 1;


                mouse.y =
                    -(
                        (event.clientY - rect.top) /
                        rect.height
                    ) * 2 + 1;


                raycaster.setFromCamera(
                    mouse,
                    camera
                );


                const hits =
                    raycaster.intersectObjects(
                        objects,
                        false
                    );


                if (
                    hits.length
                ) {

                    selectObject(
                        hits[0].object
                    );

                } else {

                    selectObject(
                        null
                    );

                }

            }
        );


        renderer.domElement.addEventListener(
            "contextmenu",
            event => {

                event.preventDefault();

            }
        );


        document.addEventListener(
            "pointerlockchange",
            () => {

                pointerLocked =
                    document.pointerLockElement ===
                    renderer.domElement;

            }
        );


        document.addEventListener(
            "mousemove",
            event => {

                if (!pointerLocked) {
                    return;
                }


                cameraYaw -=
                    event.movementX *
                    mouseSensitivity;


                cameraPitch -=
                    event.movementY *
                    mouseSensitivity;


                const limit =
                    Math.PI / 2 - 0.05;


                cameraPitch =
                    Math.max(
                        -limit,
                        Math.min(
                            limit,
                            cameraPitch
                        )
                    );


                camera.rotation.order =
                    "YXZ";


                camera.rotation.y =
                    cameraYaw;


                camera.rotation.x =
                    cameraPitch;

            }
        );

    }


    /*
    ============================================================
     KEYBOARD
    ============================================================
    */

    function setupKeyboard() {

        window.addEventListener(
            "keydown",
            event => {

                keys[
                    event.code
                ] = true;


                /*
                 * Prevent browser scrolling.
                 */

                if (
                    [
                        "KeyW",
                        "KeyA",
                        "KeyS",
                        "KeyD",
                        "Space"
                    ].includes(
                        event.code
                    )
                ) {

                    event.preventDefault();

                }


                /*
                 * Delete selected object.
                 */

                if (
                    event.code ===
                    "Delete"
                ) {

                    deleteSelected();

                }


                /*
                 * Escape pointer lock.
                 */

                if (
                    event.code ===
                    "Escape" &&
                    pointerLocked
                ) {

                    document.exitPointerLock();

                }

            }
        );


        window.addEventListener(
            "keyup",
            event => {

                keys[
                    event.code
                ] = false;

            }
        );

    }


    /*
    ============================================================
     CAMERA MOVEMENT
    ============================================================
    */

    function updateCamera(delta) {

        if (!camera) {
            return;
        }


        const direction =
            new THREE.Vector3();


        const forward =
            new THREE.Vector3();


        camera.getWorldDirection(
            forward
        );


        forward.y = 0;

        forward.normalize();


        const right =
            new THREE.Vector3();


        right.crossVectors(
            forward,
            camera.up
        )
        .normalize();


        /*
         * W
         */

        if (
            keys.KeyW
        ) {

            direction.add(
                forward
            );

        }


        /*
         * S
         */

        if (
            keys.KeyS
        ) {

            direction.sub(
                forward
            );

        }


        /*
         * A
         */

        if (
            keys.KeyA
        ) {

            direction.sub(
                right
            );

        }


        /*
         * D
         */

        if (
            keys.KeyD
        ) {

            direction.add(
                right
            );

        }


        /*
         * Q = down
         */

        if (
            keys.KeyQ
        ) {

            direction.y -= 1;

        }


        /*
         * E = up
         */

        if (
            keys.KeyE
        ) {

            direction.y += 1;

        }


        if (
            direction.lengthSq() === 0
        ) {
            return;
        }


        direction.normalize();


        let speed =
            cameraSpeed;


        if (
            keys.ShiftLeft ||
            keys.ShiftRight
        ) {

            speed *= 4;

        }


        camera.position.addScaledVector(
            direction,
            speed * delta
        );

    }


    /*
    ============================================================
     EXPLORER
    ============================================================
    */

    function updateExplorer() {

        if (!explorer) {
            return;
        }


        explorer.innerHTML = "";


        const workspace =
            document.createElement(
                "div"
            );


        workspace.className =
            "studio-explorer-item workspace";


        workspace.innerHTML =
            `
                <span>▾</span>
                <strong>Workspace</strong>
            `;


        explorer.appendChild(
            workspace
        );


        const cameraItem =
            document.createElement(
                "div"
            );


        cameraItem.className =
            "studio-explorer-item";


        cameraItem.innerHTML =
            `
                <span>🎥</span>
                <span>Camera</span>
            `;


        explorer.appendChild(
            cameraItem
        );


        for (
            const object
            of objects
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "studio-explorer-item";


            if (
                object === selectedObject
            ) {

                item.classList.add(
                    "selected"
                );

            }


            item.innerHTML =
                `
                    <span>🧊</span>
                    <span>
                        ${escapeHTML(
                            object.userData.name
                        )}
                    </span>
                `;


            item.addEventListener(
                "click",
                () => {

                    selectObject(
                        object
                    );

                }
            );


            explorer.appendChild(
                item
            );

        }

    }


    /*
    ============================================================
     PROPERTIES
    ============================================================
    */

    function updateProperties() {

        if (!properties) {
            return;
        }


        properties.innerHTML = "";


        if (!selectedObject) {

            properties.innerHTML =
                `
                    <div class="studio-properties-empty">
                        Select an object to edit its properties.
                    </div>
                `;

            return;

        }


        const data =
            selectedObject.userData;


        addPropertyInput(
            "Name",
            data.name,
            value => {

                data.name =
                    value ||
                    "Part";


                updateExplorer();

            }
        );


        addNumberProperty(
            "Position X",
            selectedObject.position.x,
            value => {

                selectedObject.position.x =
                    value;

            }
        );


        addNumberProperty(
            "Position Y",
            selectedObject.position.y,
            value => {

                selectedObject.position.y =
                    value;

            }
        );


        addNumberProperty(
            "Position Z",
            selectedObject.position.z,
            value => {

                selectedObject.position.z =
                    value;

            }
        );


        addNumberProperty(
            "Size X",
            selectedObject.scale.x *
            selectedObject.geometry.parameters.width,
            value => {

                const base =
                    selectedObject.geometry.parameters.width;

                if (base !== 0) {

                    selectedObject.scale.x =
                        value / base;

                }

            }
        );


        addNumberProperty(
            "Size Y",
            selectedObject.scale.y *
            selectedObject.geometry.parameters.height,
            value => {

                const base =
                    selectedObject.geometry.parameters.height;

                if (base !== 0) {

                    selectedObject.scale.y =
                        value / base;

                }

            }
        );


        addNumberProperty(
            "Size Z",
            selectedObject.scale.z *
            selectedObject.geometry.parameters.depth,
            value => {

                const base =
                    selectedObject.geometry.parameters.depth;

                if (base !== 0) {

                    selectedObject.scale.z =
                        value / base;

                }

            }
        );


        addNumberProperty(
            "Rotation X",
            THREE.MathUtils.radToDeg(
                selectedObject.rotation.x
            ),
            value => {

                selectedObject.rotation.x =
                    THREE.MathUtils.degToRad(
                        value
                    );

            }
        );


        addNumberProperty(
            "Rotation Y",
            THREE.MathUtils.radToDeg(
                selectedObject.rotation.y
            ),
            value => {

                selectedObject.rotation.y =
                    THREE.MathUtils.degToRad(
                        value
                    );

            }
        );


        addNumberProperty(
            "Rotation Z",
            THREE.MathUtils.radToDeg(
                selectedObject.rotation.z
            ),
            value => {

                selectedObject.rotation.z =
                    THREE.MathUtils.degToRad(
                        value
                    );

            }
        );


        addColorProperty(
            "Color",
            data.color ||
            "#ffffff",
            value => {

                data.color =
                    value;


                selectedObject.material.color.set(
                    value
                );

            }
        );

    }


    /*
    ============================================================
     PROPERTY INPUT
    ============================================================
    */

    function addPropertyInput(
        label,
        value,
        callback
    ) {

        const row =
            document.createElement(
                "div"
            );


        row.className =
            "studio-property";


        const labelElement =
            document.createElement(
                "label"
            );


        labelElement.textContent =
            label;


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "text";


        input.value =
            value ?? "";


        input.addEventListener(
            "change",
            () => {

                callback(
                    input.value
                );

            }
        );


        row.appendChild(
            labelElement
        );


        row.appendChild(
            input
        );


        properties.appendChild(
            row
        );

    }


    /*
    ============================================================
     NUMBER PROPERTY
    ============================================================
    */

    function addNumberProperty(
        label,
        value,
        callback
    ) {

        const row =
            document.createElement(
                "div"
            );


        row.className =
            "studio-property";


        const labelElement =
            document.createElement(
                "label"
            );


        labelElement.textContent =
            label;


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "number";


        input.step =
            "0.1";


        input.value =
            Number(value).toFixed(2);


        input.addEventListener(
            "change",
            () => {

                const number =
                    Number(
                        input.value
                    );


                if (
                    Number.isFinite(
                        number
                    )
                ) {

                    callback(
                        number
                    );

                }

            }
        );


        row.appendChild(
            labelElement
        );


        row.appendChild(
            input
        );


        properties.appendChild(
            row
        );

    }


    /*
    ============================================================
     COLOR PROPERTY
    ============================================================
    */

    function addColorProperty(
        label,
        value,
        callback
    ) {

        const row =
            document.createElement(
                "div"
            );


        row.className =
            "studio-property";


        const labelElement =
            document.createElement(
                "label"
            );


        labelElement.textContent =
            label;


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "color";


        input.value =
            /^#[0-9a-f]{6}$/i.test(
                value
            )
                ? value
                : "#ffffff";


        input.addEventListener(
            "input",
            () => {

                callback(
                    input.value
                );

            }
        );


        row.appendChild(
            labelElement
        );


        row.appendChild(
            input
        );


        properties.appendChild(
            row
        );

    }


    /*
    ============================================================
     ESCAPE HTML
    ============================================================
    */

    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /*
    ============================================================
     RESIZE
    ============================================================
    */

    function setupResize() {

        window.addEventListener(
            "resize",
            () => {

                if (
                    !renderer ||
                    !camera ||
                    !viewport
                ) {
                    return;
                }


                const width =
                    viewport.clientWidth;


                const height =
                    Math.max(
                        viewport.clientHeight,
                        1
                    );


                camera.aspect =
                    width / height;


                camera.updateProjectionMatrix();


                renderer.setSize(
                    width,
                    height
                );

            }
        );

    }


    /*
    ============================================================
     RENDER LOOP
    ============================================================
    */

    function render() {

        requestAnimationFrame(
            render
        );


        if (
            !renderer ||
            !scene ||
            !camera
        ) {
            return;
        }


        const delta =
            Math.min(
                clock.getDelta(),
                0.1
            );


        updateCamera(
            delta
        );


        renderer.render(
            scene,
            camera
        );

    }


    /*
    ============================================================
     VIEWPORT ERROR
    ============================================================
    */

    function showViewportError(
        message
    ) {

        if (!viewport) {
            return;
        }


        viewport.innerHTML =
            `
                <div
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        width:100%;
                        height:100%;
                        color:white;
                        font-family:Arial,sans-serif;
                        background:#111;
                    "
                >
                    ${escapeHTML(message)}
                </div>
            `;

    }


    /*
    ============================================================
     PUBLIC API
    ============================================================
    */

    window.WebBloxStudio = {

        createPart,

        deleteSelected,

        selectObject,

        getSelectedObject() {

            return selectedObject;

        },

        getObjects() {

            return [
                ...objects
            ];

        },

        getScene() {

            return scene;

        },

        getCamera() {

            return camera;

        }

    };


    /*
    ============================================================
     INIT
    ============================================================
    */

    async function init() {

        console.log(
            "[WebBlox Studio] Starting..."
        );


        findElements();

        ensureViewport();

        await loadThree();


        if (!THREE) {
            return;
        }


        createEngine();


        console.log(
            "[WebBlox Studio] 3D editor ready."
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();
