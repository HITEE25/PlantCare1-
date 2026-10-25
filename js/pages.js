
const page = document.body.dataset.page;
const $ = selector => document.querySelector(selector);

function plantVisual(plant, className = "plant-photo") {
    if (plant.image) {
        return `
            <img
                src="${plant.image}"
                alt="${plant.commonName}"
                class="${className}"
                onerror="this.style.display='none';this.nextElementSibling.hidden=false"
            >
            <span class="plant-emoji" hidden>${plant.emoji}</span>
        `;
    }

    return `<span class="plant-emoji">${plant.emoji}</span>`;
}


if (page === "home") {
    let filter = "all";

    const draw = () => {
        const query = $("#q").value.trim().toLowerCase();
        const favourites = Store.get("plants", []).map(plant => plant.plantId);

        const results = PLANTS.filter(plant => {
            const matchesSearch =
                !query ||
                (
                    plant.commonName +
                    plant.category +
                    plant.scientificName
                ).toLowerCase().includes(query);

            const matchesFilter =
                filter === "all" ||
                (filter === "low" && plant.sunlight === "low") ||
                (filter === "pet" && plant.petSafe) ||
                (filter === "fav" && favourites.includes(plant.id));

            return matchesSearch && matchesFilter;
        });

        $("#grid").innerHTML = results.length
            ? results.map(plantCard).join("")
            : '<div class="empty">No plants match your search.</div>';

        const reminders = Store.get("reminders", []);

        $("#summary").innerHTML = `
            <strong>${Store.get("plants", []).length}</strong>
            saved plants ·
            <strong>${reminders.filter(r => r.due <= today()).length}</strong>
            tasks due ·
            <a href="care-reminders.html"><u>View care</u></a>
        `;
    };

    $("#q").addEventListener("input", draw);

    document.querySelectorAll(".chip").forEach(chip => {
        chip.onclick = () => {
            filter =
                filter === chip.dataset.filter && filter !== "all"
                    ? "all"
                    : chip.dataset.filter;

            document.querySelectorAll(".chip").forEach(item => {
                item.classList.toggle(
                    "on",
                    item.dataset.filter === filter && filter !== "all"
                );
            });

            draw();
        };
    });

    draw();
}


if (page === "identify") {
    let chosen = null;

    const showPreview = file => {
        if (!file || !file.type.startsWith("image/")) {
            $("#err").textContent = "Please choose an image file.";
            return;
        }

        $("#err").textContent = "";
        chosen = file;

        const reader = new FileReader();

        reader.onload = event => {
            $("#preview").src = event.target.result;
            $("#preview").hidden = false;
        };

        reader.readAsDataURL(file);
    };

    $("#drop").onclick = () => $("#file").click();

    $("#file").onchange = event => {
        showPreview(event.target.files[0]);
    };

    ["dragover", "dragleave", "drop"].forEach(eventName => {
        $("#drop").addEventListener(eventName, event => {
            event.preventDefault();

            $("#drop").classList.toggle(
                "over",
                eventName === "dragover"
            );

            if (eventName === "drop") {
                showPreview(event.dataTransfer.files[0]);
            }
        });
    });

    const identifyPlant = async file => ({
        plantId: PLANTS[
            (file.size + file.name.length) % PLANTS.length
        ].id,
        confidence: null,
        demo: true
    });

    $("#go").onclick = async () => {
        if (!chosen) {
            $("#err").textContent = "Upload a photo first.";
            return;
        }

        const result = await identifyPlant(chosen);
        const plant = plantById(result.plantId);

        $("#result").innerHTML = `
            <div class="panel">
                <span class="tag">
                    DEMO RESULT – not a real identification
                </span>

                <div class="ph">
                    ${plantVisual(plant)}
                </div>

                <h2>${plant.commonName}</h2>
                <p>${plant.description}</p>

                <div class="pill-row">
                    <a
                        class="btn soft"
                        href="plant-info.html?id=${plant.id}"
                    >
                        View details
                    </a>

                    <button class="btn" data-save="${plant.id}">
                        Save to my plants
                    </button>
                </div>
            </div>
        `;
    };
}


