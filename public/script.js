const Portfolio = (() => {
    const VALID_VIEWS = [
        "all",
        "backend",
        "cloud",
        "system-design",
        "production",
        "product-delivery"
    ];

    const viewDescriptions = {
        all: {
            title: "Engineering Evidence",
            description: "Explore my strongest engineering projects."
        },

        backend: {
            title: "Backend engineering",
            description:
                "API design, application architecture, databases, testing and backend implementation."
        },

        cloud: {
            title: "Cloud / AWS",
            description:
                "AWS architecture, data pipelines, event processing and cloud engineering."
        },

        "system-design": {
            title: "System design",
            description:
                "Architecture decisions, data flow, service boundaries and engineering trade-offs."
        },

        production: {
            title: "Production engineering",
            description:
                "Deployment, Docker, infrastructure, operational concerns and production systems."
        },

        "product-delivery": {
            title: "Product delivery",
            description:
                "Projects taken beyond implementation into usable, deployed or released products."
        }
    };

    let projects = [];
    let buttons = [];

    function init() {
        projects = [...document.querySelectorAll("[data-skills]")];
        buttons = [...document.querySelectorAll("[data-view]")];

        if (!projects.length || !buttons.length) {
            return;
        }

        bindEvents();

        const initialView = getInitialView();

        applyView(initialView, {
            updateUrl: false,
            scroll: false
        });
    }

    function bindEvents() {
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                const view = button.dataset.view;

                applyView(view, {
                    updateUrl: true,
                    scroll: true
                });
            });
        });

        window.addEventListener("popstate", () => {
            const view = getInitialView();

            applyView(view, {
                updateUrl: false,
                scroll: false
            });
        });
    }

    function getInitialView() {
        const params = new URLSearchParams(window.location.search);
        const view = params.get("view");

        return VALID_VIEWS.includes(view) ? view : "all";
    }

    function applyView(
        view,
        {
            updateUrl = true,
            scroll = false
        } = {}
    ) {
        if (!VALID_VIEWS.includes(view)) {
            view = "all";
        }

        updateButtons(view);
        updateProjects(view);
        updateHeading(view);

        if (updateUrl) {
            updateBrowserUrl(view);
        }

        if (scroll) {
            scrollToProjects();
        }

        document.dispatchEvent(
            new CustomEvent("portfolio:view-change", {
                detail: { view }
            })
        );
    }

    function updateButtons(activeView) {
        buttons.forEach((button) => {
            const isActive = button.dataset.view === activeView;

            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function updateProjects(view) {
        const container = findProjectContainer();

        if (!container) {
            return;
        }

        projects.forEach((project) => {
            const skills = getSkills(project);

            const matches =
                view === "all" ||
                skills.includes(view);

            project.classList.toggle(
                "project-relevant",
                matches
            );

            project.classList.toggle(
                "project-secondary",
                view !== "all" && !matches
            );

            project.dataset.relevance = matches ? "primary" : "secondary";
        });

        if (view !== "all") {
            reorderProjects(container);
        } else {
            restoreDefaultOrder(container);
        }
    }

    function getSkills(project) {
        return project.dataset.skills
            .split(/\s+/)
            .filter(Boolean);
    }

    function reorderProjects(container) {
        const sorted = [...projects].sort((a, b) => {
            const aRelevant =
                a.dataset.relevance === "primary" ? 0 : 1;

            const bRelevant =
                b.dataset.relevance === "primary" ? 0 : 1;

            return aRelevant - bRelevant;
        });

        sorted.forEach((project) => {
            container.appendChild(project);
        });
    }

    function restoreDefaultOrder(container) {
        [...projects]
            .sort((a, b) => {
                return (
                    Number(a.dataset.originalOrder) -
                    Number(b.dataset.originalOrder)
                );
            })
            .forEach((project) => {
                container.appendChild(project);
            });
    }

    function findProjectContainer() {
        return document.querySelector("[data-project-list]");
    }

    function updateHeading(view) {
        const title = document.querySelector(
            "[data-projects-title]"
        );

        const description = document.querySelector(
            "[data-projects-description]"
        );

        const content = viewDescriptions[view];

        if (title) {
            title.textContent = content.title;
        }

        if (description) {
            description.textContent = content.description;
        }
    }

    function updateBrowserUrl(view) {
        const url = new URL(window.location.href);

        if (view === "all") {
            url.searchParams.delete("view");
        } else {
            url.searchParams.set("view", view);
        }

        history.pushState(
            { portfolioView: view },
            "",
            url
        );
    }

    function scrollToProjects() {
        document
            .querySelector("#projects")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }

    function storeOriginalOrder() {
        projects.forEach((project, index) => {
            project.dataset.originalOrder = index;
        });
    }

    return {
        start() {
            projects = [...document.querySelectorAll("[data-skills]")];

            storeOriginalOrder();

            init();
        },

        setView(view) {
            applyView(view);
        }
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    Portfolio.start();
});