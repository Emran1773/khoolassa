"use strict";

/* =========================================================
   خُلاصة — APP.JS
   نظام إدارة الخواطر والمشجرات والملخصات والفوائد
========================================================= */

const STORAGE_KEY = "khulasa_items";
const THEME_KEY = "khulasa_theme";

let items = [];
let currentFilter = "all";
let currentPage = "home";
let currentEditingId = null;
let confirmCallback = null;


/* =========================================================
   DOM
========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const splashScreen = $("#splash-screen");
const mainApp = $("#main-app");

const addModal = $("#add-modal");
const editorModal = $("#editor-modal");
const confirmModal = $("#confirm-modal");

const contentForm = $("#content-form");

const itemIdInput = $("#item-id");
const itemTypeInput = $("#item-type");
const itemTitleInput = $("#item-title");
const itemSourceInput = $("#item-source");
const itemCategoryInput = $("#item-category");
const itemContentInput = $("#item-content");
const itemTagsInput = $("#item-tags");
const itemFavoriteInput = $("#item-favorite");

const editorTitle = $("#editor-title");
const editorTypeLabel = $("#editor-type-label");

const toast = $("#toast");
const toastMessage = $("#toast-message");
const toastIcon = $("#toast-icon");


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadData();
    loadTheme();

    bindNavigation();
    bindCreationButtons();
    bindModals();
    bindEditor();
    bindLibrary();
    bindSearch();
    bindSettings();
    bindTheme();

    updateAllUI();

    setTimeout(() => {
        splashScreen.classList.add("hidden");
        mainApp.classList.remove("hidden");
    }, 650);

});


/* =========================================================
   STORAGE
========================================================= */

function loadData() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed)) {
                items = parsed;
            }
        }

    } catch (error) {

        console.error("تعذر تحميل البيانات:", error);
        items = [];

    }

}


function saveData() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(items)
        );

    } catch (error) {

        console.error("تعذر حفظ البيانات:", error);

        showToast(
            "تعذر حفظ البيانات",
            "!"
        );

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function bindNavigation() {

    $$("[data-page]").forEach(button => {

        button.addEventListener("click", () => {

            const page = button.dataset.page;

            if (!page) return;

            navigateTo(page);

        });

    });

}


function navigateTo(page) {

    const target = $(`#page-${page}`);

    if (!target) return;

    currentPage = page;

    $$(".page").forEach(section => {
        section.classList.remove("active");
    });

    target.classList.add("active");

    $$(".nav-item[data-page]").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === page
        );

    });

    updatePage(page);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function updatePage(page) {

    switch (page) {

        case "home":
            renderRecentItems();
            break;

        case "library":
            renderLibrary();
            break;

        case "favorites":
            renderFavorites();
            break;

        case "stats":
            updateStats();
            break;

        case "search":
            $("#global-search")?.focus();
            break;

    }

}


/* =========================================================
   CREATION
========================================================= */

function bindCreationButtons() {

    $$("[data-create]").forEach(button => {

        button.addEventListener("click", () => {

            const type = button.dataset.create;

            closeModal(addModal);

            openEditor(type);

        });

    });


    $("#main-add-button")?.addEventListener("click", () => {

        openModal(addModal);

    });


    $("#library-add-button")?.addEventListener("click", () => {

        openModal(addModal);

    });

}