if (page === "info") {
    const plant = plantById(
        new URLSearchParams(location.search).get("id")
    );

    if (!plant) {
        $("#info").innerHTML = `
            <div class="empty">
                Plant not found.
                <a href="index.html"><u>Back to plants</u></a>
            </div>
        `;
    } else {
        $("#info").innerHTML = `
            <div class="hero" style="grid-template-columns: 1fr;">
                <div class="art plant-detail-image">
                    ${plantVisual(plant)}
                </div>
            </div>

            <h1>${plant.commonName}</h1>

            <div style="color: var(--muted);">
                <em>${plant.scientificName}</em> · ${plant.category}
            </div>

            <p>${plant.description}</p>

            <h3>Care Tips</h3>

            <div class="chips">
                <div class="chip">
                    <span>💧</span>
                    Every ${plant.wateringDays} days
                </div>

                <div class="chip">
                    <span>☀</span>
                    ${plant.sunlight} light
                </div>

                <div class="chip">
                    <span>🐾</span>
                    ${plant.petSafe ? "Pet friendly" : "Not pet safe"}
                </div>

                <div class="chip">
                    <span>💨</span>
                    ${plant.humidity} humidity
                </div>
            </div>

            <div class="panel">
                <p>
                    <b>Temperature:</b> ${plant.temperatureRange}<br>
                    <b>Soil:</b> ${plant.soilType}<br>
                    <b>Difficulty:</b> ${plant.difficulty}<br>
                    <b>Indoor:</b> ${plant.indoorSuitability}<br>
                    <b>Tip:</b> ${plant.careTip}
                </p>

                <p>
                    <b>Common problem:</b>
                    ${plant.problem.symptom} – likely
                    <i>${plant.problem.cause}</i>.
                    <b>Fix:</b> ${plant.problem.fix}.
                </p>
            </div>

            <button class="btn wide" data-save="${plant.id}">
                Save &amp; Customize Care Schedule
            </button>
        `;
    }
}

if (page === "mine") {
    const draw = () => {
        const allPlants = Store.get("plants", []);
        const rooms = [...new Set(allPlants.map(plant => plant.room))];
        const select = $("#room");
        const currentRoom = select.value;

        select.innerHTML = `
            <option value="">All rooms</option>
            ${rooms.map(room => `
                <option
                    value="${room}"
                    ${room === currentRoom ? "selected" : ""}
                >
                    ${room}
                </option>
            `).join("")}
        `;

        const filteredPlants = allPlants.filter(
            plant => !currentRoom || plant.room === currentRoom
        );

        $("#list").innerHTML = filteredPlants.length
            ? filteredPlants.map(savedPlant => {
                const plant = plantById(savedPlant.plantId);

                if (!plant) return "";

                const nextReminder = Store.get("reminders", []).find(
                    reminder =>
                        reminder.uid === savedPlant.uid &&
                        reminder.type === "Water"
                );

                const status = !nextReminder
                    ? "No schedule"
                    : nextReminder.due < today()
                        ? '<span class="over">Needs water</span>'
                        : "Healthy";

                return `
                    <article class="card">
                        <div class="ph">
                            ${plantVisual(plant)}
                        </div>

                        <h3>${savedPlant.nickname}</h3>

                        <div style="color: var(--muted); font-size: .85rem;">
                            ${plant.commonName} · ${savedPlant.room}
                        </div>

                        <p>
                            Next water:
                            <b>${nextReminder ? fmt(nextReminder.due) : "–"}</b>
                            <br>
                            ${status}
                        </p>

                        <div class="pill-row">
                            <a
                                class="btn soft"
                                href="plant-info.html?id=${plant.id}"
                            >
                                Info
                            </a>

                            <button
                                class="btn soft"
                                data-edit="${savedPlant.uid}"
                            >
                                Edit
                            </button>

                            <button
                                class="btn danger"
                                data-del="${savedPlant.uid}"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                `;
            }).join("")
            : `
                <div class="empty">
                    No plants yet.
                    <a href="index.html"><u>Browse plants</u></a>
                    to add some 
                </div>
            `;
    };

    $("#room").onchange = draw;

    $("#list").onclick = event => {
        const button = event.target.closest("[data-edit], [data-del]");

        if (!button) return;

        const data = button.dataset;
        const allPlants = Store.get("plants", []);

        if (data.del && confirm("Delete this plant and its reminders?")) {
            Store.set(
                "plants",
                allPlants.filter(plant => plant.uid !== data.del)
            );

            Store.set(
                "reminders",
                Store.get("reminders", []).filter(
                    reminder => reminder.uid !== data.del
                )
            );

            toast("Plant deleted");
            draw();
        }

        if (data.edit) {
            const plant = allPlants.find(
                item => item.uid === data.edit
            );

            if (!plant) return;

            const nickname = prompt("Nickname:", plant.nickname);

            if (nickname === null) return;

            const room = prompt("Room:", plant.room);

            if (
                !nickname.trim() ||
                !room ||
                !room.trim()
            ) {
                toast("Nickname and room are required");
                return;
            }

            plant.nickname = nickname.trim();
            plant.room = room.trim();

            Store.set("plants", allPlants);

            toast("Plant updated ✓");
            draw();
        }
    };

    draw();
}



