(function () {
    let isEnabled = true;
    let contributorCache = null;
    let cacheTime = 0;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Check if contributors feature is enabled
    chrome.storage.sync.get('contributors-enabled', (items) => {
        isEnabled = items['contributors-enabled'] !== false;
        if (isEnabled) {
            enhanceContributors();
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'SETTINGS_CHANGED' && request.setting === 'contributors-enabled') {
            isEnabled = request.value;
            if (isEnabled) {
                enhanceContributors();
            } else {
                removeAllStats();
            }
        } else if (request.type === 'SETTINGS_RESET') {
            isEnabled = true;
            enhanceContributors();
        }
    });

    // Add styles if not already added
    function injectStyles() {
        if (!document.getElementById('ghp-contributors-styles')) {
            const style = document.createElement('style');
            style.id = 'ghp-contributors-styles';
            style.textContent = `
                .ghp-contrib-stats {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: auto;
                    padding-left: 12px;
                    font-size: 12px;
                    color: #8b949e;
                }

                .ghp-contrib-stat {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .ghp-contrib-label {
                    color: #8b949e;
                }

                .ghp-contrib-value {
                    color: #c9d1d9;
                    font-weight: 500;
                }

                .ghp-contrib-percentage {
                    background: #1f6feb;
                    color: #ffffff;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 500;
                    font-size: 11px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    function getRepoOwnerAndName() {
        // Prefer GitHub meta tag which reliably contains owner/repo
        const meta = document.querySelector('meta[name="octolytics-dimension-repository_nwo"]');
        if (meta && meta.content) {
            const parts = meta.content.split('/');
            if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
        }

        // Fallback to pathname but avoid matching settings and other non-repo pages
        const repoMatch = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
        if (repoMatch && !window.location.pathname.startsWith('/settings/')) {
            return { owner: repoMatch[1], repo: repoMatch[2] };
        }

        return null;
    }

    async function fetchContributors() {
        // Determine repo owner/name; bail out if not a repository page
        const repoInfo = getRepoOwnerAndName();
        if (!repoInfo) return null;

        const owner = repoInfo.owner;
        const repo = repoInfo.repo;

        // Check cache
        const now = Date.now();
        if (contributorCache && (now - cacheTime) < CACHE_DURATION) {
            return contributorCache;
        }

        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`);
            if (!response.ok) return null;

            const contributors = await response.json();
            const contributorMap = {};
            
            contributors.forEach(contrib => {
                contributorMap[contrib.login.toLowerCase()] = {
                    commits: contrib.contributions,
                    id: contrib.id
                };
            });

            const totalCommits = contributors.reduce((sum, c) => sum + c.contributions, 0);
            
            contributorCache = { map: contributorMap, total: totalCommits };
            cacheTime = now;
            
            return contributorCache;
        } catch (error) {
            return null;
        }
    }

    async function enhanceContributors() {
        if (!isEnabled) return;

        injectStyles();

        const data = await fetchContributors();
        if (!data) return;

        const { map: contributorMap, total: totalCommits } = data;

        // Find all contributor list items
        const contributorItems = document.querySelectorAll('li.mb-2.d-flex');
        
        contributorItems.forEach(listItem => {
            // Skip if already enhanced
            if (listItem.querySelector('.ghp-contrib-stats')) return;

            // Find the user link within this item
            const userLink = listItem.querySelector('[data-hovercard-type="user"]');
            if (!userLink) return;

            // Get username from href
            const match = userLink.href.match(/\/([^\/]+)$/);
            if (!match) return;

            const username = match[1].toLowerCase();
            const contrib = contributorMap[username];

            if (!contrib) return;

            // Create stats container
            const statsContainer = document.createElement('div');
            statsContainer.className = 'ghp-contrib-stats';
            
            const percentage = ((contrib.commits / totalCommits) * 100).toFixed(1);
            
            statsContainer.innerHTML = `
                <div class="ghp-contrib-stat">
                    <span class="ghp-contrib-label">Commits:</span>
                    <span class="ghp-contrib-value">${contrib.commits}</span>
                </div>
                <div class="ghp-contrib-percentage">${percentage}%</div>
            `;

            // Ensure parent is flex
            listItem.style.display = 'flex';
            listItem.style.alignItems = 'center';

            // Append stats
            listItem.appendChild(statsContainer);
        });
    }

    function removeAllStats() {
        document.querySelectorAll('.ghp-contrib-stats').forEach(el => el.remove());
    }

    // Watch for DOM changes and re-run enhancement
    let debounceTimeout;
    const observer = new MutationObserver(() => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            if (isEnabled) {
                enhanceContributors();
            }
        }, 500);
    });

    // Start observing after a short delay to ensure DOM is ready
    setTimeout(() => {
        observer.observe(document.body, { childList: true, subtree: true });
        enhanceContributors();
    }, 1000);
})();
