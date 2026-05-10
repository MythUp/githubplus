// Default settings
const DEFAULT_SETTINGS = {
    'badges-enabled': true,
    'pagination-enabled': true,
    'vscode-enabled': true,
    'repo-info-enabled': true,
    'contributors-enabled': true,
    'private-email-enabled': true
};

// Load version from manifest
function loadVersion() {
    const versionEl = document.getElementById('version');
    fetch(chrome.runtime.getURL('manifest.json'))
        .then(response => response.json())
        .then(data => {
            versionEl.textContent = `v${data.version}`;
        });
}

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        document.getElementById('toggle-badges').checked = items['badges-enabled'];
        document.getElementById('toggle-pagination').checked = items['pagination-enabled'];
        document.getElementById('toggle-vscode').checked = items['vscode-enabled'];
        document.getElementById('toggle-repo-info').checked = items['repo-info-enabled'];
        document.getElementById('toggle-contributors').checked = items['contributors-enabled'];
        document.getElementById('toggle-private-email').checked = items['private-email-enabled'];
    });
}

// Save setting to storage
function saveSetting(key, value) {
    chrome.storage.sync.set({ [key]: value }, () => {
        // Notify content scripts about the change
        chrome.tabs.query({ url: 'https://github.com/*' }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SETTINGS_CHANGED',
                    setting: key,
                    value: value
                }).catch(() => {
                    // Tab might not have content script loaded
                });
            });
        });
    });
}

// Event listeners for toggles
document.addEventListener('DOMContentLoaded', () => {
    loadVersion();
    loadSettings();

    document.getElementById('toggle-badges').addEventListener('change', (e) => {
        saveSetting('badges-enabled', e.target.checked);
    });

    document.getElementById('toggle-pagination').addEventListener('change', (e) => {
        saveSetting('pagination-enabled', e.target.checked);
    });

    document.getElementById('toggle-vscode').addEventListener('change', (e) => {
        saveSetting('vscode-enabled', e.target.checked);
    });

    document.getElementById('toggle-repo-info').addEventListener('change', (e) => {
        saveSetting('repo-info-enabled', e.target.checked);
    });

    document.getElementById('toggle-contributors').addEventListener('change', (e) => {
        saveSetting('contributors-enabled', e.target.checked);
    });

    document.getElementById('toggle-private-email').addEventListener('change', (e) => {
        saveSetting('private-email-enabled', e.target.checked);
    });
});