if (page === "care") {
    const plantName = reminder => {
        const plant = Store.get("plants", []).find(i => String(i.uid) === String(reminder.uid));
        return plant ? esc(plant.nickname) : "Plant";           // esc() blocks HTML injection
    };

    const drawCompleted = () => {
        const completed = Store.get("completedReminders", []);
        const section = $("#completed");
        if (!section) return;
        section.innerHTML = completed.length
            ? [...completed].reverse().map(item => `
                <div class="row white">
                    <div><b>${fmt(item.completedAt)}</b> · ${item.type} – ${plantName(item)}<br>
                    <span class="over">Completed ✓</span></div>
                </div>`).join("")
            : '<div class="empty">No completed tasks yet.</div>';
    };

    // Overdue = before today. Due today gets its own label.
    const reminderRow = reminder => {
        const late = reminder.due < today();
        const isToday = reminder.due === today();
        return `
        <div class="row ${late || isToday ? "" : "white"}">
            <div>
                <b>${isToday ? "Today" : fmt(reminder.due)}</b> · ${reminder.type} – ${plantName(reminder)}<br>
                <small>${Number(reminder.every) > 0 ? `Every ${reminder.every} days` : "One time"}</small>
                ${late ? '<br><span class="over">Overdue</span>' : isToday ? '<br><span class="over" style="color:var(--dark)">Due today</span>' : ""}
            </div>
            <div class="pill-row">
                <button class="btn yellow" data-done="${reminder.id}" type="button">Complete ✓</button>
                <button class="btn soft" data-snooze="${reminder.id}" type="button">Snooze 1d</button>
                <button class="btn soft" data-move="${reminder.id}" type="button">Reschedule</button>
            </div>
        </div>`;
    };

    const draw = () => {
        const reminders = Store.get("reminders", []).sort((a, b) => a.due.localeCompare(b.due));
        const due = reminders.filter(r => r.due <= today());
        const upcoming = reminders.filter(r => r.due > today());

        $("#over").innerHTML = due.length
            ? due.map(reminderRow).join("")
            : '<div class="empty">Nothing due 🎉</div>';
        $("#up").innerHTML = upcoming.length
            ? upcoming.map(reminderRow).join("")
            : '<div class="empty">No upcoming tasks. Add one below.</div>';

        const saved = Store.get("plants", []);
        $("#plant").innerHTML = saved.length
            ? saved.map(p => `<option value="${p.uid}">${esc(p.nickname)}</option>`).join("")
            : '<option value="">Save a plant first</option>';

        drawCompleted();
    };

    // Complete, Snooze, Reschedule
    document.body.addEventListener("click", event => {
        const button = event.target.closest("[data-done], [data-snooze], [data-move]");
        if (!button) return;

        const data = button.dataset;
        const id = data.done || data.snooze || data.move;
        let reminders = Store.get("reminders", []);
        const reminder = reminders.find(r => String(r.id) === String(id));
        if (!reminder) return;

        if (data.done) {
            // Keep a history, capped at the latest 50 entries
            const completed = Store.get("completedReminders", []);
            completed.push({ ...reminder, completedAt: today() });
            Store.set("completedReminders", completed.slice(-50));

            if (Number(reminder.every) > 0) {
                reminder.lastCompleted = today();
                reminder.due = addDays(today(), Number(reminder.every));   // recurring: next date
            } else {
                reminders = reminders.filter(r => String(r.id) !== String(reminder.id)); // one-time: remove
            }
            toast("Reminder completed ✓");
        } else if (data.snooze) {
            reminder.due = addDays(reminder.due > today() ? reminder.due : today(), 1);
            toast("Snoozed for 1 day");
        } else if (data.move) {
            const newDate = prompt("New date (YYYY-MM-DD):", reminder.due);
            if (!newDate) return;
            const parsed = new Date(`${newDate}T00:00:00`);
            const valid = /^\d{4}-\d{2}-\d{2}$/.test(newDate) && !Number.isNaN(parsed.getTime()) &&
                ymd(parsed) === newDate;                 // rejects things like 2026-02-31
            if (!valid) { toast("Invalid date. Use YYYY-MM-DD."); return; }
            reminder.due = newDate;
            toast("Reminder rescheduled ✓");
        }

        Store.set("reminders", reminders);
        draw();
    });

    // Add a new reminder
    $("#due").value = today();
    $("#form").onsubmit = event => {
        event.preventDefault();
        const err = $("#err");
        const plant = $("#plant").value, date = $("#due").value, every = $("#every").value;

        if (!plant) { err.textContent = "Save a plant first."; return; }
        if (!date || every === "" || !Number.isFinite(Number(every)) || Number(every) < 0) {
            err.textContent = "Enter a valid date and interval."; return;
        }
        err.textContent = "";
        addReminder(plant, $("#type").value, date, every);
        toast("Reminder set ✓");
        draw();
    };

    // Notifications (only after the user allows them)
    $("#notif").onclick = async () => {
        if (!("Notification" in window)) { toast("Notifications are not supported in this browser."); return; }
        const permission = await Notification.requestPermission();
        if (permission === "granted") new Notification("PlantCare", { body: "Notifications enabled." });
        else toast("Notification permission was not granted.");
    };

    draw();

    if ("Notification" in window && Notification.permission === "granted") {
        const n = Store.get("reminders", []).filter(r => r.due <= today()).length;
        if (n > 0) new Notification("PlantCare", { body: `${n} plant task(s) due` });
    }
}




