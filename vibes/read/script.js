document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const readerDisplay = document.getElementById('current-word');
    const sourceText = document.getElementById('source-text');
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
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

        // Split by whitespace but keep the structure somewhat?
        // Actually, to highlighting specifically, it's easier to rebuild the HTML.
        // We will split by whitespace to get the reading words.

        // Regex to split by whitespace
        const tokens = text.trim().split(/\s+/);

        // Clear current words
        words = tokens.filter(t => t.length > 0);

        // If we are at the start, we can re-render the source text with spans
        // But if the user works on it, we might want to do it on "Play".
    }

    // Wrap the source text in spans to allow targeting individual words
    function wrapSourceText() {
        const text = sourceText.innerText;
        // Escape HTML to prevent XSS if necessary, though contenteditable handles some.
        // We will just split by spaces and join with spans.
        // Note: newline preservation might be tricky with just innerText split.
        // A simple approach:

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
        // Check if we have spans.
        if (sourceText.querySelectorAll('.word-span').length === 0 || words.length === 0) {
            wrapSourceText();
            // currentIndex = 0; // Don't reset index if we are just resuming?
            // Actually if we edit text, we should probably reset or try to keep place.
            // For simplicity, if we play, we ensure text is wrapped.
        }

        // If finished, reset
        if (currentIndex >= words.length) {
            currentIndex = 0;
        }

        isPlaying = true;
        btnPlay.classList.add('hidden'); // Optional UI toggle
        // btnPause.classList.remove('hidden');

        runLoop();
    }

    function pause() {
        isPlaying = false;
        clearTimeout(timerId);
    }

    function reset() {
        pause();
        currentIndex = 0;
        updateReaderDisplay();
        highlightCurrentWord();
        // Optional: unwrap text? Nah.
    }

    function runLoop() {
        if (!isPlaying) return;

        // Display current
        updateReaderDisplay();
        highlightCurrentWord();

        // Calculate delay logic
        // Standard WPM: 60s / wpm = seconds per word
        // ms = 60000 / wpm
        let delay = 60000 / wpm;

        // Advanced: Add delay for punctuation (commas, periods)
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
        } else {
            readerDisplay.innerText = "Done";
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

    function ensureVisible(el) {
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
    btnPlay.addEventListener('click', () => {
        wpm = parseInt(wpmInput.value, 10) || 300;
        start();
    });

    btnPause.addEventListener('click', pause);

    btnReset.addEventListener('click', reset);

    wpmInput.addEventListener('change', (e) => {
        wpm = parseInt(e.target.value, 10);
    });

    // If user types, we should probably pause and reset/re-parse logic on next play
    sourceText.addEventListener('input', () => {
        if (isPlaying) pause();
        // Remove spans? Or just wait for next Play click to re-wrap.
        // If we leave spans, user editing might get messy (nested spans).
        // It's cleaner to get innerText and strip html, but browsers handle contenteditable differently.
        // For a simple app, we will let "Play" handle the re-wrapping.
    });

    // Initial wrap?
    // User might paste.
    // Let's wrap on Play.
});