function openEditor(type, existingItem = null) {

    currentEditingId = existingItem
        ? existingItem.id
        : null;

    contentForm.reset();

    const labels = {
        thought: {
            title: "خاطرة جديدة",
            label: "خاطرة"
        },

        mindmap: {
            title: "مشجرة جديدة",
            label: "مشجرة"
        },

        summary: {
            title: "ملخص جديد",
            label: "ملخص"
        },

        benefit: {
            title: "فائدة جديدة",
            label: "فائدة"
        }
    };

    const config = labels[type] || labels.thought;

    editorTitle.textContent = existingItem
        ? `تعديل ${config.label}`
        : config.title;

    editorTypeLabel.textContent = config.label;

    itemTypeInput.value = type;

    if (existingItem) {

        itemIdInput.value = existingItem.id;
        itemTitleInput.value = existingItem.title || "";
        itemSourceInput.value = existingItem.source || "";
        itemCategoryInput.value = existingItem.category || "";
        itemContentInput.value = existingItem.content || "";
        itemTagsInput.value = Array.isArray(existingItem.tags)
            ? existingItem.tags.join("، ")
            : "";
        itemFavoriteInput.checked = !!existingItem.favorite;

    } else {

        itemIdInput.value = "";
        itemFavoriteInput.checked = false;

    }

    updateSourceVisibility(type);

    openModal(editorModal);

}


function updateSourceVisibility(type) {

    const sourceGroup = $("#source-group");

    if (!sourceGroup) return;

    if (type === "thought") {
        sourceGroup.style.display = "none";
    } else {
        sourceGroup.style.display = "";
    }

}


/* =========================================================
   EDITOR
========================================================= */

function bindEditor() {

    $("#save-item")?.addEventListener("click", saveCurrentItem);

    contentForm?.addEventListener("submit", event => {

        event.preventDefault();

        saveCurrentItem();

    });

}


function saveCurrentItem() {

    const title = itemTitleInput.value.trim();
    const content = itemContentInput.value.trim();
    const type = itemTypeInput.value;

    if (!title) {

        showToast(
            "اكتب عنوانًا أولًا",
            "!"
        );

        itemTitleInput.focus();

        return;

    }

    if (!content) {

        showToast(
            "اكتب المحتوى أولًا",
            "!"
        );

        itemContentInput.focus();

        return;

    }

    const tags = itemTagsInput.value
        .split(/[،,]/)
        .map(tag => tag.trim())
        .filter(Boolean);

    const now = new Date().toISOString();

    const data = {

        title,
        type,
        source: itemSourceInput.value.trim(),
        category: itemCategoryInput.value,
        content,
        tags,
        favorite: itemFavoriteInput.checked,
        updatedAt: now

    };


    if (currentEditingId) {

        const index = items.findIndex(
            item => item.id === currentEditingId
        );

        if (index !== -1) {

            items[index] = {
                ...items[index],
                ...data
            };

        }

        showToast(
            "تم تحديث المحتوى",
            "✓"
        );

    } else {

        const newItem = {

            id: generateId(),
            ...data,
            createdAt: now

        };

        items.unshift(newItem);

        showToast(
            "تمت الإضافة إلى خُلاصة",
            "✓"
        );

    }

    saveData();

    closeModal(editorModal);

    updateAllUI();

}


/* =========================================================
   LIBRARY
========================================================= */

function bindLibrary() {

    $$(".filter").forEach(button => {

        button.addEventListener("click", () => {

            $$(".filter").forEach(filter => {
                filter.classList.remove("active");
            });

            button.classList.add("active");

            currentFilter = button.dataset.filter || "all";

            renderLibrary();

        });

    });

}


function renderLibrary() {

    const container = $("#library-items");

    if (!container) return;

    let filtered = [...items];

    if (currentFilter !== "all") {

        filtered = filtered.filter(
            item => item.type === currentFilter
        );

    }

    renderItems(container, filtered);

}


function renderRecentItems() {

    const container = $("#recent-items");

    if (!container) return;

    const recent = items.slice(0, 5);

    renderItems(container, recent);

}


function renderFavorites() {

    const container = $("#favorite-items");

    if (!container) return;

    const favorites = items.filter(
        item => item.favorite
    );

    renderItems(container, favorites);

}


/* =========================================================
   ITEM RENDERING
========================================================= */

function renderItems(container, list) {

    container.innerHTML = "";

    if (!list.length) {

        container.classList.add("empty-state");

        const message = getEmptyMessage();

        container.innerHTML = `
            <div class="empty-icon">${message.icon}</div>
            <h4>${message.title}</h4>
            <p>${message.text}</p>
        `;

        return;

    }

    container.classList.remove("empty-state");

    list.forEach(item => {

        container.appendChild(
            createItemCard(item)
        );

    });

}


