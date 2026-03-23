document.addEventListener("DOMContentLoaded", function() {
    
    // Глобальные переменные
    let currentFontSizePercent = 100;
    const fontSelectors = '[data-elem-type="text"], [data-elem-type="text"] .tn-atom, [data-elem-type="text"] a, .t-submit, .t-input-phonemask__select-code, .t-input__vis-ph, .t-input, .t-checkbox__labeltext, .t-btnflex__text, .t-text, .t-text a, .t-name, .t-name a, .t-descr, .t-descr a, .t-title, .t-title a, .t-subtitle, .t-subtitle a, [field="text"], [field="title"], [field="subtitle"], [field="descr"], [field^="tn_text"], .tn-atom__button-text, .t-btn';

    // --- БЛОК 1: БЫСТРАЯ ИНИЦИАЛИЗАЦИЯ (Без зависаний) ---
    function applyFastSettings() {
        const colorScheme = localStorage.getItem("accessibilityColorScheme");
        if (colorScheme) {
            document.body.classList.add("accessibility-" + colorScheme);
            document.getElementById(colorScheme)?.classList.add("active");
        }
        if (localStorage.getItem("accessibilityLargeCursor") === "true") {
            document.body.classList.add("large-cursor");
            document.getElementById("large-cursor")?.classList.add("active");
        }
        if (localStorage.getItem("accessibilityHideImages") === "true") {
            document.body.classList.add("accessibility-hide-images");
            document.getElementById("hide-images")?.classList.add("active");
        } else {
            document.getElementById("show-images")?.classList.add("active");
        }
    }
    
    // Применяем легкие стили сразу, чтобы сайт не моргал
    applyFastSettings();


    // --- БЛОК 2: ОТЛОЖЕННАЯ ЗАГРУЗКА ТЯЖЕЛЫХ ФУНКЦИЙ ---
    // Используем setTimeout, чтобы Тильда успела отрисовать первый экран
    setTimeout(function() {
        initPanelLogic();
        initThemeLogic();
        initFontLogic();
        initTTSLogic();
        
        // Загружаем тяжелую настройку (шрифты), если она сохранена
        const savedFontSize = localStorage.getItem("accessibilityFontSizePercent");
        if (savedFontSize && savedFontSize !== "100") {
            currentFontSizePercent = parseInt(savedFontSize);
            updatePageFontSize(currentFontSizePercent);
        }
    }, 150);


    // --- БЛОК 3: ФУНКЦИИ УПРАВЛЕНИЯ ПАНЕЛЬЮ ---
    function initPanelLogic() {
        let altlabel = document.querySelector('[href="#access"]');
        if (altlabel) altlabel.classList.add("access");
        if (document.querySelector(".access")) document.querySelector(".accessibility-toggle").style.display = "none";

        const toggles = document.querySelectorAll(".accessibility-toggle, .access");
        toggles.forEach(button => {
            button.addEventListener("click", function(e) {
                e.stopPropagation();
                const isExpanded = this.getAttribute("aria-expanded") === "true";
                this.setAttribute("aria-expanded", !isExpanded);
                document.querySelector(".accessibility-panel").classList.toggle("open");
            });
        });

        document.addEventListener("click", function(event) {
            const panel = document.querySelector(".accessibility-panel");
            if (panel && panel.classList.contains("open") && !panel.contains(event.target) && !Array.from(toggles).some(btn => btn.contains(event.target))) {
                panel.classList.remove("open");
                toggles.forEach(btn => btn.setAttribute("aria-expanded", "false"));
            }
        });

        document.getElementById("large-cursor").addEventListener("click", function() {
            const isActive = this.getAttribute("aria-pressed") === "true";
            this.setAttribute("aria-pressed", !isActive);
            this.classList.toggle("active");
            document.body.classList.toggle("large-cursor");
            localStorage.setItem("accessibilityLargeCursor", !isActive);
        });

        document.getElementById("reset-accessibility").addEventListener("click", function() {
            document.body.classList.remove("accessibility-black-on-white", "accessibility-white-on-black", "accessibility-brown-on-beige", "accessibility-dark-blue-on-blue", "large-cursor", "accessibility-hide-images");
            
            document.querySelectorAll(fontSelectors).forEach(el => {
                el.style.removeProperty('font-size');
                el.style.removeProperty('line-height');
            });
            
            document.querySelectorAll(".color-scheme-btn, .filter-btn, .font-size-btn").forEach(btn => {
                btn.classList.remove("active");
                if (btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", "false");
            });
            
            currentFontSizePercent = 100;
            if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.cancel();
            
            ["accessibilityColorScheme", "accessibilityFontSizePercent", "accessibilityLargeCursor", "accessibilityHideImages"].forEach(item => localStorage.removeItem(item));
        });
    }


    // --- БЛОК 4: ФУНКЦИИ ЦВЕТА И ИЗОБРАЖЕНИЙ ---
    function initThemeLogic() {
        const colorSchemeButtons = document.querySelectorAll(".color-scheme-btn");
        colorSchemeButtons.forEach(button => {
            button.addEventListener("click", function() {
                if (this.classList.contains("active")) {
                    this.classList.remove("active");
                    document.body.classList.remove("accessibility-" + this.id);
                    localStorage.removeItem("accessibilityColorScheme");
                    return;
                }
                document.body.classList.remove("accessibility-black-on-white", "accessibility-white-on-black", "accessibility-brown-on-beige", "accessibility-dark-blue-on-blue");
                colorSchemeButtons.forEach(btn => btn.classList.remove("active"));
                document.body.classList.add("accessibility-" + this.id);
                this.classList.add("active");
                localStorage.setItem("accessibilityColorScheme", this.id);
            });
        });

        document.getElementById("hide-images").addEventListener("click", function() {
            document.body.classList.add("accessibility-hide-images");
            document.getElementById("show-images").classList.remove("active");
            this.classList.add("active");
            localStorage.setItem("accessibilityHideImages", "true");
        });

        document.getElementById("show-images").addEventListener("click", function() {
            document.body.classList.remove("accessibility-hide-images");
            document.getElementById("hide-images").classList.remove("active");
            this.classList.add("active");
            localStorage.setItem("accessibilityHideImages", "false");
        });
    }


    // --- БЛОК 5: ОПТИМИЗИРОВАННОЕ МАСШТАБИРОВАНИЕ (Без Layout Thrashing) ---
    function updatePageFontSize(percentSize) {
        const ratio = percentSize / 100;
        const elements = document.querySelectorAll(fontSelectors);
        const updates = [];

        // Шаг 1: ЧТЕНИЕ (только читаем стили, чтобы браузер не пересчитывал макет)
        elements.forEach(el => {
            if (!el.dataset.baseFontSize) {
                const computedStyle = window.getComputedStyle(el);
                el.dataset.baseFontSize = parseFloat(computedStyle.fontSize);
                const lh = parseFloat(computedStyle.lineHeight);
                if (!isNaN(lh)) el.dataset.baseLineHeight = lh;
            }
            updates.push(el);
        });

        // Шаг 2: ЗАПИСЬ (меняем стили пачкой перед следующей отрисовкой кадра)
        requestAnimationFrame(() => {
            updates.forEach(el => {
                const baseSize = parseFloat(el.dataset.baseFontSize);
                el.style.setProperty('font-size', (baseSize * ratio) + 'px', 'important');
                if (el.dataset.baseLineHeight) {
                    const baseLh = parseFloat(el.dataset.baseLineHeight);
                    el.style.setProperty('line-height', (baseLh * ratio) + 'px', 'important');
                }
            });
        });
        localStorage.setItem("accessibilityFontSizePercent", percentSize);
    }

    function initFontLogic() {
        document.getElementById("decrease-font").addEventListener("click", () => {
            currentFontSizePercent = Math.max(currentFontSizePercent - 10, 70);
            updatePageFontSize(currentFontSizePercent);
        });
        document.getElementById("normal-font").addEventListener("click", () => {
            currentFontSizePercent = 100;
            updatePageFontSize(currentFontSizePercent);
        });
        document.getElementById("increase-font").addEventListener("click", () => {
            currentFontSizePercent = Math.min(currentFontSizePercent + 10, 200);
            updatePageFontSize(currentFontSizePercent);
        });
    }


    // --- БЛОК 6: СИНТЕЗАТОР РЕЧИ (TTS) ---
    function initTTSLogic() {
        let speechSynthesis = window.speechSynthesis;
        let speechUtterance = null;

        document.getElementById("read-aloud").addEventListener("click", function() {
            if (speechSynthesis.speaking) speechSynthesis.cancel();
            const textContent = document.querySelector('#allrecords').innerText;
            if (!textContent || textContent.trim() === "") { alert("Не найден текст для чтения"); return; }
            
            speechUtterance = new SpeechSynthesisUtterance(textContent);
            let voices = speechSynthesis.getVoices();
            let russianVoice = voices.find(voice => voice.lang.includes('ru'));
            if (russianVoice) speechUtterance.voice = russianVoice;
            
            speechUtterance.onend = () => {
                document.getElementById("stop-reading").classList.remove("active");
                document.getElementById("read-aloud").classList.remove("active");
            };
            
            speechSynthesis.speak(speechUtterance);
            this.classList.add("active");
            document.getElementById("stop-reading").classList.remove("active");
        });

        document.getElementById("stop-reading").addEventListener("click", function() {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                document.getElementById("read-aloud").classList.remove("active");
                this.classList.add("active");
            }
        });
    }
});