if (page === "home") {
    let filter = "all";

    const draw = () => {
        const query = $("#q").value.trim().toLowerCase();
        const favourites = Store.get("plants", []).map(plant => plant.plantId);

        const results = PLANTS.filter(plant => {
            const matchesSearch =
                !query ||
                (
                    plant.commonName +
                    plant.category +
                    plant.scientificName
                ).toLowerCase().includes(query);

            const matchesFilter =
                filter === "all" ||
                (filter === "low" && plant.sunlight === "low") ||
                (filter === "pet" && plant.petSafe) ||
                (filter === "fav" && favourites.includes(plant.id));

            return matchesSearch && matchesFilter;
        });

        $("#grid").innerHTML = results.length
            ? results.map(plantCard).join("")
            : '<div class="empty">No plants match your search.</div>';

        const reminders = Store.get("reminders", []);

        $("#summary").innerHTML = `
            <strong>${Store.get("plants", []).length}</strong>
            saved plants ·
            <strong>${reminders.filter(r => r.due <= today()).length}</strong>
            tasks due ·
            <a href="care-reminders.html"><u>View care</u></a>
        `;
    };

    $("#q").addEventListener("input", draw);

    document.querySelectorAll(".chip").forEach(chip => {
        chip.onclick = () => {
            filter =
                filter === chip.dataset.filter && filter !== "all"
                    ? "all"
                    : chip.dataset.filter;

            document.querySelectorAll(".chip").forEach(item => {
                item.classList.toggle(
                    "on",
                    item.dataset.filter === filter && filter !== "all"
                );
            });

            draw();
        };
    });

    draw();
}


if (page === "identify") {
    let chosen = null;

    const showPreview = file => {
        if (!file || !file.type.startsWith("image/")) {
            $("#err").textContent = "Please choose an image file.";
            return;
        }

        $("#err").textContent = "";
        chosen = file;

        const reader = new FileReader();

        reader.onload = event => {
            $("#preview").src = event.target.result;
            $("#preview").hidden = false;
        };

        reader.readAsDataURL(file);
    };

    $("#drop").onclick = () => $("#file").click();

    $("#file").onchange = event => {
        showPreview(event.target.files[0]);
    };

    ["dragover", "dragleave", "drop"].forEach(eventName => {
        $("#drop").addEventListener(eventName, event => {
            event.preventDefault();

            $("#drop").classList.toggle(
                "over",
                eventName === "dragover"
            );

            if (eventName === "drop") {
                showPreview(event.dataTransfer.files[0]);
            }
        });
    });

    const identifyPlant = async file => ({
        plantId: PLANTS[
            (file.size + file.name.length) % PLANTS.length
        ].id,
        confidence: null,
        demo: true
    });

    $("#go").onclick = async () => {
        if (!chosen) {
            $("#err").textContent = "Upload a photo first.";
            return;
        }

        const result = await identifyPlant(chosen);
        const plant = plantById(result.plantId);

        $("#result").innerHTML = `
            <div class="panel">
                <span class="tag">
                    DEMO RESULT – not a real identification
                </span>

                <div class="ph">
                    ${plantVisual(plant)}
                </div>

                <h2>${plant.commonName}</h2>
                <p>${plant.description}</p>

                <div class="pill-row">
                    <a
                        class="btn soft"
                        href="plant-info.html?id=${plant.id}"
                    >
                        View details
                    </a>

                    <button class="btn" data-save="${plant.id}">
                        Save to my plants
                    </button>
                </div>
            </div>
        `;
    };
}


