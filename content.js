function applyStyles() {
    const badges = document.querySelectorAll('span.Label, span.prc-Label-Label-qG-Zu');
    badges.forEach(badge => {
        const text = badge.textContent.trim();
        if (text === 'Public') {
            badge.style.border = '2px solid green';
            badge.style.color = 'green';
        } else if (text === 'Private') {
            badge.style.border = '2px solid red';
            badge.style.color = 'red';
        } else if (text === 'Public template') {
            badge.style.border = '2px solid cornflowerblue';
            badge.style.color = 'cornflowerblue';
        }
    });
}

applyStyles();

let debounceFrame;
const observer = new MutationObserver(() => {
    cancelAnimationFrame(debounceFrame);
    debounceFrame = requestAnimationFrame(applyStyles);
});
observer.observe(document.body, { childList: true, subtree: true });