function createItemCard(item) {

    const card = document.createElement("article");

    card.className = "item-card";

    const icon = getTypeIcon(item.type);
    const typeName = getTypeName(item.type);

    const tags = Array.isArray(item.tags)
        ? item.tags
        : [];

    const tagsHTML = tags
        .slice(0, 3)
        .map(tag => `<span class="item-tag">${escapeHTML(tag)}</span>`)
        .join("");

    const date = formatDate(
        item.updatedAt || item.createdAt
    );

    card.innerHTML = `

        <div class="item-type-icon">
            ${icon}
        </div>

        <div class="item-main">

            <h4>${escapeHTML(item.title)}</h4>

            <p>
                ${escapeHTML(item.content)}
            </p>

            <div class="item-meta">

                <span class="item-tag">
                    ${typeName}
                </span>

                ${
                    item.category
                        ? `<span class="item-tag">
                            ${escapeHTML(item.category)}
                           </span>`
                        : ""
                }

                ${tagsHTML}

                <span class="item-date">
                    ${date}
                </span>

            </div>

        </div>

        <div class="item-actions">

            <button
                class="item-action ${
                    item.favorite
                        ? "favorite-active"
                        : ""
                }"
                data-action="favorite"
                data-id="${item.id}"
                title="المفضلة">
                ${item.favorite ? "★" : "☆"}
            </button>

            <button
                class="item-action"
                data-action="edit"
                data-id="${item.id}"
                title="تعديل">
                ✎
            </button>

            <button
                class="item-action delete"
                data-action="delete"
                data-id="${item.id}"
                title="حذف">
                ×
            </button>

        </div>
    `;

    card
        .querySelectorAll("[data-action]")
        .forEach(button => {

            button.addEventListener("click", event => {

                event.stopPropagation();

                handleItemAction(
                    button.dataset.action,
                    button.dataset.id
                );

            });

        });


    card.addEventListener("click", () => {

        openItem(item);

    });


    return card;

}


/* =========================================================
   ITEM ACTIONS
========================================================= */

function handleItemAction(action, id) {

    const item = items.find(
        entry => entry.id === id
    );

    if (!item) return;

    switch (action) {

        case "favorite":

            item.favorite = !item.favorite;
            item.updatedAt = new Date().toISOString();

            saveData();
            updateAllUI();

            showToast(
                item.favorite
                    ? "أضيف إلى المفضلة"
                    : "أزيل من المفضلة",
                "★"
            );

            break;


        case "edit":

            openEditor(
                item.type,
                item
            );

            break;


        case "delete":

            askConfirmation(
                "حذف المحتوى",
                "هل تريد حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.",
                () => deleteItem(id)
            );

            break;

    }

}


function deleteItem(id) {

    items = items.filter(
        item => item.id !== id
    );

    saveData();

    updateAllUI();

    showToast(
        "تم حذف العنصر",
        "✓"
    );

}


/* =========================================================
   OPEN ITEM
========================================================= */

function openItem(item) {

    openEditor(
        item.type,
        item
    );

}


/* =========================================================
   SEARCH
========================================================= */

function bindSearch() {

    const input = $("#global-search");
    const clearButton = $("#clear-search");

    if (!input) return;

    input.addEventListener("input", () => {

        const query = input.value.trim().toLowerCase();

        if (clearButton) {

            clearButton.style.display =
                query ? "grid" : "none";

        }

        searchItems(query);

    });


    clearButton?.addEventListener("click", () => {

        input.value = "";

        clearButton.style.display = "none";

        searchItems("");

        input.focus();

    });

}