if (page === "info") {
    const plant = plantById(
        new URLSearchParams(location.search).get("id")
    );

    if (!plant) {
        $("#info").innerHTML = `
            <div class="empty">
                Plant not found.
                <a href="index.html"><u>Back to plants</u></a>
            </div>
        `;
    } else {
        $("#info").innerHTML = `
            <div class="hero" style="grid-template-columns: 1fr;">
                <div class="art plant-detail-image">
                    ${plantVisual(plant)}
                </div>
            </div>

            <h1>${plant.commonName}</h1>

            <div style="color: var(--muted);">
                <em>${plant.scientificName}</em> · ${plant.category}
            </div>

            <p>${plant.description}</p>

            <h3>Care Tips</h3>

            <div class="chips">
                <div class="chip">
                    <span>💧</span>
                    Every ${plant.wateringDays} days
                </div>

                <div class="chip">
                    <span>☀</span>
                    ${plant.sunlight} light
                </div>

                <div class="chip">
                    <span>🐾</span>
                    ${plant.petSafe ? "Pet friendly" : "Not pet safe"}
                </div>

                <div class="chip">
                    <span>💨</span>
                    ${plant.humidity} humidity
                </div>
            </div>

            <div class="panel">
                <p>
                    <b>Temperature:</b> ${plant.temperatureRange}<br>
                    <b>Soil:</b> ${plant.soilType}<br>
                    <b>Difficulty:</b> ${plant.difficulty}<br>
                    <b>Indoor:</b> ${plant.indoorSuitability}<br>
                    <b>Tip:</b> ${plant.careTip}
                </p>

                <p>
                    <b>Common problem:</b>
                    ${plant.problem.symptom} – likely
                    <i>${plant.problem.cause}</i>.
                    <b>Fix:</b> ${plant.problem.fix}.
                </p>
            </div>

            <button class="btn wide" data-save="${plant.id}">
                Save &amp; Customize Care Schedule
            </button>
        `;
    }
}

if (page === "mine") {
    const draw = () => {
        const allPlants = Store.get("plants", []);
        const rooms = [...new Set(allPlants.map(plant => plant.room))];
        const select = $("#room");
        const currentRoom = select.value;

        select.innerHTML = `
            <option value="">All rooms</option>
            ${rooms.map(room => `
                <option
                    value="${room}"
                    ${room === currentRoom ? "selected" : ""}
                >
                    ${room}
                </option>
            `).join("")}
        `;

        const filteredPlants = allPlants.filter(
            plant => !currentRoom || plant.room === currentRoom
        );

        $("#list").innerHTML = filteredPlants.length
            ? filteredPlants.map(savedPlant => {
                const plant = plantById(savedPlant.plantId);

                if (!plant) return "";

                const nextReminder = Store.get("reminders", []).find(
                    reminder =>
                        reminder.uid === savedPlant.uid &&
                        reminder.type === "Water"
                );

                const status = !nextReminder
                    ? "No schedule"
                    : nextReminder.due < today()
                        ? '<span class="over">Needs water</span>'
                        : "Healthy";

                return `
                    <article class="card">
                        <div class="ph">
                            ${plantVisual(plant)}
                        </div>

                        <h3>${savedPlant.nickname}</h3>

                        <div style="color: var(--muted); font-size: .85rem;">
                            ${plant.commonName} · ${savedPlant.room}
                        </div>

                        <p>
                            Next water:
                            <b>${nextReminder ? fmt(nextReminder.due) : "–"}</b>
                            <br>
                            ${status}
                        </p>

                        <div class="pill-row">
                            <a
                                class="btn soft"
                                href="plant-info.html?id=${plant.id}"
                            >
                                Info
                            </a>

                            <button
                                class="btn soft"
                                data-edit="${savedPlant.uid}"
                            >
                                Edit
                            </button>

                            <button
                                class="btn danger"
                                data-del="${savedPlant.uid}"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                `;
            }).join("")
            : `
                <div class="empty">
                    No plants yet.
                    <a href="index.html"><u>Browse plants</u></a>
                    to add some 
                </div>
            `;
    };

    $("#room").onchange = draw;

    $("#list").onclick = event => {
        const button = event.target.closest("[data-edit], [data-del]");

        if (!button) return;

        const data = button.dataset;
        const allPlants = Store.get("plants", []);

        if (data.del && confirm("Delete this plant and its reminders?")) {
            Store.set(
                "plants",
                allPlants.filter(plant => plant.uid !== data.del)
            );

            Store.set(
                "reminders",
                Store.get("reminders", []).filter(
                    reminder => reminder.uid !== data.del
                )
            );

            toast("Plant deleted");
            draw();
        }

        if (data.edit) {
            const plant = allPlants.find(
                item => item.uid === data.edit
            );

            if (!plant) return;

            const nickname = prompt("Nickname:", plant.nickname);

            if (nickname === null) return;

            const room = prompt("Room:", plant.room);

            if (
                !nickname.trim() ||
                !room ||
                !room.trim()
            ) {
                toast("Nickname and room are required");
                return;
            }

            plant.nickname = nickname.trim();
            plant.room = room.trim();

            Store.set("plants", allPlants);

            toast("Plant updated ✓");
            draw();
        }
    };

    draw();
}

