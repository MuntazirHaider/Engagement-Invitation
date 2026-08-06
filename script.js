// Mobile viewport height fix — correct for browser chrome (address bar) on iOS/Android
(function setVH() {
    const update = () => {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
})();

document.addEventListener('DOMContentLoaded', async () => {
    // --- Elements ---
    const openBtn = document.getElementById('open-btn');
    const welcomePage = document.getElementById('welcome-page');
    const mainContent = document.getElementById('main-content');

    const audioEnvelope = document.getElementById('audio-envelope');
    const audioBg = document.getElementById('audio-bg');

    const videoWelcome = document.getElementById('video-welcome');
    const flowerOverlay = document.getElementById('flower-overlay');
    const audioControl = document.getElementById('audio-control');
    const iconUnmuted = document.getElementById('icon-unmuted');
    const iconMuted = document.getElementById('icon-muted');

    let isMuted = false;

    // --- Dynamic Section Loader ---
    async function loadSection(url, containerId) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            document.getElementById(containerId).innerHTML = html;
        } catch (e) {
            console.error("Failed to load section:", url, e);
        }
    }

    async function loadAllSections() {
        await Promise.all([
            loadSection('sections/invitation.html', 'section-invitation-container'),
            loadSection('sections/date.html', 'section-date-container'),
            loadSection('sections/events.html', 'section-events-container'),
            loadSection('sections/dress-code.html', 'section-dress-code-container'),
            loadSection('sections/family.html', 'section-family-container'),
            loadSection('sections/directions.html', 'section-directions-container')
        ]);

        // Initialize observers now that DOM contains the new elements
        initializeObservers();
    }

    // Begin loading sections in background immediately
    loadAllSections();

    // --- Initial Interactions & Audio ---
    openBtn.addEventListener('click', () => {
        // Hide button to prevent double clicks
        openBtn.style.opacity = '0';
        openBtn.style.pointerEvents = 'none';

        // Play video and audio
        audioEnvelope.playbackRate = 0.75;
        audioEnvelope.currentTime = 0;
        videoWelcome.playbackRate = 2;
        videoWelcome.play().catch(e => console.log("Video play failed:", e));
        audioEnvelope.play().catch(e => console.log("Audio play failed:", e));

        // Wait for video to finish
        videoWelcome.onended = () => {
            // Fade out welcome page
            welcomePage.classList.add('fade-out');

            // Show main content immediately
            mainContent.classList.remove('hidden');

            // Show flower overlay and audio control button
            audioControl.classList.remove('hidden');
            if (flowerOverlay) {
                flowerOverlay.classList.remove('hidden');
                setTimeout(() => {
                    flowerOverlay.style.opacity = '1';
                }, 100);
            }

            // Wait for fade out to complete
            setTimeout(() => {
                welcomePage.style.display = 'none';

                // Start background audio smoothly
                if (!isMuted) {
                    audioBg.volume = 0;
                    audioBg.play().catch(e => console.log("Bg audio play failed:", e));
                    fadeInAudio(audioBg, 2000); // fade in over 2 seconds
                }
            }, 2000);
        };
    });

    // --- Audio Control Logic ---
    audioControl.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
            audioBg.pause();
            iconUnmuted.classList.add('hidden');
            iconMuted.classList.remove('hidden');
        } else {
            audioBg.play().catch(e => console.log("Bg audio play failed:", e));
            iconMuted.classList.add('hidden');
            iconUnmuted.classList.remove('hidden');
        }
    });

    // --- Audio Helper ---
    function fadeInAudio(audio, duration) {
        let volume = 0;
        const interval = 50;
        const step = 1 / (duration / interval);

        const fade = setInterval(() => {
            volume += step;
            if (volume >= 1) {
                audio.volume = 1;
                clearInterval(fade);
            } else {
                audio.volume = volume;
            }
        }, interval);
    }

    // --- Scroll Animations & Lazy Loading ---
    function initializeObservers() {
        const cinematicWrapper = document.getElementById('cinematic-wrapper');

        // Observe text elements for fade up effect
        const fadeElements = document.querySelectorAll('.fade-up-element');

        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // Trigger animation when 40% of the element is visible
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            root: cinematicWrapper,
            threshold: 0.4 // 40% visibility
        });

        fadeElements.forEach(el => {
            animationObserver.observe(el);
        });

        // Video Lazy Loading & Play/Pause Optimization
        const lazyVideos = document.querySelectorAll('.lazy-video');

        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;

                if (entry.isIntersecting) {
                    // Load video source if not already set
                    if (video.dataset.src && !video.getAttribute('src')) {
                        video.setAttribute('src', video.dataset.src);
                        video.load();
                    }
                    // Play video when in viewport
                    video.play().catch(e => console.log("Video autoplay prevented:", e));
                } else {
                    // Pause video when out of viewport to save resources
                    if (!video.paused) {
                        video.pause();
                    }
                }
            });
        }, {
            root: cinematicWrapper,
            // Start loading just before it comes into view (0% visibility + margin)
            rootMargin: '100px 0px',
            threshold: 0
        });

        lazyVideos.forEach(video => {
            videoObserver.observe(video);
        });
    }

    // --- Scroll Forwarding for Desktop ---
    // If the user scrolls outside the cinematic wrapper (on the dark background)
    window.addEventListener('wheel', (e) => {
        const cinematicWrapper = document.getElementById('cinematic-wrapper');
        // Only forward if the target isn't already inside the wrapper
        if (cinematicWrapper && !cinematicWrapper.contains(e.target)) {
            e.preventDefault(); // Stop default scroll

            let delta = e.deltaY;
            if (e.deltaMode === 0) { // DOM_DELTA_PIXEL
                delta *= 1.5; // Standard multiplier, 5 was likely too fast without smooth scroll
            }
            
            // Use behavior: 'auto' to bypass the CSS 'scroll-behavior: smooth'
            // which was causing the lag by queuing up hundreds of smooth animations
            cinematicWrapper.scrollBy({ 
                top: delta, 
                behavior: 'auto' 
            });
        }
    }, { passive: false }); // Must be false to use e.preventDefault()
});