function searchItems(query) {

    const container = $("#search-results");

    if (!container) return;

    if (!query) {

        container.classList.add("empty-state");

        container.innerHTML = `
            <div class="empty-icon">⌕</div>
            <h4>ابدأ بالبحث</h4>
            <p>
                ابحث عن أي فكرة أو فائدة أو ملخص محفوظ.
            </p>
        `;

        return;

    }

    const results = items.filter(item => {

        const searchable = [

            item.title,
            item.content,
            item.source,
            item.category,
            ...(item.tags || [])

        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchable.includes(query);

    });

    renderItems(container, results);

}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

    const counts = getCounts();

    $("#home-thoughts-count").textContent =
        counts.thought;

    $("#home-mindmaps-count").textContent =
        counts.mindmap;

    $("#home-summaries-count").textContent =
        counts.summary;

    $("#home-benefits-count").textContent =
        counts.benefit;

    $("#stats-thoughts").textContent =
        counts.thought;

    $("#stats-mindmaps").textContent =
        counts.mindmap;

    $("#stats-summaries").textContent =
        counts.summary;

    $("#stats-benefits").textContent =
        counts.benefit;

    $("#total-count").textContent =
        items.length;

}


function getCounts() {

    return {

        thought: items.filter(
            item => item.type === "thought"
        ).length,

        mindmap: items.filter(
            item => item.type === "mindmap"
        ).length,

        summary: items.filter(
            item => item.type === "summary"
        ).length,

        benefit: items.filter(
            item => item.type === "benefit"
        ).length

    };

}


/* =========================================================
   SETTINGS
========================================================= */

function bindSettings() {

    $("#export-data")?.addEventListener(
        "click",
        exportData
    );


    $("#import-data")?.addEventListener(
        "click",
        () => $("#import-file")?.click()
    );


    $("#import-file")?.addEventListener(
        "change",
        importData
    );


    $("#clear-data")?.addEventListener(
        "click",
        () => {

            if (!items.length) {

                showToast(
                    "لا توجد بيانات لحذفها",
                    "!"
                );

                return;

            }

            askConfirmation(
                "حذف جميع البيانات",
                "سيتم حذف جميع الخواطر والمشجرات والملخصات والفوائد نهائيًا.",
                () => {

                    items = [];

                    saveData();

                    updateAllUI();

                    showToast(
                        "تم حذف جميع البيانات",
                        "✓"
                    );

                }
            );

        }
    );

}


