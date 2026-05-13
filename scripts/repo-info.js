(function () {
    let isEnabled = true;
    let repoInfoCache = null;
    let repoInfoFetchPromise = null;
    let cachedRepoKey = null;
    let cachedDate = null;
    const CACHE_NAMESPACE = 'repo-info-cache';

    // Listen for settings changes
    chrome.storage.sync.get('repo-info-enabled', (items) => {
        isEnabled = items['repo-info-enabled'] !== false;
        manageRepoInfo();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'SETTINGS_CHANGED' && request.setting === 'repo-info-enabled') {
            isEnabled = request.value;
            manageRepoInfo();
        } else if (request.type === 'SETTINGS_RESET') {
            isEnabled = true;
            manageRepoInfo();
        }
    });

    function manageRepoInfo() {
        if (!isEnabled) {
            removeRepoInfo();
            return;
        }
        displayRepoInfo();
    }

    function getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    function getCacheKey(repoKey) {
        return `${CACHE_NAMESPACE}:${repoKey}`;
    }

    function readStoredCache(repoKey) {
        return new Promise((resolve) => {
            chrome.storage.local.get(getCacheKey(repoKey), (items) => {
                resolve(items[getCacheKey(repoKey)] || null);
            });
        });
    }

    function writeStoredCache(repoKey, payload) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [getCacheKey(repoKey)]: payload }, () => resolve());
        });
    }

    function ensureStyles() {
        if (document.getElementById('ghp-repo-stats-styles')) return;

        const style = document.createElement('style');
        style.id = 'ghp-repo-stats-styles';
        style.textContent = `
            .ghp-repo-stats {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .ghp-repo-stats-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #30363d;
            }

            .ghp-repo-stats-item:last-child {
                border-bottom: none;
            }

            .ghp-repo-stats-label {
                color: #8b949e;
                font-size: 14px;
            }

            .ghp-repo-stats-value {
                color: #c9d1d9;
                font-weight: 600;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    function ensureStatsSection() {
        let statsSection = document.getElementById('ghp-repo-stats-section');
        if (statsSection) return statsSection;

        statsSection = document.createElement('div');
        statsSection.id = 'ghp-repo-stats-section';
        statsSection.className = 'BorderGrid-row';

        const languagesSection = Array.from(document.querySelectorAll('.BorderGrid-row')).find(row =>
            row.textContent.includes('Languages')
        );

        if (languagesSection) {
            languagesSection.insertAdjacentElement('afterend', statsSection);
        } else {
            const overviewSection = document.querySelector('[data-testid="repo-details-container"]') ||
                                  document.querySelector('.Layout-sidebar');
            if (overviewSection) {
                const firstRow = overviewSection.querySelector('.BorderGrid-row');
                if (firstRow) {
                    firstRow.insertAdjacentElement('afterend', statsSection);
                }
            }
        }

        return statsSection;
    }

    function renderRepoInfo(stats) {
        ensureStyles();

        const statsSection = ensureStatsSection();
        if (!statsSection) return;

        statsSection.innerHTML = `
            <div class="BorderGrid-cell">
                <h2 class="h4 tmp-mb-3">Repository Statistics</h2>
                <div class="ghp-repo-stats">
                    <div class="ghp-repo-stats-item">
                        <span class="ghp-repo-stats-label">Repository Size</span>
                        <span class="ghp-repo-stats-value">${stats.sizeDisplay}</span>
                    </div>
                    <div class="ghp-repo-stats-item">
                        <span class="ghp-repo-stats-label">Total Files</span>
                        <span class="ghp-repo-stats-value">${stats.fileCount}</span>
                    </div>
                </div>
            </div>
        `;

        statsSection.style.display = '';
    }

    async function loadRepoInfo(owner, repo) {
        const repoKey = `${owner}/${repo}`;
        const todayKey = getTodayKey();

        if (repoInfoCache && cachedRepoKey === repoKey && cachedDate === todayKey) {
            return repoInfoCache;
        }

        if (repoInfoFetchPromise && cachedRepoKey === repoKey) {
            return repoInfoFetchPromise;
        }

        cachedRepoKey = repoKey;
        repoInfoFetchPromise = (async () => {
            try {
                const storedCache = await readStoredCache(repoKey);
                if (storedCache && storedCache.date === todayKey && storedCache.data) {
                    repoInfoCache = storedCache.data;
                    cachedDate = todayKey;
                    return repoInfoCache;
                }

                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
                if (!response.ok) return null;

                const data = await response.json();
                const sizeInKB = Math.round(data.size);
                const sizeDisplay = sizeInKB > 1024
                    ? `${(sizeInKB / 1024).toFixed(1)} MB`
                    : `${sizeInKB} KB`;

                let fileCount = '—';
                try {
                    const branchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${data.default_branch}?recursive=1`);
                    if (branchResponse.ok) {
                        const treeData = await branchResponse.json();
                        if (treeData.tree) {
                            fileCount = treeData.tree.filter(item => item.type === 'blob').length.toString();
                        }
                    }
                } catch (error) {
                    // File count unavailable
                }

                repoInfoCache = { sizeDisplay, fileCount };
                cachedDate = todayKey;

                await writeStoredCache(repoKey, {
                    date: todayKey,
                    data: repoInfoCache
                });

                return repoInfoCache;
            } catch (error) {
                return null;
            } finally {
                repoInfoFetchPromise = null;
            }
        })();

        return repoInfoFetchPromise;
    }

    async function displayRepoInfo() {
        // Avoid running on /settings/* and other non-repo pages
        if (window.location.pathname.startsWith('/settings/')) {
            removeRepoInfo();
            return;
        }

        // Check if we're on a repo page
        const repoMatch = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
        if (!repoMatch) {
            removeRepoInfo();
            return;
        }

        const owner = repoMatch[1];
        const repo = repoMatch[2];

        // Only show on repo root page
        if (!window.location.pathname.match(/^\/[^\/]+\/[^\/]+\/?$/)) {
            removeRepoInfo();
            return;
        }

        const stats = await loadRepoInfo(owner, repo);
        if (!stats) return;

        renderRepoInfo(stats);
    }

    function removeRepoInfo() {
        const statsSection = document.getElementById('ghp-repo-stats-section');
        if (statsSection) {
            statsSection.style.display = 'none';
        }
    }
})();