if (page === "care") {
    const plantName = reminder => {
        const plant = Store.get("plants", []).find(
            item => item.uid === reminder.uid
        );

        return plant ? plant.nickname : "Plant";
    };

    const draw = () => {
        const reminders = Store.get("reminders", []).sort(
            (a, b) => a.due.localeCompare(b.due)
        );

                            
const reminderRow = (reminder, overdue) => `
    <div class="row ${overdue ? "" : "white"}">
        <div>
            <b>${fmt(reminder.due)}</b>
            · ${reminder.type} – ${plantName(reminder)}

            <br>
            <small>
                ${reminder.every
                    ? `every ${reminder.every} days`
                    : "one time"}
            </small>

            ${overdue
                ? '<br><span class="over">Overdue</span>'
                : ""}
        </div>

        <div class="pill-row">
            <button
                class="btn yellow"
                data-done="${reminder.id}"
                type="button"
            >
                Complete ✓
            </button>

            <button
                class="btn soft"
                data-snooze="${reminder.id}"
                type="button"
            >
                Snooze 1d
            </button>

            <button
                class="btn soft"
                data-move="${reminder.id}"
                type="button"
            >
                Reschedule
            </button>
        </div>
    </div>
`;


        const overdueReminders = reminders.filter(
            reminder => reminder.due <= today()
        );

        const upcomingReminders = reminders.filter(
            reminder => reminder.due > today()
        );

        $("#over").innerHTML = overdueReminders.map(
            reminder => reminderRow(reminder, true)
        ).join("") || '<div class="empty">Nothing due </div>';

        $("#up").innerHTML = upcomingReminders.map(
            reminder => reminderRow(reminder, false)
        ).join("") || `
            <div class="empty">
                No upcoming tasks. Add one below.
            </div>
        `;

        const savedPlants = Store.get("plants", []);

        $("#plant").innerHTML = savedPlants.length
            ? savedPlants.map(plant => `
                <option value="${plant.uid}">
                    ${plant.nickname}
                </option>
            `).join("")
            : '<option value="">Save a plant first</option>';
    };

    
document.body.addEventListener("click", event => {
    const button = event.target.closest(
        "[data-done], [data-snooze], [data-move]"
    );

    if (!button) return;

    const data = button.dataset;
    let reminders = Store.get("reminders", []);

    const reminder = reminders.find(item =>
        item.id === (
            data.done || data.snooze || data.move
        )
    );

    if (!reminder) return;

    
if (data.done) {
    // Save this occurrence as completed.
    const completed = Store.get("completedReminders", []);

    completed.push({
        ...reminder,
        completedAt: today()
    });

    Store.set("completedReminders", completed);

    if (reminder.every) {
        // Keep the recurring reminder active for next time.
        reminder.due = addDays(today(), reminder.every);
        reminder.lastCompleted = today();
    } else {
        // Remove one-time reminders from active tasks.
        reminders = reminders.filter(
            item => item.id !== reminder.id
        );
    }

    toast("Reminder completed ✓");
}


    if (data.snooze) {
        reminder.due = addDays(
            reminder.due > today() ? reminder.due : today(),
            1
        );

        toast("Snoozed for 1 day");
    }

    if (data.move) {
        const newDate = prompt(
            "New date (YYYY-MM-DD):",
            reminder.due
        );

        if (
            !newDate ||
            !/^\d{4}-\d{2}-\d{2}$/.test(newDate) ||
            Number.isNaN(Date.parse(newDate))
        ) {
            toast("Invalid date");
            return;
        }

        reminder.due = newDate;
        toast("Reminder rescheduled ✓");
    }

    Store.set("reminders", reminders);
    draw(
        
const completed = Store.get("completedReminders", []);

const completedSection = document.querySelector("#completed");

if (completedSection) {
    completedSection.innerHTML = completed.length
        ? completed.slice().reverse().map(item => `
            <div class="row white">
                <div>
                    <b>${fmt(item.completedAt)}</b>
                    · ${item.type} – ${plantName(item)}
                    <br>
                    <span class="over">Completed ✓</span>
                </div>
            </div>
        `).join("")
        : '<div class="empty">No completed tasks yet.</div>';
}

    );
});


    $("#due").value = today();

    $("#form").onsubmit = event => {
        event.preventDefault();

        if (!$("#plant").value) {
            $("#err").textContent = "Save a plant first.";
            return;
        }

        if (
            !$("#due").value ||
            $("#every").value === "" ||
            Number($("#every").value) < 0
        ) {
            $("#err").textContent = "Enter a valid date and interval.";
            return;
        }

        $("#err").textContent = "";

        addReminder(
            $("#plant").value,
            $("#type").value,
            $("#due").value,
            $("#every").value
        );

        toast("Reminder set ✓");
        draw();
    };

    $("#notif").onclick = async () => {
        if (!("Notification" in window)) {
            toast("Not supported in this browser");
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            new Notification("PlantCare", {
                body: "Notifications enabled"
            });
        } else {
            toast("Permission not granted");
        }
    };

    draw();

    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {
        const dueCount = Store.get("reminders", []).filter(
            reminder => reminder.due <= today()
        ).length;

        if (dueCount) {
            new Notification("PlantCare", {
                body: `${dueCount} plant task(s) due`
            });
        }
    }
}