function exportData() {

    if (!items.length) {

        showToast(
            "لا توجد بيانات لتصديرها",
            "!"
        );

        return;

    }

    const data = {

        app: "خُلاصة",
        version: 1,
        exportedAt: new Date().toISOString(),
        items

    };

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        {
            type: "application/json"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        `khulasa-backup-${formatFileDate(new Date())}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showToast(
        "تم تصدير بياناتك",
        "✓"
    );

}


function importData(event) {

    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

        try {

            const imported = JSON.parse(
                reader.result
            );

            const importedItems =
                Array.isArray(imported)
                    ? imported
                    : imported.items;

            if (!Array.isArray(importedItems)) {
                throw new Error("Invalid backup");
            }

            askConfirmation(
                "استعادة البيانات",
                "هل تريد استبدال مكتبتك الحالية بالنسخة المستوردة؟",
                () => {

                    items = importedItems;

                    saveData();

                    updateAllUI();

                    showToast(
                        "تمت استعادة البيانات",
                        "✓"
                    );

                }
            );

        } catch (error) {

            console.error(error);

            showToast(
                "ملف النسخة الاحتياطية غير صالح",
                "!"
            );

        }

        event.target.value = "";

    };

    reader.readAsText(file);

}


/* =========================================================
   THEME
========================================================= */

function bindTheme() {

    $("#theme-button")?.addEventListener(
        "click",
        toggleTheme
    );

    $("#settings-theme")?.addEventListener(
        "click",
        toggleTheme
    );

}


function loadTheme() {

    const savedTheme =
        localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark") {
        document.documentElement.dataset.theme = "dark";
    } else {
        document.documentElement.dataset.theme = "light";
    }

}


function toggleTheme() {

    const current =
        document.documentElement.dataset.theme;

    const next =
        current === "dark"
            ? "light"
            : "dark";

    document.documentElement.dataset.theme =
        next;

    localStorage.setItem(
        THEME_KEY,
        next
    );

    showToast(
        next === "dark"
            ? "تم تفعيل الوضع الداكن"
            : "تم تفعيل الوضع الفاتح",
        "☼"
    );

}


/* =========================================================
   MODALS
========================================================= */

function bindModals() {

    $$("[data-close-modal]").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const modal =
                    button.closest(".modal-overlay");

                closeModal(modal);

            }
        );

    });


    $$(".modal-overlay").forEach(modal => {

        modal.addEventListener("click", event => {

            if (event.target === modal) {
                closeModal(modal);
            }

        });

    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            $$(".modal-overlay.open")
                .forEach(modal => {
                    closeModal(modal);
                });

        }

    });

}


function openModal(modal) {

    if (!modal) return;

    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";

}


function closeModal(modal) {

    if (!modal) return;

    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    if (!$(".modal-overlay.open")) {
        document.body.style.overflow = "";
    }

}


/* =========================================================
   CONFIRMATION
========================================================= */

function askConfirmation(
    title,
    message,
    callback
) {

    $("#confirm-title").textContent = title;

    $("#confirm-message").textContent = message;

    confirmCallback = callback;

    openModal(confirmModal);

}


$("#confirm-cancel")?.addEventListener(
    "click",
    () => {

        confirmCallback = null;

        closeModal(confirmModal);

    }
);


$("#confirm-ok")?.addEventListener(
    "click",
    () => {

        const callback = confirmCallback;

        confirmCallback = null;

        closeModal(confirmModal);

        if (typeof callback === "function") {
            callback();
        }

    }
);


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(message, icon = "✓") {

    toastMessage.textContent = message;
    toastIcon.textContent = icon;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


/* =========================================================
   HELPERS
========================================================= */

function generateId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );

}


function getTypeName(type) {

    const names = {

        thought: "خاطرة",
        mindmap: "مشجرة",
        summary: "ملخص",
        benefit: "فائدة"

    };

    return names[type] || "محتوى";

}


function getTypeIcon(type) {

    const icons = {

        thought: "✎",
        mindmap: "⌘",
        summary: "▤",
        benefit: "✦"

    };

    return icons[type] || "•";

}


function formatDate(dateString) {

    if (!dateString) return "";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "ar-EG",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    ).format(date);

}


function formatFileDate(date) {

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function getEmptyMessage() {

    switch (currentPage) {

        case "favorites":

            return {
                icon: "☆",
                title: "لا توجد مفضلات",
                text: "أضف المحتوى المهم إلى المفضلة للعودة إليه سريعًا."
            };

        case "library":

            return {
                icon: "◌",
                title: "مكتبتك فارغة",
                text: "ابدأ بإضافة أول خاطرة أو مشجرة أو ملخص أو فائدة."
            };

        default:

            return {
                icon: "◌",
                title: "لا يوجد محتوى بعد",
                text: "ابدأ بإضافة شيء جديد إلى خُلاصة."
            };

    }

}


/* =========================================================
   GLOBAL UI UPDATE
========================================================= */

function updateAllUI() {

    updateStats();

    renderRecentItems();
    renderLibrary();
    renderFavorites();

    if (currentPage === "search") {

        const query =
            $("#global-search")?.value
                ?.trim()
                .toLowerCase() || "";

        if (query) {
            searchItems(query);
        }

    }

}


/* =========================================================
   SERVICE WORKER
========================================================= */

if (
    "serviceWorker" in navigator &&
    window.location.protocol !== "file:"
) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("service-worker.js")
                .catch(error => {
                    console.warn(
                        "Service Worker:",
                        error
                    );
                });

        }
    );

}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            navigateTo("search");

        }


        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "n"
        ) {

            event.preventDefault();

            openModal(addModal);

        }

    }
);