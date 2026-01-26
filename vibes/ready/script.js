document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const readerDisplay = document.getElementById('current-word');
    const sourceText = document.getElementById('source-text');
    const btnTogglePlay = document.getElementById('btn-toggle-play');
    const btnReset = document.getElementById('btn-reset');
    const wpmInput = document.getElementById('wpm-input');

    // State
    let words = [];
    let currentIndex = 0;
    let isPlaying = false;
    let timerId = null;
    let wpm = 300;

    // Constants
    const DELAY_BASE = 60000; // ms per minute

    // Init
    function init() {
        wpm = parseInt(wpmInput.value, 10) || 300;
        updateWordsFromSource();
    }

    // Parse text from the source div and wrap words in spans for highlighting
    function updateWordsFromSource() {
        // If we are playing, don't re-parse to avoid disrupting state.
        // We only re-parse if the user manually changed text or we reset.
        const text = sourceText.innerText;

        // Regex to split by whitespace
        const tokens = text.trim().split(/\s+/);

        // Clear current words
        words = tokens.filter(t => t.length > 0);
    }

    // Wrap the source text in spans to allow targeting individual words
    function wrapSourceText() {
        const text = sourceText.innerText;

        const segments = text.split(/(\s+)/); // Split keeping delimiters
        let wordCount = 0;

        const html = segments.map(segment => {
            if (segment.trim().length === 0) {
                return segment; // whitespace
            } else {
                const escaped = segment.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
                const span = `<span id="word-${wordCount}" class="word-span">${escaped}</span>`;
                wordCount++;
                return span;
            }
        }).join('');

        sourceText.innerHTML = html;

        // Update words array to match these spans
        words = Array.from(sourceText.querySelectorAll('.word-span')).map(el => el.innerText);
    }

    function start() {
        if (isPlaying) return;

        // If we messed up the DOM, re-parse.
        if (sourceText.querySelectorAll('.word-span').length === 0 || words.length === 0) {
            wrapSourceText();
        }

        // If finished, reset
        if (currentIndex >= words.length) {
            currentIndex = 0;
        }

        isPlaying = true;
        btnTogglePlay.innerText = "⏸";

        runLoop();
    }

    function pause() {
        isPlaying = false;
        clearTimeout(timerId);
        btnTogglePlay.innerText = "▶";
    }

    function reset() {
        pause();
        currentIndex = 0;
        updateReaderDisplay();
        highlightCurrentWord();
    }

    function runLoop() {
        if (!isPlaying) return;

        // Display current
        updateReaderDisplay();
        highlightCurrentWord();

        // Calculate delay logic
        let delay = 60000 / wpm;

        // Advanced: Add delay for punctuation
        const currentWord = words[currentIndex];
        if (currentWord) {
            if (currentWord.endsWith('.') || currentWord.endsWith('!') || currentWord.endsWith('?')) {
                delay *= 2.0; // Pause longer on sentences
            } else if (currentWord.endsWith(',') || currentWord.endsWith(';') || currentWord.endsWith(':')) {
                delay *= 1.5; // Pause a bit on clauses
            }
        }

        // Advance
        currentIndex++;

        if (currentIndex >= words.length) {
            // Done
            pause();
            return;
        }

        timerId = setTimeout(runLoop, delay);
    }

    function updateReaderDisplay() {
        if (words.length > 0 && currentIndex < words.length) {
            readerDisplay.innerText = words[currentIndex];
            updateSentenceDisplay();
        } else {
            readerDisplay.innerText = "Done";
            if (sentenceDisplay) sentenceDisplay.innerText = "";
        }
    }

    function highlightCurrentWord() {
        // Remove old highlights
        const old = sourceText.querySelector('.highlight');
        if (old) old.classList.remove('highlight');

        // Add new
        if (currentIndex < words.length) {
            const el = document.getElementById(`word-${currentIndex}`);
            if (el) {
                el.classList.add('highlight');
                // Scroll into view if needed
                ensureVisible(el);
            }
        }
    }

    // Sentence Context Logic
    const sentenceDisplay = document.getElementById('sentence-display');
    const btnFocusContext = document.getElementById('btn-focus-context');
    // Initially false, or user preference? Let's default false.
    let showContext = false;

    // Toggle button click
    if (btnFocusContext) {
        btnFocusContext.addEventListener('click', () => {
            showContext = !showContext;
            toggleContextVisibility();
        });
    }

    function toggleContextVisibility() {
        if (showContext) {
            sentenceDisplay.classList.remove('hidden');
            if (btnFocusContext) btnFocusContext.style.opacity = '1.0'; // Visual feedback
            updateSentenceDisplay(); // visual update
        } else {
            sentenceDisplay.classList.add('hidden');
            if (btnFocusContext) btnFocusContext.style.opacity = '0.3'; // Visual feedback
        }
    }

    function updateSentenceDisplay() {
        if (!showContext || words.length === 0) return;

        let start = currentIndex;
        while (start > 0) {
            const prev = words[start - 1];
            if (prev.endsWith('.') || prev.endsWith('!') || prev.endsWith('?')) {
                break;
            }
            start--;
        }

        let end = currentIndex;
        while (end < words.length - 1) {
            const curr = words[end];
            if (curr.endsWith('.') || curr.endsWith('!') || curr.endsWith('?')) {
                break;
            }
            end++;
        }

        const sentence = words.slice(start, end + 1).join(' ');
        if (sentenceDisplay.innerText !== sentence) {
            sentenceDisplay.innerText = sentence;
        }
    }

    // Auto-scroll control
    let autoScrollEnabled = true;
    sourceText.addEventListener('mouseenter', () => { autoScrollEnabled = false; });
    sourceText.addEventListener('mouseleave', () => { autoScrollEnabled = true; });

    // Also disable on touch for mobile (simplified: touchstart disables, maybe re-enable on play toggle?)
    // Actually simplicity: if hovering, don't scroll.

    function ensureVisible(el) {
        if (!autoScrollEnabled) return;

        const container = sourceText;
        const elTop = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.offsetHeight;

        // Center the word in the view if possible
        if (elTop < containerTop || elBottom > containerBottom) {
            container.scrollTop = elTop - (container.offsetHeight / 2) + (el.offsetHeight / 2);
        }
    }

    // Event Listeners
    btnTogglePlay.addEventListener('click', () => {
        wpm = parseInt(wpmInput.value, 10) || 300;
        togglePlay();
    });

    function togglePlay() {
        if (isPlaying) {
            pause();
            btnTogglePlay.innerText = "▶";
        } else {
            start();
            btnTogglePlay.innerText = "⏸";
        }
    }

    btnReset.addEventListener('click', () => {
        reset();
    });

    wpmInput.addEventListener('change', (e) => {
        wpm = parseInt(e.target.value, 10);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Spacebar to toggle play/pause
        if (e.code === 'Space') {
            // Prevent default scrolling if focus is not on input
            if (document.activeElement !== sourceText && document.activeElement !== wpmInput) {
                e.preventDefault();
                togglePlay();
            }
        }

        // Left Arrow - Go Back
        if (e.code === 'ArrowLeft') {
            rewind();
        }

        // Right Arrow - Go Forward
        if (e.code === 'ArrowRight') {
            forward();
        }

        // Escape to exit focus mode
        if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
            toggleFocusMode();
        }
    });

    // Theme Cycling
    const themes = ['', 'theme-night', 'theme-black', 'theme-soft'];
    let currentThemeIndex = 0;

    document.getElementById('btn-theme-cycle').addEventListener('click', () => {
        // Remove current theme class if it exists (and is not default empty string)
        if (themes[currentThemeIndex]) {
            document.body.classList.remove(themes[currentThemeIndex]);
        }

        // Advance index
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;

        // Add new theme class if it is not default
        if (themes[currentThemeIndex]) {
            document.body.classList.add(themes[currentThemeIndex]);
        }
    });

    // Font Size Controls
    document.getElementById('btn-font-plus').addEventListener('click', () => {
        adjustFontSize(1);
    });

    document.getElementById('btn-font-minus').addEventListener('click', () => {
        adjustFontSize(-1);
    });

    function adjustFontSize(delta) {
        const style = window.getComputedStyle(readerDisplay);
        const currentSize = parseFloat(style.fontSize);
        const newSize = currentSize + (delta * 4); // Increment by 4px
        if (newSize >= 16 && newSize <= 128) {
            readerDisplay.style.fontSize = `${newSize}px`;
        }
    }

    // Focus Mode
    document.getElementById('btn-focus').addEventListener('click', toggleFocusMode);

    const btnFocusClose = document.getElementById('btn-focus-close');
    if (btnFocusClose) {
        btnFocusClose.addEventListener('click', toggleFocusMode);
    }

    function toggleFocusMode() {
        document.body.classList.toggle('focus-mode');

        // If we exit focus mode, ensure sentence context is hidden
        if (!document.body.classList.contains('focus-mode')) {
            if (showContext) {
                showContext = false;
                toggleContextVisibility();
            }
        }
    }

    // If user types, we should probably pause and reset/re-parse logic on next play
    sourceText.addEventListener('input', () => {
        if (isPlaying) {
            pause();
        }
    });

    // Initial wrap?
    // User might paste.
    // Let's wrap on Play.

    // Navigation Helpers

    function isSentenceEnd(word) {
        if (!word) return false;
        return word.endsWith('.') || word.endsWith('!') || word.endsWith('?');
    }

    function getSentenceStart(index) {
        if (index <= 0) return 0;

        // Walk backwards until we find a sentence end or hit 0
        let i = index - 1;
        while (i >= 0) {
            if (isSentenceEnd(words[i])) {
                return i + 1;
            }
            i--;
        }
        return 0;
    }

    function getNextSentenceStart(index) {
        if (index >= words.length - 1) return words.length - 1;

        // Walk forwards to match end of current sentence
        let i = index;
        while (i < words.length) {
            if (isSentenceEnd(words[i])) {
                return Math.min(words.length - 1, i + 1);
            }
            i++;
        }
        return words.length - 1;
    }

    function rewind() {
        pause();

        // If we are deep into a sentence, go to start of THIS sentence.
        // If we are at the start (or very close), go to start of PREVIOUS sentence.

        const currentSentenceStart = getSentenceStart(currentIndex);

        // If we are within 2 words of the start, go back further
        if (currentIndex - currentSentenceStart <= 1) {
            // Go to start of previous sentence
            // To find previous sentence start, look before the current start's previous word
            // currentSentenceStart - 1 is the end of the previous sentence.
            const prevEnd = currentSentenceStart - 1;
            if (prevEnd >= 0) {
                currentIndex = getSentenceStart(prevEnd);
            } else {
                currentIndex = 0;
            }
        } else {
            currentIndex = currentSentenceStart;
        }

        updateReaderDisplay();
        highlightCurrentWord();
    }

    function forward() {
        pause();
        currentIndex = getNextSentenceStart(currentIndex);
        updateReaderDisplay();
        highlightCurrentWord();
    }

    // Touch Zone Listeners
    const touchLeft = document.getElementById('touch-left');
    const touchCenter = document.getElementById('touch-center');
    const touchRight = document.getElementById('touch-right');

    if (touchLeft) {
        touchLeft.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent ensuring visibility toggles or other background clicks
            rewind();
        });
    }

    if (touchCenter) {
        touchCenter.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlay();
        });
    }

    if (touchRight) {
        touchRight.addEventListener('click', (e) => {
            e.stopPropagation();
            forward();
        });
    }

    // Click-to-Read: Allow clicking words in source text to jump there
    sourceText.addEventListener('click', (e) => {
        if (e.target.classList.contains('word-span')) {
            const id = e.target.id; // word-123
            if (id && id.startsWith('word-')) {
                const index = parseInt(id.replace('word-', ''), 10);
                if (!isNaN(index)) {
                    // Pause if playing so user can read context or restart from here
                    if (isPlaying) {
                        pause();
                    }
                    currentIndex = index;
                    updateReaderDisplay();
                    highlightCurrentWord();
                }
            }
        }
    });
});
