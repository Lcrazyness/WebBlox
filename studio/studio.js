"use strict";

/*
============================================================
 WebBlox Studio
 3D Viewport + Camera + WASD Movement
============================================================
*/

(() => {

    // ========================================================
    // STATE
    // ========================================================

    let scene;
    let camera;
    let renderer;

    let clock;

    let viewport;

    let selectedObject = null;

    let isPointerLocked = false;

    const keys = {};

    const objects = [];

    const cameraState = {
        speed: 12,
        lookSpeed: 0.0025,

        yaw: 0,
        pitch: 0,

        position: {
            x: 8,
            y: 7,
            z: 12
        }
    };

    // ========================================================
    // INITIALIZE
    // ========================================================

    function init() {

        console.log(
            "[WebBlox Studio] Starting 3D editor..."
        );

        viewport =
            document.querySelector(
                "#viewport"
            ) ||
            document.querySelector(
                "#gameViewport"
            ) ||
            document.querySelector(
                ".viewport"
            );

        if (!viewport) {

            console.error(
                "[WebBlox Studio] Viewport element not found."
            );

            return;

        }

        if (typeof THREE === "undefined") {

            console.error(
                "[WebBlox Studio] Three.js was not loaded."
            );

            viewport.innerHTML = `
                <div style="
                    padding:30px;
                    color:white;
                    font-family:Arial;
                    background:#151515;
                ">
                    <h2>WebBlox Studio</h2>
                    <p>Three.js failed to load.</p>
                    <p>Make sure studio.html loads Three.js before studio.js.</p>
                </div>
            `;

            return;

        }

        createScene();

        createCamera();

        createRenderer();

        createLighting();

        createWorld();

        createStarterParts();

        setupControls();

        setupResize();

        setupStudioButtons();

        clock =
            new THREE.Clock();

        animate();

        console.log(
            "[WebBlox Studio] 3D editor ready."
        );

    }

    // ========================================================
    // SCENE
    // ========================================================

    function createScene() {

        scene =
            new THREE.Scene();

        scene.background =
            new THREE.Color(
                0x101114
            );

    }

    // ========================================================
    // CAMERA
    // ========================================================

    function createCamera() {

        const width =
            viewport.clientWidth ||
            800;

        const height =
            viewport.clientHeight ||
            600;

        camera =
            new THREE.PerspectiveCamera(
                75,
                width / height,
                0.1,
                5000
            );

        camera.position.set(
            cameraState.position.x,
            cameraState.position.y,
            cameraState.position.z
        );

        cameraState.yaw =
            Math.atan2(
                -camera.position.x,
                -camera.position.z
            );

        updateCameraRotation();

    }

    // ========================================================
    // RENDERER
    // ========================================================

    function createRenderer() {

        renderer =
            new THREE.WebGLRenderer({
                antialias: true
            });

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                2
            )
        );

        renderer.setSize(
            viewport.clientWidth || 800,
            viewport.clientHeight || 600
        );

        renderer.shadowMap.enabled =
            true;

        renderer.shadowMap.type =
            THREE.PCFSoftShadowMap;

        renderer.domElement.style.width =
            "100%";

        renderer.domElement.style.height =
            "100%";

        renderer.domElement.style.display =
            "block";

        viewport.innerHTML = "";

        viewport.appendChild(
            renderer.domElement
        );

    }

    // ========================================================
    // LIGHTING
    // ========================================================

    function createLighting() {

        const ambient =
            new THREE.HemisphereLight(
                0xffffff,
                0x303030,
                1.5
            );

        scene.add(
            ambient
        );


        const directional =
            new THREE.DirectionalLight(
                0xffffff,
                2
            );

        directional.position.set(
            30,
            50,
            20
        );

        directional.castShadow =
            true;

        directional.shadow.mapSize.width =
            2048;

        directional.shadow.mapSize.height =
            2048;

        scene.add(
            directional
        );

    }

    // ========================================================
    // WORLD
    // ========================================================

    function createWorld() {

        // Ground

        const groundGeometry =
            new THREE.PlaneGeometry(
                2000,
                2000
            );

        const groundMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x555b61,
                roughness: 0.9,
                metalness: 0
            });

        const ground =
            new THREE.Mesh(
                groundGeometry,
                groundMaterial
            );

        ground.rotation.x =
            -Math.PI / 2;

        ground.receiveShadow =
            true;

        ground.userData.isGround =
            true;

        scene.add(
            ground
        );


        // Grid

        const grid =
            new THREE.GridHelper(
                200,
                200,
                0x888888,
                0x444444
            );

        grid.position.y =
            0.01;

        scene.add(
            grid
        );


        // Axes

        const axes =
            new THREE.AxesHelper(
                10
            );

        scene.add(
            axes
        );

    }

    // ========================================================
    // STARTER PARTS
    // ========================================================

    function createStarterParts() {

        createPart(
            0,
            2,
            0,
            4,
            4,
            4,
            0x4c8bf5,
            "StarterPart"
        );


        createPart(
            7,
            1,
            0,
            2,
            2,
            2,
            0xf5b642,
            "Part"
        );


        createPart(
            -7,
            1,
            0,
            2,
            2,
            2,
            0x5bd66f,
            "Part"
        );

    }

    // ========================================================
    // CREATE PART
    // ========================================================

    function createPart(
        x,
        y,
        z,
        width,
        height,
        depth,
        color,
        name
    ) {

        const geometry =
            new THREE.BoxGeometry(
                width,
                height,
                depth
            );

        const material =
            new THREE.MeshStandardMaterial({
                color:
                    color || 0x4c8bf5
            });

        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );

        mesh.position.set(
            x,
            y,
            z
        );

        mesh.castShadow =
            true;

        mesh.receiveShadow =
            true;

        mesh.userData.name =
            name ||
            "Part";

        mesh.userData.type =
            "Part";

        scene.add(
            mesh
        );

        objects.push(
            mesh
        );

        return mesh;

    }

    // ========================================================
    // INPUT
    // ========================================================

    function setupControls() {

        window.addEventListener(
            "keydown",
            event => {

                keys[
                    event.code
                ] = true;

                if (
                    event.code ===
                    "Space"
                ) {

                    event.preventDefault();

                }

                if (
                    event.code ===
                    "Delete"
                ) {

                    deleteSelected();

                }

                if (
                    event.code ===
                    "KeyF"
                ) {

                    focusSelected();

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


        renderer.domElement.addEventListener(
            "click",
            () => {

                renderer.domElement.requestPointerLock();

            }
        );


        document.addEventListener(
            "pointerlockchange",
            () => {

                isPointerLocked =
                    document.pointerLockElement ===
                    renderer.domElement;

            }
        );


        document.addEventListener(
            "mousemove",
            event => {

                if (
                    !isPointerLocked
                ) {
                    return;
                }

                cameraState.yaw -=
                    event.movementX *
                    cameraState.lookSpeed;

                cameraState.pitch -=
                    event.movementY *
                    cameraState.lookSpeed;


                const maxPitch =
                    Math.PI / 2 - 0.05;


                cameraState.pitch =
                    Math.max(
                        -maxPitch,
                        Math.min(
                            maxPitch,
                            cameraState.pitch
                        )
                    );


                updateCameraRotation();

            }
        );


        renderer.domElement.addEventListener(
            "contextmenu",
            event => {

                event.preventDefault();

            }
        );


        renderer.domElement.addEventListener(
            "mousedown",
            event => {

                if (
                    event.button === 0 &&
                    !isPointerLocked
                ) {

                    selectObjectAt(
                        event
                    );

                }

            }
        );

    }

    // ========================================================
    // CAMERA ROTATION
    // ========================================================

    function updateCameraRotation() {

        camera.rotation.order =
            "YXZ";

        camera.rotation.y =
            cameraState.yaw;

        camera.rotation.x =
            cameraState.pitch;

    }

    // ========================================================
    // CAMERA MOVEMENT
    // ========================================================

    function updateMovement(
        delta
    ) {

        if (!camera) {
            return;
        }

        const direction =
            new THREE.Vector3();

        const forward =
            new THREE.Vector3();

        const right =
            new THREE.Vector3();

        camera.getWorldDirection(
            forward
        );

        forward.y = 0;

        if (
            forward.lengthSq() > 0
        ) {

            forward.normalize();

        }

        right.crossVectors(
            forward,
            camera.up
        ).normalize();


        if (
            keys.KeyW ||
            keys.ArrowUp
        ) {

            direction.add(
                forward
            );

        }

        if (
            keys.KeyS ||
            keys.ArrowDown
        ) {

            direction.sub(
                forward
            );

        }

        if (
            keys.KeyD ||
            keys.ArrowRight
        ) {

            direction.add(
                right
            );

        }

        if (
            keys.KeyA ||
            keys.ArrowLeft
        ) {

            direction.sub(
                right
            );

        }

        if (
            keys.Space
        ) {

            direction.y += 1;

        }

        if (
            keys.ShiftLeft ||
            keys.ShiftRight
        ) {

            direction.y -= 1;

        }


        if (
            direction.lengthSq() === 0
        ) {

            return;

        }


        direction.normalize();


        const speed =
            keys.ControlLeft ||
            keys.ControlRight
                ? cameraState.speed * 3
                : cameraState.speed;


        camera.position.addScaledVector(
            direction,
            speed * delta
        );

    }

    // ========================================================
    // SELECT OBJECT
    // ========================================================

    function selectObjectAt(
        event
    ) {

        const rect =
            renderer.domElement.getBoundingClientRect();

        const mouse =
            new THREE.Vector2();

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


        const raycaster =
            new THREE.Raycaster();

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

            clearSelection();

        }

    }

    // ========================================================
    // SELECT
    // ========================================================

    function selectObject(
        object
    ) {

        clearSelection();

        selectedObject =
            object;


        if (
            selectedObject.material
        ) {

            selectedObject.userData.originalColor =
                selectedObject.material.color.getHex();

            selectedObject.material =
                selectedObject.material.clone();

            selectedObject.material.color.set(
                0xffff00
            );

        }


        console.log(
            "[WebBlox Studio] Selected:",
            selectedObject.userData.name
        );

    }

    // ========================================================
    // CLEAR SELECTION
    // ========================================================

    function clearSelection() {

        if (
            selectedObject &&
            selectedObject.material &&
            selectedObject.userData.originalColor !== undefined
        ) {

            selectedObject.material.color.set(
                selectedObject.userData.originalColor
            );

        }

        selectedObject =
            null;

    }

    // ========================================================
    // DELETE
    // ========================================================

    function deleteSelected() {

        if (
            !selectedObject
        ) {

            return;

        }

        const index =
            objects.indexOf(
                selectedObject
            );

        if (
            index !== -1
        ) {

            objects.splice(
                index,
                1
            );

        }

        scene.remove(
            selectedObject
        );

        selectedObject.geometry.dispose();

        selectedObject.material.dispose();

        selectedObject =
            null;

        console.log(
            "[WebBlox Studio] Deleted part."
        );

    }

    // ========================================================
    // FOCUS
    // ========================================================

    function focusSelected() {

        if (
            !selectedObject
        ) {

            return;

        }

        const position =
            selectedObject.position;

        camera.position.set(
            position.x + 8,
            position.y + 6,
            position.z + 8
        );

        camera.lookAt(
            position
        );

        cameraState.yaw =
            camera.rotation.y;

        cameraState.pitch =
            camera.rotation.x;

    }

    // ========================================================
    // ADD PART
    // ========================================================

    function addPart() {

        const position =
            camera.position.clone();

        const direction =
            new THREE.Vector3();

        camera.getWorldDirection(
            direction
        );

        position.addScaledVector(
            direction,
            8
        );

        position.y =
            Math.max(
                1,
                position.y
            );


        const part =
            createPart(
                Math.round(position.x),
                Math.round(position.y),
                Math.round(position.z),
                2,
                2,
                2,
                0x4c8bf5,
                `Part${objects.length + 1}`
            );


        selectObject(
            part
        );

    }

    // ========================================================
    // RESET CAMERA
    // ========================================================

    function resetCamera() {

        camera.position.set(
            8,
            7,
            12
        );

        cameraState.yaw =
            Math.atan2(
                -camera.position.x,
                -camera.position.z
            );

        cameraState.pitch =
            -0.25;

        updateCameraRotation();

    }

    // ========================================================
    // STUDIO BUTTONS
    // ========================================================

    function setupStudioButtons() {

        const addButton =
            document.querySelector(
                "#addPart"
            ) ||
            document.querySelector(
                "#addPartButton"
            ) ||
            document.querySelector(
                "[data-action='add-part']"
            );


        if (addButton) {

            addButton.addEventListener(
                "click",
                addPart
            );

        }


        const deleteButton =
            document.querySelector(
                "#deletePart"
            ) ||
            document.querySelector(
                "#deleteButton"
            ) ||
            document.querySelector(
                "[data-action='delete']"
            );


        if (deleteButton) {

            deleteButton.addEventListener(
                "click",
                deleteSelected
            );

        }


        const resetButton =
            document.querySelector(
                "#resetCamera"
            ) ||
            document.querySelector(
                "#resetCameraButton"
            ) ||
            document.querySelector(
                "[data-action='reset-camera']"
            );


        if (resetButton) {

            resetButton.addEventListener(
                "click",
                resetCamera
            );

        }


        const focusButton =
            document.querySelector(
                "#focusButton"
            ) ||
            document.querySelector(
                "[data-action='focus']"
            );


        if (focusButton) {

            focusButton.addEventListener(
                "click",
                focusSelected
            );

        }

    }

    // ========================================================
    // RESIZE
    // ========================================================

    function setupResize() {

        window.addEventListener(
            "resize",
            resize
        );

    }


    function resize() {

        if (
            !renderer ||
            !camera ||
            !viewport
        ) {

            return;

        }

        const width =
            viewport.clientWidth ||
            800;

        const height =
            viewport.clientHeight ||
            600;


        camera.aspect =
            width / height;

        camera.updateProjectionMatrix();


        renderer.setSize(
            width,
            height
        );

    }

    // ========================================================
    // ANIMATION LOOP
    // ========================================================

    function animate() {

        requestAnimationFrame(
            animate
        );


        const delta =
            Math.min(
                clock.getDelta(),
                0.05
            );


        updateMovement(
            delta
        );


        renderer.render(
            scene,
            camera
        );

    }

    // ========================================================
    // PUBLIC API
    // ========================================================

    window.WebBloxStudio = {

        getScene() {
            return scene;
        },

        getCamera() {
            return camera;
        },

        getRenderer() {
            return renderer;
        },

        getObjects() {
            return objects;
        },

        getSelectedObject() {
            return selectedObject;
        },

        addPart,

        deleteSelected,

        resetCamera,

        focusSelected,

        selectObject,

        clearSelection

    };

    // ========================================================
    // START
    // ========================================================

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