if (page === "rec") {
    const lightScores = {
        low: 0,
        medium: 1,
        bright: 2
    };

    const difficultyScores = {
        Easy: 0,
        Moderate: 1,
        Hard: 2
    };

    function scorePlant(plant, user) {
        const scores = {};

        const lightDifference = Math.abs(
            lightScores[plant.sunlight] - lightScores[user.light]
        );

        scores.light =
            lightDifference === 0 ? 35 :
            lightDifference === 1 ? 15 : 0;

        scores.care =
            plant.maintenanceLevel === user.care
                ? 25
                : (
                    plant.maintenanceLevel === "moderate" ||
                    user.care === "moderate"
                )
                    ? 12
                    : 0;

        scores.experience =
            difficultyScores[plant.difficulty] <=
            difficultyScores[user.exp]
                ? 20
                : 0;

        scores.space =
            plant.size === user.size
                ? 10
                : (plant.size === "m" || user.size === "m")
                    ? 5
                    : 0;

        scores.pets = !user.pets || plant.petSafe ? 10 : 0;

        return {
            total: Object.values(scores).reduce(
                (sum, value) => sum + value,
                0
            ),
            scores
        };
    }

    $("#form").onsubmit = event => {
        event.preventDefault();

        const user = {
            light: $("#light").value,
            care: $("#care").value,
            exp: $("#exp").value,
            size: $("#size").value,
            pets: $("#pets").value === "yes"
        };

        const recommendations = PLANTS
            .filter(plant => !user.pets || plant.petSafe)
            .map(plant => ({
                plant,
                result: scorePlant(plant, user)
            }))
            .sort((a, b) => b.result.total - a.result.total)
            .slice(0, 3);

        $("#out").innerHTML = recommendations.length
            ? recommendations.map(({ plant, result }) => `
                <article class="card" style="margin: 14px 0;">
                    <div class="ph">
                        ${plantVisual(plant)}
                    </div>

                    <h2>
                        ${plant.commonName}
                        <span class="score">${result.total}%</span>
                    </h2>

                    <p>
                        Light match ${result.scores.light}/35 ·
                        Maintenance ${result.scores.care}/25 ·
                        Experience ${result.scores.experience}/20 ·
                        Space ${result.scores.space}/10 ·
                        Pet safety ${result.scores.pets}/10
                    </p>

                    <p>
                        ${plant.description}
                        <br>
                        <b>Tip:</b> ${plant.careTip}
                    </p>

                    <div class="pill-row">
                        <a
                            class="btn soft"
                            href="plant-info.html?id=${plant.id}"
                        >
                            Full info
                        </a>

                        <button class="btn" data-save="${plant.id}">
                            Save
                        </button>
                    </div>
                </article>
            `).join("")
            : '<div class="empty">No plants match.</div>';
    };
}

});


    $("#due").value = today();

    $("#form").onsubmit = event => {
        event.preventDefault();

        if (!$("#plant").value) {
            $("#err").textContent = "Save a plant first.";
            return;
        }

        if (
            !$("#due").value ||
            $("#every").value === "" ||
            Number($("#every").value) < 0
        ) {
            $("#err").textContent = "Enter a valid date and interval.";
            return;
        }

        $("#err").textContent = "";

        addReminder(
            $("#plant").value,
            $("#type").value,
            $("#due").value,
            $("#every").value
        );

        toast("Reminder set ✓");
        draw();
    };

    $("#notif").onclick = async () => {
        if (!("Notification" in window)) {
            toast("Not supported in this browser");
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            new Notification("PlantCare", {
                body: "Notifications enabled"
            });
        } else {
            toast("Permission not granted");
        }
    };

    draw();

    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {
        const dueCount = Store.get("reminders", []).filter(
            reminder => reminder.due <= today()
        ).length;

        if (dueCount) {
            new Notification("PlantCare", {
                body: `${dueCount} plant task(s) due`
            });
        }
    }
}


