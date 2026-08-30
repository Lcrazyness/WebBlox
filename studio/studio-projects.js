/*
 * WebBlox Studio - Project Manager
 * Stage 1
 *
 * Handles:
 * - Project selection screen
 * - Create project
 * - Open project
 * - Delete project
 * - Project title
 * - Optional description
 * - Local project storage
 * - Returning to project selection
 *
 * Existing Studio editor remains untouched.
 */

(() => {
    "use strict";

    const STORAGE_KEY = "webblox_studio_projects_v2";
    const ACTIVE_KEY = "webblox_studio_active_project_v2";

    let projects = [];
    let activeProject = null;

    // ============================================================
    // STORAGE
    // ============================================================

    function loadProjects() {
        try {
            const stored =
                localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                projects = [];
                return projects;
            }

            const parsed = JSON.parse(stored);

            projects =
                Array.isArray(parsed)
                    ? parsed
                    : [];

        } catch (error) {
            console.error(
                "[WebBlox Studio] Could not load projects:",
                error
            );

            projects = [];
        }

        return projects;
    }

    function saveProjects() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(projects)
        );
    }

    function getActiveProjectId() {
        return localStorage.getItem(
            ACTIVE_KEY
        );
    }

    function setActiveProjectId(id) {
        if (id) {
            localStorage.setItem(
                ACTIVE_KEY,
                id
            );
        } else {
            localStorage.removeItem(
                ACTIVE_KEY
            );
        }
    }

    // ============================================================
    // PROJECT DATA
    // ============================================================

    function createProjectObject(
        title,
        description
    ) {
        const now =
            new Date().toISOString();

        return {
            id:
                "project_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2, 9),

            title:
                title.trim(),

            description:
                description.trim(),

            icon:
                null,

            createdAt:
                now,

            updatedAt:
                now,

            placeData: {
                version: 1,

                name:
                    title.trim(),

                description:
                    description.trim(),

                /*
                 * Only real placeable objects go here.
                 * Workspace / Camera / Lighting / StarterPlayer /
                 * StarterGui are structural nodes that Studio's
                 * Explorer already renders on its own — they are
                 * NOT Parts and must not be fed into createObject(),
                 * or they'd show up as stray gray boxes at the origin.
                 */
                objects: [
                    {
                        id: "defaultPart",
                        type: "Part",
                        name: "Baseplate",
                        position: { x: 0, y: -1, z: 0 },
                        size: { x: 20, y: 1, z: 20 },
                        color: "#808080",
                        anchored: true,
                        canCollide: true
                    },

                    {
                        id: "spawn",
                        type: "SpawnLocation",
                        name: "Spawn",
                        position: { x: 0, y: 0, z: 0 },
                        size: { x: 4, y: 1, z: 4 },
                        color: "#22c55e",
                        anchored: true,
                        canCollide: true
                    }
                ]
            }
        };
    }

    // ============================================================
    // PROJECT SELECTION UI
    // ============================================================

    function createProjectScreen() {
        if (
            document.getElementById(
                "webbloxProjectScreen"
            )
        ) {
            return;
        }

        const screen =
            document.createElement("div");

        screen.id =
            "webbloxProjectScreen";

        screen.innerHTML = `
            <div class="webblox-project-background">

                <div class="webblox-project-window">

                    <div class="webblox-project-header">

                        <div class="webblox-project-brand">

                            <div class="webblox-project-logo">
                                W
                            </div>

                            <div>
                                <div class="webblox-project-title">
                                    WebBlox Studio
                                </div>

                                <div class="webblox-project-subtitle">
                                    Projects
                                </div>
                            </div>

                        </div>

                    </div>

                    <div class="webblox-project-body">

                        <div class="webblox-project-heading">
                            <h1>
                                Your Projects
                            </h1>

                            <p>
                                Create a new experience or open an existing one.
                            </p>
                        </div>

                        <div class="webblox-project-actions">

                            <button
                                id="webbloxCreateProject"
                                class="webblox-project-action primary"
                                type="button"
                            >
                                <span class="webblox-action-icon">
                                    ＋
                                </span>

                                <span>
                                    <strong>
                                        Create New Project
                                    </strong>

                                    <small>
                                        Start a new WebBlox experience
                                    </small>
                                </span>
                            </button>

                        </div>

                        <div class="webblox-project-list-header">

                            <span>
                                Recent Projects
                            </span>

                            <span
                                id="webbloxProjectCount"
                            >
                                0 projects
                            </span>

                        </div>

                        <div
                            id="webbloxProjectList"
                            class="webblox-project-list"
                        ></div>

                    </div>

                </div>

            </div>
        `;

        document.body.appendChild(
            screen
        );

        injectProjectStyles();

        document
            .getElementById(
                "webbloxCreateProject"
            )
            .addEventListener(
                "click",
                showCreateProject
            );

        renderProjectList();
    }

    // ============================================================
    // PROJECT LIST
    // ============================================================

    function renderProjectList() {
        const list =
            document.getElementById(
                "webbloxProjectList"
            );

        const count =
            document.getElementById(
                "webbloxProjectCount"
            );

        if (!list) {
            return;
        }

        loadProjects();

        if (count) {
            count.textContent =
                `${projects.length} ${
                    projects.length === 1
                        ? "project"
                        : "projects"
                }`;
        }

        if (!projects.length) {
            list.innerHTML = `
                <div class="webblox-project-empty">

                    <div class="webblox-project-empty-icon">
                        ▣
                    </div>

                    <strong>
                        No projects yet
                    </strong>

                    <span>
                        Create your first WebBlox experience.
                    </span>

                </div>
            `;

            return;
        }

        const sorted =
            [...projects].sort(
                (a, b) =>
                    new Date(
                        b.updatedAt
                    ) -
                    new Date(
                        a.updatedAt
                    )
            );

        list.innerHTML =
            sorted
                .map(
                    project =>
                        projectCard(project)
                )
                .join("");

        list
            .querySelectorAll(
                "[data-project-open]"
            )
            .forEach(
                button => {
                    button.addEventListener(
                        "click",
                        () => {
                            openProject(
                                button.dataset.projectOpen
                            );
                        }
                    );
                }
            );

        list
            .querySelectorAll(
                "[data-project-delete]"
            )
            .forEach(
                button => {
                    button.addEventListener(
                        "click",
                        event => {
                            event.stopPropagation();

                            deleteProject(
                                button.dataset.projectDelete
                            );
                        }
                    );
                }
            );
    }

    function projectCard(project) {
        const title =
            escapeHTML(
                project.title ||
                "Untitled Project"
            );

        const description =
            escapeHTML(
                project.description ||
                "No description"
            );

        const updated =
            formatDate(
                project.updatedAt
            );

        return `
            <div
                class="webblox-project-card"
                data-project-open="${escapeHTML(project.id)}"
            >

                <div class="webblox-project-card-icon">
                    ${
                        project.icon
                            ? `
                                <img
                                    src="${escapeHTML(project.icon)}"
                                    alt=""
                                >
                              `
                            : "W"
                    }
                </div>

                <div class="webblox-project-card-info">

                    <strong>
                        ${title}
                    </strong>

                    <span>
                        ${description}
                    </span>

                    <small>
                        Updated ${updated}
                    </small>

                </div>

                <div class="webblox-project-card-actions">

                    <button
                        type="button"
                        data-project-open="${escapeHTML(project.id)}"
                        title="Open project"
                    >
                        Open
                    </button>

                    <button
                        type="button"
                        class="danger"
                        data-project-delete="${escapeHTML(project.id)}"
                        title="Delete project"
                    >
                        ×
                    </button>

                </div>

            </div>
        `;
    }

    // ============================================================
    // CREATE PROJECT
    // ============================================================

    function showCreateProject() {
        if (
            document.getElementById(
                "webbloxCreateModal"
            )
        ) {
            return;
        }

        const modal =
            document.createElement("div");

        modal.id =
            "webbloxCreateModal";

        modal.innerHTML = `
            <div class="webblox-modal-backdrop">

                <div
                    class="webblox-create-modal"
                    role="dialog"
                    aria-modal="true"
                >

                    <div class="webblox-modal-header">

                        <div>
                            <h2>
                                Create New Project
                            </h2>

                            <p>
                                Start a new WebBlox experience.
                            </p>
                        </div>

                        <button
                            id="webbloxCloseCreate"
                            type="button"
                            class="webblox-modal-close"
                        >
                            ×
                        </button>

                    </div>

                    <div class="webblox-modal-content">

                        <label>
                            <span>
                                Project Title
                                <b>*</b>
                            </span>

                            <input
                                id="webbloxProjectTitle"
                                type="text"
                                maxlength="100"
                                autocomplete="off"
                                placeholder="My Awesome Game"
                            >

                            <small>
                                A title is required.
                            </small>
                        </label>

                        <label>
                            <span>
                                Description
                                <em>
                                    Optional
                                </em>
                            </span>

                            <textarea
                                id="webbloxProjectDescription"
                                maxlength="1000"
                                placeholder="Describe your experience..."
                            ></textarea>
                        </label>

                        <div
                            id="webbloxCreateError"
                            class="webblox-create-error"
                        ></div>

                    </div>

                    <div class="webblox-modal-footer">

                        <button
                            id="webbloxCancelCreate"
                            type="button"
                            class="webblox-secondary-button"
                        >
                            Cancel
                        </button>

                        <button
                            id="webbloxConfirmCreate"
                            type="button"
                            class="webblox-primary-button"
                        >
                            Create Project
                        </button>

                    </div>

                </div>

            </div>
        `;

        document.body.appendChild(
            modal
        );

        const titleInput =
            document.getElementById(
                "webbloxProjectTitle"
            );

        document
            .getElementById(
                "webbloxCloseCreate"
            )
            .addEventListener(
                "click",
                closeCreateProject
            );

        document
            .getElementById(
                "webbloxCancelCreate"
            )
            .addEventListener(
                "click",
                closeCreateProject
            );

        document
            .getElementById(
                "webbloxConfirmCreate"
            )
            .addEventListener(
                "click",
                confirmCreateProject
            );

        modal
            .querySelector(
                ".webblox-modal-backdrop"
            )
            .addEventListener(
                "click",
                event => {
                    if (
                        event.target ===
                        event.currentTarget
                    ) {
                        closeCreateProject();
                    }
                }
            );

        titleInput.focus();

        titleInput.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Enter"
                ) {
                    confirmCreateProject();
                }

                if (
                    event.key ===
                    "Escape"
                ) {
                    closeCreateProject();
                }
            }
        );
    }

    function closeCreateProject() {
        const modal =
            document.getElementById(
                "webbloxCreateModal"
            );

        if (modal) {
            modal.remove();
        }
    }

    function confirmCreateProject() {
        const titleInput =
            document.getElementById(
                "webbloxProjectTitle"
            );

        const descriptionInput =
            document.getElementById(
                "webbloxProjectDescription"
            );

        const error =
            document.getElementById(
                "webbloxCreateError"
            );

        const title =
            titleInput
                ? titleInput.value.trim()
                : "";

        const description =
            descriptionInput
                ? descriptionInput.value.trim()
                : "";

        /*
         * TITLE IS REQUIRED.
         */
        if (!title) {
            if (error) {
                error.textContent =
                    "Please enter a project title.";
            }

            titleInput.focus();

            return;
        }

        if (title.length > 100) {
            if (error) {
                error.textContent =
                    "Project title must be 100 characters or less.";
            }

            return;
        }

        loadProjects();

        const project =
            createProjectObject(
                title,
                description
            );

        projects.push(
            project
        );

        saveProjects();

        setActiveProjectId(
            project.id
        );

        activeProject =
            project;

        closeCreateProject();

        enterStudio(
            project
        );
    }

    // ============================================================
    // OPEN PROJECT
    // ============================================================

    function openProject(id) {
        loadProjects();

        const project =
            projects.find(
                item =>
                    item.id === id
            );

        if (!project) {
            alert(
                "That project could not be found."
            );

            renderProjectList();

            return;
        }

        project.updatedAt =
            new Date().toISOString();

        saveProjects();

        setActiveProjectId(
            project.id
        );

        activeProject =
            project;

        enterStudio(
            project
        );
    }

    // ============================================================
    // DELETE PROJECT
    // ============================================================

    function deleteProject(id) {
        loadProjects();

        const project =
            projects.find(
                item =>
                    item.id === id
            );

        if (!project) {
            return;
        }

        const confirmed =
            confirm(
                `Delete "${project.title}"?\n\nThis will permanently remove the local project.`
            );

        if (!confirmed) {
            return;
        }

        projects =
            projects.filter(
                item =>
                    item.id !== id
            );

        saveProjects();

        if (
            getActiveProjectId() ===
            id
        ) {
            setActiveProjectId(
                null
            );
        }

        renderProjectList();
    }

    // ============================================================
    // PERSIST EDITOR DATA BACK TO THE ACTIVE PROJECT
    // ============================================================

    function updateActiveProjectPlaceData(placeData) {
        loadProjects();

        const id =
            getActiveProjectId();

        if (!id) {
            return false;
        }

        const project =
            projects.find(
                item =>
                    item.id === id
            );

        if (!project) {
            return false;
        }

        project.placeData =
            placeData;

        project.updatedAt =
            new Date().toISOString();

        saveProjects();

        activeProject =
            project;

        return true;
    }


    // ============================================================
    // ENTER EDITOR
    // ============================================================

    function enterStudio(project) {
        const screen =
            document.getElementById(
                "webbloxProjectScreen"
            );

        if (screen) {
            screen.classList.add(
                "webblox-project-closing"
            );

            setTimeout(
                () => {
                    screen.remove();
                },
                180
            );
        }

        /*
         * Tell the existing Studio about
         * the selected project.
         */
        window.WebBloxActiveProject =
            project;

        document.body.dataset.projectId =
            project.id;

        document.body.dataset.projectTitle =
            project.title;

        /*
         * Update title if the existing
         * Studio has a project-title element.
         */
        updateStudioTitle(
            project
        );

        /*
         * Remove the old permanent welcome
         * overlay if it exists.
         *
         * This does NOT remove the editor.
         */
        const welcome =
            document.getElementById(
                "viewportWelcome"
            );

        if (welcome) {
            welcome.classList.add(
                "webblox-hidden-welcome"
            );
        }

        /*
         * Tell existing Studio code
         * that a project was selected.
         */
        document.dispatchEvent(
            new CustomEvent(
                "webblox:project-opened",
                {
                    detail: {
                        project
                    }
                }
            )
        );

        console.log(
            `[WebBlox Studio] Opened project: ${project.title}`
        );
    }

    function updateStudioTitle(project) {
        const candidates = [
            "#projectTitle",
            "#gameTitle",
            ".studio-project-title",
            "[data-project-title]"
        ];

        for (
            const selector
            of candidates
        ) {
            const element =
                document.querySelector(
                    selector
                );

            if (element) {
                element.textContent =
                    project.title;

                break;
            }
        }

        document.title =
            `${project.title} - WebBlox Studio`;
    }

    // ============================================================
    // RETURN TO PROJECTS
    // ============================================================

    function showProjectSelection() {
        const existing =
            document.getElementById(
                "webbloxProjectScreen"
            );

        if (existing) {
            renderProjectList();

            return;
        }

        createProjectScreen();
    }

    // ============================================================
    // FILE MENU INTEGRATION
    // ============================================================

    function setupFileIntegration() {
        /*
         * Existing New button.
         */
        const newButton =
            document.getElementById(
                "newGameButton"
            );

        if (newButton) {
            newButton.addEventListener(
                "click",
                event => {
                    event.stopImmediatePropagation();

                    showCreateProject();
                },
                true
            );
        }

        /*
         * Existing Open button.
         */
        const openButton =
            document.getElementById(
                "openGameButton"
            );

        if (openButton) {
            openButton.addEventListener(
                "click",
                event => {
                    event.stopImmediatePropagation();

                    showProjectSelection();
                },
                true
            );
        }
    }

    // ============================================================
    // WELCOME OVERLAY
    // ============================================================

    function removeOldWelcome() {
        const welcome =
            document.getElementById(
                "viewportWelcome"
            );

        if (!welcome) {
            return;
        }

        /*
         * We don't permanently delete the element.
         * The existing Studio can still reference it.
         * Instead, make sure it cannot remain
         * stuck over the editor.
         */
        welcome.classList.add(
            "webblox-hidden-welcome"
        );
    }

    // ============================================================
    // CSS
    // ============================================================

    function injectProjectStyles() {
        if (
            document.getElementById(
                "webbloxProjectStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "webbloxProjectStyles";

        style.textContent = `
            #webbloxProjectScreen {
                position: fixed;
                inset: 0;
                z-index: 999999;
                font-family:
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    Arial,
                    sans-serif;
            }

            .webblox-project-background {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background:
                    radial-gradient(
                        circle at 50% 0%,
                        #252525 0%,
                        #151515 42%,
                        #0d0d0d 100%
                    );
                color: #ffffff;
            }

            .webblox-project-window {
                width: min(
                    960px,
                    calc(100vw - 48px)
                );

                height: min(
                    720px,
                    calc(100vh - 48px)
                );

                min-height: 500px;

                display: flex;
                flex-direction: column;

                overflow: hidden;

                background: #181818;

                border:
                    1px solid
                    #353535;

                border-radius: 12px;

                box-shadow:
                    0 30px 80px
                    rgba(0, 0, 0, .55);
            }

            .webblox-project-header {
                height: 72px;
                flex-shrink: 0;

                display: flex;
                align-items: center;

                padding:
                    0 24px;

                border-bottom:
                    1px solid
                    #303030;

                background: #1d1d1d;
            }

            .webblox-project-brand {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .webblox-project-logo {
                width: 40px;
                height: 40px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 8px;

                background: #ffffff;
                color: #111111;

                font-size: 21px;
                font-weight: 800;
            }

            .webblox-project-title {
                font-size: 16px;
                font-weight: 700;
            }

            .webblox-project-subtitle {
                margin-top: 2px;

                font-size: 12px;

                color: #999999;
            }

            .webblox-project-body {
                flex: 1;
                min-height: 0;

                overflow-y: auto;

                padding: 32px;
            }

            .webblox-project-heading h1 {
                margin: 0;

                font-size: 27px;
                font-weight: 700;
            }

            .webblox-project-heading p {
                margin:
                    7px 0 24px;

                color: #999999;

                font-size: 14px;
            }

            .webblox-project-actions {
                margin-bottom: 30px;
            }

            .webblox-project-action {
                width: 100%;
                min-height: 76px;

                display: flex;
                align-items: center;

                gap: 16px;

                padding:
                    14px 18px;

                border:
                    1px solid
                    #3d3d3d;

                border-radius: 9px;

                background: #222222;

                color: #ffffff;

                text-align: left;

                cursor: pointer;

                transition:
                    background .12s ease,
                    border-color .12s ease,
                    transform .12s ease;
            }

            .webblox-project-action:hover {
                background: #292929;
                border-color: #5a5a5a;
                transform: translateY(-1px);
            }

            .webblox-project-action.primary {
                border-color: #5b5b5b;
            }

            .webblox-action-icon {
                width: 42px;
                height: 42px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 8px;

                background: #ffffff;
                color: #111111;

                font-size: 24px;
                font-weight: 600;
            }

            .webblox-project-action strong {
                display: block;
                font-size: 14px;
            }

            .webblox-project-action small {
                display: block;

                margin-top: 4px;

                color: #999999;
                font-size: 12px;
            }

            .webblox-project-list-header {
                display: flex;
                align-items: center;
                justify-content: space-between;

                margin-bottom: 10px;

                color: #cccccc;

                font-size: 13px;
                font-weight: 600;
            }

            #webbloxProjectCount {
                color: #777777;
                font-weight: 400;
            }

            .webblox-project-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .webblox-project-card {
                min-height: 82px;

                display: flex;
                align-items: center;

                gap: 14px;

                padding: 12px 14px;

                border:
                    1px solid
                    #303030;

                border-radius: 8px;

                background: #202020;

                cursor: pointer;

                transition:
                    background .12s ease,
                    border-color .12s ease;
            }

            .webblox-project-card:hover {
                background: #272727;
                border-color: #484848;
            }

            .webblox-project-card-icon {
                width: 58px;
                height: 58px;

                flex-shrink: 0;

                display: flex;
                align-items: center;
                justify-content: center;

                overflow: hidden;

                border-radius: 8px;

                background: #303030;

                color: #ffffff;

                font-size: 25px;
                font-weight: 800;
            }

            .webblox-project-card-icon img {
                width: 100%;
                height: 100%;

                object-fit: cover;
            }

            .webblox-project-card-info {
                min-width: 0;
                flex: 1;
            }

            .webblox-project-card-info strong {
                display: block;

                overflow: hidden;

                text-overflow: ellipsis;
                white-space: nowrap;

                font-size: 14px;
            }

            .webblox-project-card-info span {
                display: block;

                margin-top: 4px;

                overflow: hidden;

                color: #999999;

                text-overflow: ellipsis;
                white-space: nowrap;

                font-size: 12px;
            }

            .webblox-project-card-info small {
                display: block;

                margin-top: 6px;

                color: #666666;

                font-size: 10px;
            }

            .webblox-project-card-actions {
                display: flex;
                align-items: center;
                gap: 7px;
            }

            .webblox-project-card-actions button {
                border:
                    1px solid
                    #444444;

                border-radius: 6px;

                padding:
                    7px 12px;

                background: #292929;

                color: #eeeeee;

                cursor: pointer;
            }

            .webblox-project-card-actions button:hover {
                background: #353535;
            }

            .webblox-project-card-actions button.danger {
                width: 31px;
                height: 31px;

                padding: 0;

                color: #bbbbbb;
                font-size: 17px;
            }

            .webblox-project-card-actions button.danger:hover {
                color: #ffffff;
                background: #542b2b;
                border-color: #744040;
            }

            .webblox-project-empty {
                min-height: 210px;

                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;

                gap: 8px;

                border:
                    1px dashed
                    #363636;

                border-radius: 9px;

                color: #888888;
            }

            .webblox-project-empty-icon {
                margin-bottom: 4px;

                font-size: 32px;
                opacity: .65;
            }

            .webblox-project-empty strong {
                color: #cccccc;
                font-size: 14px;
            }

            .webblox-project-empty span {
                font-size: 12px;
            }

            #webbloxCreateModal {
                position: fixed;
                inset: 0;
                z-index: 1000000;
            }

            .webblox-modal-backdrop {
                position: absolute;
                inset: 0;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 24px;

                background:
                    rgba(0, 0, 0, .7);
            }

            .webblox-create-modal {
                width: min(
                    480px,
                    100%
                );

                overflow: hidden;

                border:
                    1px solid
                    #414141;

                border-radius: 10px;

                background: #1c1c1c;

                box-shadow:
                    0 25px 70px
                    rgba(0, 0, 0, .55);
            }

            .webblox-modal-header {
                display: flex;
                justify-content: space-between;

                padding:
                    20px 22px;

                border-bottom:
                    1px solid
                    #303030;
            }

            .webblox-modal-header h2 {
                margin: 0;

                font-size: 17px;
            }

            .webblox-modal-header p {
                margin:
                    5px 0 0;

                color: #888888;
                font-size: 12px;
            }

            .webblox-modal-close {
                width: 30px;
                height: 30px;

                border: 0;
                border-radius: 6px;

                background: transparent;

                color: #999999;

                font-size: 20px;

                cursor: pointer;
            }

            .webblox-modal-close:hover {
                background: #2b2b2b;
                color: #ffffff;
            }

            .webblox-modal-content {
                display: flex;
                flex-direction: column;

                gap: 20px;

                padding: 22px;
            }

            .webblox-modal-content label {
                display: flex;
                flex-direction: column;

                gap: 7px;
            }

            .webblox-modal-content label > span {
                color: #dddddd;

                font-size: 12px;
                font-weight: 600;
            }

            .webblox-modal-content label b {
                color: #ffffff;
            }

            .webblox-modal-content label em {
                margin-left: 5px;

                color: #777777;

                font-size: 10px;
                font-style: normal;
                font-weight: 400;
            }

            .webblox-modal-content input,
            .webblox-modal-content textarea {
                width: 100%;
                box-sizing: border-box;

                border:
                    1px solid
                    #3a3a3a;

                border-radius: 6px;

                outline: none;

                background: #111111;

                color: #ffffff;

                font: inherit;
                font-size: 13px;
            }

            .webblox-modal-content input {
                height: 40px;
                padding: 0 11px;
            }

            .webblox-modal-content textarea {
                min-height: 105px;
                padding: 10px 11px;

                resize: vertical;
            }

            .webblox-modal-content input:focus,
            .webblox-modal-content textarea:focus {
                border-color: #777777;
            }

            .webblox-modal-content label small {
                color: #666666;
                font-size: 10px;
            }

            .webblox-create-error {
                min-height: 16px;

                color: #ff8f8f;

                font-size: 12px;
            }

            .webblox-modal-footer {
                display: flex;
                justify-content: flex-end;

                gap: 8px;

                padding:
                    14px 22px;

                border-top:
                    1px solid
                    #303030;

                background: #191919;
            }

            .webblox-secondary-button,
            .webblox-primary-button {
                height: 36px;

                padding:
                    0 15px;

                border-radius: 6px;

                cursor: pointer;

                font-size: 12px;
                font-weight: 600;
            }

            .webblox-secondary-button {
                border:
                    1px solid
                    #3b3b3b;

                background: #252525;
                color: #cccccc;
            }

            .webblox-primary-button {
                border:
                    1px solid
                    #666666;

                background: #ffffff;
                color: #111111;
            }

            .webblox-primary-button:hover {
                background: #e8e8e8;
            }

            .webblox-secondary-button:hover {
                background: #303030;
            }

            .webblox-hidden-welcome {
                display: none !important;
            }

            .webblox-project-closing {
                opacity: 0;
                transition: opacity .18s ease;
            }

            @media (max-width: 700px) {
                .webblox-project-window {
                    width: calc(100vw - 20px);
                    height: calc(100vh - 20px);
                    min-height: 0;
                }

                .webblox-project-body {
                    padding: 20px;
                }

                .webblox-project-card {
                    align-items: flex-start;
                }

                .webblox-project-card-actions {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }

    // ============================================================
    // UTILITIES
    // ============================================================

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

    function formatDate(value) {
        if (!value) {
            return "unknown";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "unknown";
        }

        const now =
            Date.now();

        const difference =
            now -
            date.getTime();

        const minute =
            60 * 1000;

        const hour =
            60 * minute;

        const day =
            24 * hour;

        if (
            difference <
            minute
        ) {
            return "just now";
        }

        if (
            difference <
            hour
        ) {
            return (
                Math.floor(
                    difference / minute
                ) +
                "m ago"
            );
        }

        if (
            difference <
            day
        ) {
            return (
                Math.floor(
                    difference / hour
                ) +
                "h ago"
            );
        }

        if (
            difference <
            7 * day
        ) {
            return (
                Math.floor(
                    difference / day
                ) +
                "d ago"
            );
        }

        return date.toLocaleDateString();
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    function initialize() {
        loadProjects();

        injectProjectStyles();

        createProjectScreen();

        setupFileIntegration();

        /*
         * Always start on project selection.
         * This prevents the old welcome screen from
         * being stuck over the editor.
         */
        removeOldWelcome();

        console.log(
            "[WebBlox Studio] Stage 1 project manager ready."
        );
    }

    /*
     * Wait until the existing Studio DOM has
     * finished loading before adding the project
     * manager.
     */
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );
    } else {
        initialize();
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    window.WebBloxProjects = {
        loadProjects,
        saveProjects,
        createProjectObject,
        showProjectSelection,
        showCreateProject,
        openProject,
        deleteProject,
        getActiveProjectId,
        setActiveProjectId,
        updateActiveProjectPlaceData,

        getActiveProject() {
            return activeProject;
        },

        getProjects() {
            loadProjects();

            return [...projects];
        }
    };

})();
