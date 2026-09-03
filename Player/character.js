/*
 * WebBlox Player Character
 *
 * Stage 3A+
 *
 * Existing file:
 * /Player/character.js
 *
 * Character system:
 * - Classic blocky R6-style character
 * - Rectangular body parts
 * - Connected limbs
 * - Proper shoulder/hip pivots
 * - Simple classic face
 * - No bacon hair
 * - No capsule geometry
 * - Humanoid-style runtime data
 * - Character spawning
 * - Character cleanup
 * - Animation-compatible body part aliases
 *
 * Existing public API preserved:
 * - WebBloxPlayer.createCharacter()
 * - WebBloxPlayer.destroyCharacter()
 */

(() => {
    "use strict";


    // ============================================================
    // PLAYER SYSTEM
    // ============================================================

    if (
        !window.WebBloxPlayer
    ) {

        window.WebBloxPlayer = {};

    }


    const PlayerSystem =
        window.WebBloxPlayer;


    // ============================================================
    // THREE
    // ============================================================

    let THREE =
        null;


    function getThree() {

        if (
            window.THREE
        ) {

            THREE =
                window.THREE;

            return THREE;

        }


        return null;

    }


    // ============================================================
    // MATERIAL
    // ============================================================

    function makeMaterial(
        color,
        roughness = 0.8,
        transparency = 0
    ) {

        const material =
            new THREE.MeshStandardMaterial({

                color:
                    new THREE.Color(
                        color
                    ),

                roughness,

                metalness:
                    0,

                transparent:
                    transparency > 0,

                opacity:
                    1 -
                    transparency

            });


        return material;

    }


    // ============================================================
    // APPLY MATERIAL PROPERTIES
    // ============================================================

    function applyMaterialProperties(
        material,
        options = {}
    ) {

        if (
            !material
        ) {

            return;

        }


        if (
            options.color
        ) {

            try {

                material.color.set(
                    options.color
                );

            } catch {

                // Ignore invalid colors.

            }

        }


        if (
            Number.isFinite(
                Number(
                    options.transparency
                )
            )
        ) {

            const transparency =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(
                            options.transparency
                        )
                    )
                );


            material.transparent =
                transparency >
                0;


            material.opacity =
                1 -
                transparency;

        }


        if (
            Number.isFinite(
                Number(
                    options.roughness
                )
            )
        ) {

            material.roughness =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(
                            options.roughness
                        )
                    )
                );

        }

    }


    // ============================================================
    // CREATE PART
    // ============================================================

    function createPart(
        name,
        size,
        color,
        position,
        parent,
        options = {}
    ) {

        const geometry =
            new THREE.BoxGeometry(

                size.x,

                size.y,

                size.z

            );


        const material =
            makeMaterial(

                color,

                options.roughness ??
                0.8,

                options.transparency ??
                0

            );


        applyMaterialProperties(
            material,
            options
        );


        const mesh =
            new THREE.Mesh(

                geometry,

                material

            );


        mesh.name =
            name;


        mesh.position.set(

            position.x,

            position.y,

            position.z

        );


        mesh.castShadow =
            options.castShadow !==
            false;


        mesh.receiveShadow =
            options.receiveShadow !==
            false;


        mesh.userData =
            mesh.userData ||
            {};


        mesh.userData.characterPart =
            true;


        mesh.userData.characterPartName =
            name;


        mesh.userData.canCollide =
            options.canCollide !==
            false;


        mesh.userData.transparency =
            Number(
                options.transparency ||
                0
            );


        parent.add(
            mesh
        );


        return mesh;

    }


    // ============================================================
    // CREATE PIVOT
    // ============================================================

    function createPivot(
        name,
        position,
        parent
    ) {

        const pivot =
            new THREE.Group();


        pivot.name =
            name;


        pivot.position.set(

            position.x,

            position.y,

            position.z

        );


        pivot.userData =
            pivot.userData ||
            {};


        pivot.userData.characterJoint =
            true;


        parent.add(
            pivot
        );


        return pivot;

    }


    // ============================================================
    // FACE
    // ============================================================

    function createFace(
        head
    ) {

        const face =
            new THREE.Group();


        face.name =
            "Face";


        face.userData =
            face.userData ||
            {};


        face.userData.characterFace =
            true;


        // --------------------------------------------------------
        // Face material
        // --------------------------------------------------------

        const eyeMaterial =
            new THREE.MeshBasicMaterial({

                color:
                    0x111111

            });


        // --------------------------------------------------------
        // Eyes
        // --------------------------------------------------------

        const eyeGeometry =
            new THREE.BoxGeometry(

                0.18,

                0.18,

                0.035

            );


        const leftEye =
            new THREE.Mesh(

                eyeGeometry,

                eyeMaterial

            );


        leftEye.name =
            "LeftEye";


        leftEye.position.set(

            -0.36,

            0.08,

            0.515

        );


        leftEye.userData.characterFace =
            true;


        face.add(
            leftEye
        );


        const rightEye =
            new THREE.Mesh(

                eyeGeometry.clone(),

                eyeMaterial

            );


        rightEye.name =
            "RightEye";


        rightEye.position.set(

            0.36,

            0.08,

            0.515

        );


        rightEye.userData.characterFace =
            true;


        face.add(
            rightEye
        );


        // --------------------------------------------------------
        // Smile
        // --------------------------------------------------------
        //
        // Keep this rectangular instead of TorusGeometry so the
        // face stays visually blocky like the character.
        // --------------------------------------------------------

        const smile =
            new THREE.Mesh(

                new THREE.BoxGeometry(

                    0.45,

                    0.065,

                    0.035

                ),

                eyeMaterial

            );


        smile.name =
            "Smile";


        smile.position.set(

            0,

            -0.19,

            0.515

        );


        smile.userData.characterFace =
            true;


        face.add(
            smile
        );


        head.add(
            face
        );


        return face;

    }


    // ============================================================
    // CHARACTER COLORS
    // ============================================================

    function getCharacterColors(
        options
    ) {

        return {

            skin:

                options.skinColor ||
                "#F2C6A8",

            shirt:

                options.shirtColor ||
                "#3B82F6",

            pants:

                options.pantsColor ||
                "#303030",

            shoes:

                options.shoeColor ||
                "#202020"

        };

    }


    // ============================================================
    // CREATE CHARACTER
    // ============================================================

    function createCharacter(
        options = {}
    ) {

        const THREE_LOCAL =
            getThree();


        if (
            !THREE_LOCAL
        ) {

            console.error(

                "[WebBlox Player] Three.js is not loaded."

            );


            return null;

        }


        // --------------------------------------------------------
        // Root
        // --------------------------------------------------------

        const character =
            new THREE_LOCAL.Group();


        character.name =
            options.name ||
            "Character";


        character.userData =
            character.userData ||
            {};


        character.userData.isCharacter =
            true;


        character.userData.playerId =
            options.playerId ||
            null;


        character.userData.characterType =
            "R6";


        character.userData.rigType =
            "R6";


        // --------------------------------------------------------
        // Humanoid data
        // --------------------------------------------------------

        const playerState =
            PlayerSystem?.state ||
            {};


        const playerSettings =
            playerState.settings ||
            {};


        const humanoid = {

            name:
                "Humanoid",

            rigType:
                "R6",

            health:
                100,

            maxHealth:
                100,

            walkSpeed:
                Number(
                    playerSettings.walkSpeed ||
                    options.walkSpeed ||
                    12
                ),

            jumpPower:
                Number(
                    playerSettings.jumpPower ||
                    options.jumpPower ||
                    11
                ),

            autoRotate:
                options.autoRotate !==
                false,

            state:
                "Idle",

            dead:
                false

        };


        character.userData.humanoid =
            humanoid;


        // --------------------------------------------------------
        // Colors
        // --------------------------------------------------------

        const colors =
            getCharacterColors(
                options
            );


        // ========================================================
        // TORSO
        // ========================================================

        /*
         * Classic blocky proportions:
         *
         * torso = 2 x 2 x 1
         * head  = 2 x 1 x 1
         * arms  = 1 x 2 x 1
         * legs  = 1 x 2 x 1
         *
         * The character is exactly 5 studs tall.
         */


        const torso =
            createPart(

                "Torso",

                {

                    x:
                        2,

                    y:
                        2,

                    z:
                        1

                },

                colors.shirt,

                {

                    x:
                        0,

                    y:
                        3,

                    z:
                        0

                },

                character,

                {

                    canCollide:
                        false

                }

            );


        // ========================================================
        // HEAD
        // ========================================================

        const head =
            createPart(

                "Head",

                {

                    x:
                        2,

                    y:
                        1,

                    z:
                        1

                },

                colors.skin,

                {

                    x:
                        0,

                    y:
                        4.5,

                    z:
                        0

                },

                character,

                {

                    canCollide:
                        false

                }

            );


        head.userData.isHead =
            true;


        createFace(
            head
        );


        // ========================================================
        // SHOULDERS
        // ========================================================

        /*
         * Pivots live at the torso/arm connection.
         * The arm extends downward from each pivot.
         */


        const leftShoulder =
            createPivot(

                "LeftShoulder",

                {

                    x:
                        -1.5,

                    y:
                        4,

                    z:
                        0

                },

                character

            );


        const leftArm =
            createPart(

                "LeftArm",

                {

                    x:
                        1,

                    y:
                        2,

                    z:
                        1

                },

                colors.skin,

                {

                    x:
                        0,

                    y:
                        -1,

                    z:
                        0

                },

                leftShoulder,

                {

                    canCollide:
                        false

                }

            );


        const rightShoulder =
            createPivot(

                "RightShoulder",

                {

                    x:
                        1.5,

                    y:
                        4,

                    z:
                        0

                },

                character

            );


        const rightArm =
            createPart(

                "RightArm",

                {

                    x:
                        1,

                    y:
                        2,

                    z:
                        1

                },

                colors.skin,

                {

                    x:
                        0,

                    y:
                        -1,

                    z:
                        0

                },

                rightShoulder,

                {

                    canCollide:
                        false

                }

            );


        // ========================================================
        // HIPS
        // ========================================================

        const leftHip =
            createPivot(

                "LeftHip",

                {

                    x:
                        -0.5,

                    y:
                        2,

                    z:
                        0

                },

                character

            );


        const leftLeg =
            createPart(

                "LeftLeg",

                {

                    x:
                        1,

                    y:
                        2,

                    z:
                        1

                },

                colors.pants,

                {

                    x:
                        0,

                    y:
                        -1,

                    z:
                        0

                },

                leftHip,

                {

                    canCollide:
                        false

                }

            );


        const leftFoot =
            createPart(

                "LeftFoot",

                {

                    x:
                        1,

                    y:
                        0.2,

                    z:
                        1.08

                },

                colors.shoes,

                {

                    x:
                        0,

                    y:
                        -1,

                    z:
                        0.04

                },

                leftHip,

                {

                    canCollide:
                        false

                }

            );


        const rightHip =
            createPivot(

                "RightHip",

                {

                    x:
                        0.5,

                    y:
                        2,

                    z:
                        0

                },

                character

            );


        const rightLeg =
            createPart(

                "RightLeg",

                {

                    x:
                        1,

                    y:
                        2,

                    z:
                        1

                },

                colors.pants,

                {

                    x:
                        0,

                    y:
                        -1,

                    z:
                        0

                },

                rightHip,

                {

                    canCollide:
                        false

                }

            );


        const rightFoot =
            createPart(

                "RightFoot",

                {

                    x:
                        1,

                    y:
                        0.2,

                    z:
                        1.08

                },

                colors.shoes,

                {

                    x:
                        0,

                    y:
                        -1,

                    z:
                        0.04

                },

                rightHip,

                {

                    canCollide:
                        false

                }

            );


        // ========================================================
        // HUMANOID ROOT PART
        // ========================================================

        const rootPart =
            new THREE_LOCAL.Object3D();


        rootPart.name =
            "HumanoidRootPart";


        rootPart.userData =
            rootPart.userData ||
            {};


        rootPart.userData.isRootPart =
            true;


        rootPart.userData.characterPart =
            true;


        rootPart.position.set(

            0,

            0,

            0

        );


        character.add(
            rootPart
        );


        character.userData.rootPart =
            rootPart;


        character.userData.humanoidRootPart =
            rootPart;


        // ========================================================
        // BODY PART REFERENCES
        // ========================================================

        character.userData.bodyParts = {

            head:

                head,

            torso:

                torso,

            upperTorso:

                torso,

            lowerTorso:

                torso,


            leftArm:

                leftArm,

            rightArm:

                rightArm,


            leftUpperArm:

                leftShoulder,

            rightUpperArm:

                rightShoulder,

            leftLowerArm:

                leftShoulder,

            rightLowerArm:

                rightShoulder,

            leftHand:

                leftShoulder,

            rightHand:

                rightShoulder,


            leftUpperLeg:

                leftHip,

            rightUpperLeg:

                rightHip,

            leftLowerLeg:

                leftHip,

            rightLowerLeg:

                rightHip,

            leftFoot:

                leftFoot,

            rightFoot:

                rightFoot,


            leftLeg:

                leftLeg,

            rightLeg:

                rightLeg,


            leftShoulder:

                leftShoulder,

            rightShoulder:

                rightShoulder,

            leftHip:

                leftHip,

            rightHip:

                rightHip

        };


        // ========================================================
        // RAW MESH REFERENCES
        // ========================================================

        character.userData.meshParts = {

            torso:

                torso,

            head:

                head,

            leftArm:

                leftArm,

            rightArm:

                rightArm,

            leftLeg:

                leftLeg,

            rightLeg:

                rightLeg,

            leftFoot:

                leftFoot,

            rightFoot:

                rightFoot

        };


        // ========================================================
        // ANIMATION PIVOTS
        // ========================================================

        character.userData.animationPivots = {

            neck:
                character,

            leftShoulder:
                leftShoulder,

            rightShoulder:
                rightShoulder,

            leftHip:
                leftHip,

            rightHip:
                rightHip

        };


        // ========================================================
        // JOINT DATA
        // ========================================================

        character.userData.joints = {

            waist: {

                parent:
                    "Torso",

                child:
                    "Torso",

                type:
                    "Motor6D"

            },


            neck: {

                parent:
                    "Torso",

                child:
                    "Head",

                type:
                    "Motor6D"

            },


            leftShoulder: {

                parent:
                    "Torso",

                child:
                    "LeftArm",

                type:
                    "Motor6D"

            },


            rightShoulder: {

                parent:
                    "Torso",

                child:
                    "RightArm",

                type:
                    "Motor6D"

            },


            leftHip: {

                parent:
                    "Torso",

                child:
                    "LeftLeg",

                type:
                    "Motor6D"

            },


            rightHip: {

                parent:
                    "Torso",

                child:
                    "RightLeg",

                type:
                    "Motor6D"

            }

        };


        // ========================================================
        // RUNTIME DATA
        // ========================================================

        character.userData.runtime = {

            grounded:
                false,

            velocity: {

                x:
                    0,

                y:
                    0,

                z:
                    0

            },

            spawnPosition: {

                x:
                    0,

                y:
                    0,

                z:
                    0

            },

            alive:
                true

        };


        // ========================================================
        // CHARACTER BOUNDS
        // ========================================================

        character.userData.height =
            5;


        character.userData.width =
            2;


        character.userData.depth =
            1;


        // ========================================================
        // DEFAULT CHARACTER POSITION
        // ========================================================

        character.position.set(

            Number(
                options.x ||
                0
            ),

            Number(
                options.y ||
                0
            ),

            Number(
                options.z ||
                0
            )

        );


        character.userData.runtime
            .spawnPosition = {

                x:
                    character.position.x,

                y:
                    character.position.y,

                z:
                    character.position.z

            };


        // ========================================================
        // COMPATIBILITY UPDATE
        // ========================================================

        character.update =
            function(
                deltaTime
            ) {

                if (
                    typeof deltaTime !==
                    "number"
                ) {

                    return;

                }


                /*
                 * Physics is intentionally handled by physics.js.
                 * This method only exposes a compatibility hook for
                 * older WebBlox systems.
                 */


                if (
                    character.userData.runtime
                ) {

                    character.userData.runtime.velocity = {

                        x:
                            Number(
                                PlayerSystem?.state
                                    ?.velocity?.x ||
                                0
                            ),

                        y:
                            Number(
                                PlayerSystem?.state
                                    ?.velocity?.y ||
                                0
                            ),

                        z:
                            Number(
                                PlayerSystem?.state
                                    ?.velocity?.z ||
                                0
                            )

                    };

                }

            };


        // ========================================================
        // RETURN
        // ========================================================

        return character;

    }


    // ============================================================
    // DESTROY CHARACTER
    // ============================================================

    function destroyCharacter(
        character
    ) {

        if (
            !character
        ) {

            return;

        }


        character.traverse(
            child => {

                if (
                    child.geometry
                ) {

                    child.geometry.dispose();

                }


                if (
                    child.material
                ) {

                    if (
                        Array.isArray(
                            child.material
                        )
                    ) {

                        child.material.forEach(
                            material => {

                                if (
                                    material &&
                                    typeof material.dispose ===
                                    "function"
                                ) {

                                    material.dispose();

                                }

                            }
                        );

                    } else if (

                        typeof child.material.dispose ===
                        "function"

                    ) {

                        child.material.dispose();

                    }

                }

            }
        );


        if (
            character.parent
        ) {

            character.parent.remove(
                character
            );

        }

    }


    // ============================================================
    // FIND CHARACTER PART
    // ============================================================

    function findPart(
        character,
        name
    ) {

        if (
            !character ||
            !name
        ) {

            return null;

        }


        let result =
            null;


        character.traverse(
            child => {

                if (
                    result
                ) {

                    return;

                }


                if (
                    child.name ===
                    name
                ) {

                    result =
                        child;

                }

            }
        );


        return result;

    }


    // ============================================================
    // SET BODY COLOR
    // ============================================================

    function setBodyColor(
        character,
        partName,
        color
    ) {

        const part =
            findPart(
                character,
                partName
            );


        if (
            !part?.material
        ) {

            return false;

        }


        const materials =
            Array.isArray(
                part.material
            )

                ? part.material

                : [part.material];


        materials.forEach(
            material => {

                try {

                    material.color.set(
                        color
                    );

                } catch {

                    // Ignore invalid color.

                }

            }
        );


        return true;

    }


    // ============================================================
    // SET TRANSPARENCY
    // ============================================================

    function setTransparency(
        character,
        transparency
    ) {

        if (
            !character
        ) {

            return false;

        }


        const value =
            Math.max(

                0,

                Math.min(

                    1,

                    Number(
                        transparency
                    ) || 0

                )

            );


        character.traverse(
            child => {

                if (
                    !child.isMesh ||
                    !child.material
                ) {

                    return;

                }


                const materials =
                    Array.isArray(
                        child.material
                    )

                        ? child.material

                        : [child.material];


                materials.forEach(
                    material => {

                        material.transparent =
                            value >
                            0;


                        material.opacity =
                            1 -
                            value;


                        material.depthWrite =
                            value <
                            1;

                    }
                );


                child.userData.transparency =
                    value;

            }
        );


        character.userData.transparency =
            value;


        return true;

    }


    // ============================================================
    // SET CHARACTER POSITION
    // ============================================================

    function setPosition(
        character,
        x,
        y,
        z
    ) {

        if (
            !character
        ) {

            return false;

        }


        character.position.set(

            Number(
                x
            ) || 0,

            Number(
                y
            ) || 0,

            Number(
                z
            ) || 0

        );


        if (
            character.userData.runtime
        ) {

            character.userData.runtime
                .spawnPosition = {

                    x:
                        character.position.x,

                    y:
                        character.position.y,

                    z:
                        character.position.z

                };

        }


        return true;

    }


    // ============================================================
    // SET HUMANOID VALUES
    // ============================================================

    function configureHumanoid(
        character,
        values = {}
    ) {

        if (
            !character?.userData?.humanoid
        ) {

            return false;

        }


        const humanoid =
            character.userData.humanoid;


        if (
            values.walkSpeed !==
            undefined
        ) {

            humanoid.walkSpeed =
                Math.max(

                    0,

                    Number(
                        values.walkSpeed
                    ) ||
                    0

                );

        }


        if (
            values.jumpPower !==
            undefined
        ) {

            humanoid.jumpPower =
                Math.max(

                    0,

                    Number(
                        values.jumpPower
                    ) ||
                    0

                );

        }


        if (
            values.health !==
            undefined
        ) {

            humanoid.health =
                Math.max(

                    0,

                    Math.min(

                        humanoid.maxHealth,

                        Number(
                            values.health
                        ) ||
                        0

                    )

                );

        }


        if (
            values.maxHealth !==
            undefined
        ) {

            humanoid.maxHealth =
                Math.max(

                    1,

                    Number(
                        values.maxHealth
                    ) ||
                    1

                );


            humanoid.health =
                Math.min(

                    humanoid.health,

                    humanoid.maxHealth

                );

        }


        if (
            values.autoRotate !==
            undefined
        ) {

            humanoid.autoRotate =
                Boolean(
                    values.autoRotate
                );

        }


        return true;

    }


    // ============================================================
    // PUBLIC API
    // ============================================================

    PlayerSystem.createCharacter =
        createCharacter;


    PlayerSystem.destroyCharacter =
        destroyCharacter;


    PlayerSystem.findCharacterPart =
        findPart;


    PlayerSystem.setBodyColor =
        setBodyColor;


    PlayerSystem.setTransparency =
        setTransparency;


    PlayerSystem.setCharacterPosition =
        setPosition;


    PlayerSystem.configureHumanoid =
        configureHumanoid;


    PlayerSystem.Character =
        {

            create:
                createCharacter,

            destroy:
                destroyCharacter,

            findPart,

            setBodyColor,

            setTransparency,

            setPosition,

            configureHumanoid

        };


    // ============================================================
    // READY
    // ============================================================

    console.log(
        "[WebBlox Character] Classic blocky R6 character system loaded."
    );


    console.log(
        "[WebBlox Character] Capsule geometry disabled."
    );


    console.log(
        "[WebBlox Character] Bacon hair disabled."
    );


    console.log(
        "[WebBlox Character] Animation pivots enabled."
    );

})();
