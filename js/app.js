
const Store = {
    get(key, defaultValue) {
        try {
            const value = JSON.parse(
                localStorage.getItem(`pc_${key}`)
            );

            return value === null ? defaultValue : value;
        } catch {
            return defaultValue;
        }
    },

    set(key, value) {
        localStorage.setItem(
            `pc_${key}`,
            JSON.stringify(value)
        );
    }
};


const today = () => new Date().toISOString().slice(0, 10);

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);

    return result.toISOString().slice(0, 10);
};

const fmt = (date) => {
    return new Date(date).toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric"
        }
    );
};


const plantById = (id) => {
    return PLANTS.find((plant) => plant.id === id);
};


function toast(message) {
    let toastElement = document.getElementById("toast");

    if (!toastElement) {
        toastElement = document.createElement("div");
        toastElement.id = "toast";
        toastElement.setAttribute("role", "status");

        document.body.append(toastElement);
    }

    toastElement.textContent = message;
    toastElement.classList.add("show");

    setTimeout(() => {
        toastElement.classList.remove("show");
    }, 2200);
}


function goBack() {
    const previousPage = document.referrer;

    if (
        previousPage &&
        new URL(previousPage).origin === location.origin
    ) {
        history.back();
    } else {
        location.href = "index.html";
    }
}


(function initializeNavigation() {
    if (document.body.dataset.page === "signin") {
        return;
    }

    const pages = [
        ["index.html", "Home", "images/home.png"],
        ["identify.html", "Identify", "images/search.png"],
        ["my-plants.html", "My Plants", "images/snake-plant.png"],
        ["care-reminders.html", "Care", "images/leaves.png"],
        ["recommendations.html", "Recommend", "images/convenience.png"],
        ["signin.html", "Profile", "images/user.png"]
    ];

    const headerIcons = {
        back: "images/left.png",
        search: "images/search.png",
        filter: "images/filter.png",
        favourites: "images/heart.png",
        cart: "images/cart.png"
    };

    const currentPage =
        location.pathname.split("/").pop() || "index.html";


    document.body.insertAdjacentHTML(
        "afterbegin",
        `
        <header class="app-header">

            <button
                class="header-btn back-btn"
                onclick="goBack()"
                aria-label="Go back"
                type="button"
            >
                <img src="${headerIcons.back}" alt="">
            </button>

            <div class="header-actions">

                <button
                    class="icon-btn"
                    aria-label="Search"
                    type="button"
                    onclick="document.getElementById('q')?.focus()"
                >
                    <img src="${headerIcons.search}" alt="">
                </button>

                <button
                    class="icon-btn"
                    aria-label="Filter"
                    type="button"
                    onclick="document.querySelector('.chips')?.scrollIntoView({ behavior: 'smooth' })"
                >
                    <img src="${headerIcons.filter}" alt="">
                </button>

                <a
                    class="round-icon-btn"
                    href="my-plants.html"
                    aria-label="Favourites"
                >
                    <img src="${headerIcons.favourites}" alt="">
                </a>

                <a
                    class="round-icon-btn"
                    href="my-plants.html"
                    aria-label="Cart"
                >
                    <img src="${headerIcons.cart}" alt="">
                </a>

            </div>
        </header>
        `
    );


    document.body.insertAdjacentHTML(
        "beforeend",
        `
        <nav class="bottom-nav" aria-label="Main navigation">

            ${pages.map((page) => {
                const isActive =
                    page[0] === currentPage ||
                    (
                        currentPage === "plant-info.html" &&
                        page[0] === "index.html"
                    );

                return `
                    <a
                        href="${page[0]}"
                        class="${isActive ? "active" : ""}"
                    >
                        <img
                            src="${page[2]}"
                            alt=""
                            class="nav-icon"
                        >

                        <span>${page[1]}</span>
                    </a>
                `;
            }).join("")}

        </nav>
        `
    );
})();


function savePlant(id, nickname, room) {
    const plant = plantById(id);

    if (!plant) {
        toast("Plant not found.");
        return;
    }

    const savedPlants = Store.get("plants", []);
    const uniqueId = `u${Date.now()}`;

    savedPlants.push({
        uid: uniqueId,
        plantId: id,
        nickname: nickname || plant.commonName,
        room: room || "Living room",
        added: today()
    });

    Store.set("plants", savedPlants);

    addReminder(
        uniqueId,
        "Water",
        addDays(today(), plant.wateringDays),
        plant.wateringDays
    );

    toast(`${plant.commonName} saved to My Plants ✓`);
}


function addReminder(uid, type, due, every) {
    const reminders = Store.get("reminders", []);

    reminders.push({
        id: `r${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
        uid,
        type,
        due,
        every: Number(every) || 0
    });

    Store.set("reminders", reminders);
}




function plantCard(plant) {
    return `
        <article class="card">

            <div class="ph">
                <img
                    src="${plant.image}"
                    alt="${plant.commonName}"
                    class="plant-image"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
            </div>

            <h3>${plant.commonName}</h3>

            <div
                class="muted"
                style="color: var(--muted); font-size: 0.85rem;"
            >
                ${plant.scientificName}
            </div>

            <div class="plant-tags">
                <span class="tag">
                    ☀ ${plant.sunlight}
                </span>

                <span class="tag">
                    ${plant.petSafe ? "🐾 Pet safe" : "⚠ Toxic to pets"}
                </span>

                <span class="tag">
                    ${plant.difficulty}
                </span>
            </div>

            <div class="pill-row" style="margin-top: 10px;">
                <a
                    class="btn soft"
                    href="plant-info.html?id=${plant.id}"
                >
                    Details
                </a>

                <button
                    class="btn"
                    data-save="${plant.id}"
                    type="button"
                >
                    Save
                </button>
            </div>

        </article>
    `;
}




document.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save]");

    if (saveButton) {
        savePlant(saveButton.dataset.save);
    }
});