if (page === "rec") {
    const lightScores = {
        low: 0,
        medium: 1,
        bright: 2
    };

    const difficultyScores = {
        Easy: 0,
        Moderate: 1,
        Hard: 2
    };

    function scorePlant(plant, user) {
        const scores = {};

        const lightDifference = Math.abs(
            lightScores[plant.sunlight] - lightScores[user.light]
        );

        scores.light =
            lightDifference === 0 ? 35 :
            lightDifference === 1 ? 15 : 0;

        scores.care =
            plant.maintenanceLevel === user.care
                ? 25
                : (
                    plant.maintenanceLevel === "moderate" ||
                    user.care === "moderate"
                )
                    ? 12
                    : 0;

        scores.experience =
            difficultyScores[plant.difficulty] <=
            difficultyScores[user.exp]
                ? 20
                : 0;

        scores.space =
            plant.size === user.size
                ? 10
                : (plant.size === "m" || user.size === "m")
                    ? 5
                    : 0;

        scores.pets = !user.pets || plant.petSafe ? 10 : 0;

        return {
            total: Object.values(scores).reduce(
                (sum, value) => sum + value,
                0
            ),
            scores
        };
    }

    $("#form").onsubmit = event => {
        event.preventDefault();

        const user = {
            light: $("#light").value,
            care: $("#care").value,
            exp: $("#exp").value,
            size: $("#size").value,
            pets: $("#pets").value === "yes"
        };

        const recommendations = PLANTS
            .filter(plant => !user.pets || plant.petSafe)
            .map(plant => ({
                plant,
                result: scorePlant(plant, user)
            }))
            .sort((a, b) => b.result.total - a.result.total)
            .slice(0, 3);

        $("#out").innerHTML = recommendations.length
            ? recommendations.map(({ plant, result }) => `
                <article class="card" style="margin: 14px 0;">
                    <div class="ph">
                        ${plantVisual(plant)}
                    </div>

                    <h2>
                        ${plant.commonName}
                        <span class="score">${result.total}%</span>
                    </h2>

                    <p>
                        Light match ${result.scores.light}/35 ·
                        Maintenance ${result.scores.care}/25 ·
                        Experience ${result.scores.experience}/20 ·
                        Space ${result.scores.space}/10 ·
                        Pet safety ${result.scores.pets}/10
                    </p>

                    <p>
                        ${plant.description}
                        <br>
                        <b>Tip:</b> ${plant.careTip}
                    </p>

                    <div class="pill-row">
                        <a
                            class="btn soft"
                            href="plant-info.html?id=${plant.id}"
                        >
                            Full info
                        </a>

                        <button class="btn" data-save="${plant.id}">
                            Save
                        </button>
                    </div>
                </article>
            `).join("")
            : '<div class="empty">No plants match.</div>';
    };
}
