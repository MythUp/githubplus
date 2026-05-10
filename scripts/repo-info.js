(function () {
    let isEnabled = true;

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

    async function displayRepoInfo() {
        // Avoid running on /settings/* and other non-repo pages
        if (window.location.pathname.startsWith('/settings/')) return;

        // Check if we're on a repo page
        const repoMatch = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
        if (!repoMatch) return;

        const owner = repoMatch[1];
        const repo = repoMatch[2];

        // Only show on repo root page
        if (!window.location.pathname.match(/^\/[^\/]+\/[^\/]+\/?$/)) return;

        try {
            // Fetch repository data from GitHub API
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            if (!response.ok) return;

            const data = await response.json();

            // Format file size
            const sizeInKB = Math.round(data.size);
            const sizeDisplay = sizeInKB > 1024 
                ? `${(sizeInKB / 1024).toFixed(1)} MB` 
                : `${sizeInKB} KB`;

            // Fetch repository tree to count files
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

            // Add styles if not already added
            if (!document.getElementById('ghp-repo-stats-styles')) {
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

            // Find or create stats section
            let statsSection = document.getElementById('ghp-repo-stats-section');
            if (!statsSection) {
                statsSection = document.createElement('div');
                statsSection.id = 'ghp-repo-stats-section';
                statsSection.className = 'BorderGrid-row';
                
                // Find the Languages section and insert after it
                const languagesSection = Array.from(document.querySelectorAll('.BorderGrid-row')).find(row => 
                    row.textContent.includes('Languages')
                );

                if (languagesSection) {
                    languagesSection.insertAdjacentElement('afterend', statsSection);
                } else {
                    // Fallback
                    const overviewSection = document.querySelector('[data-testid="repo-details-container"]') ||
                                          document.querySelector('.Layout-sidebar');
                    if (overviewSection) {
                        const firstRow = overviewSection.querySelector('.BorderGrid-row');
                        if (firstRow) {
                            firstRow.insertAdjacentElement('afterend', statsSection);
                        }
                    }
                }
            }

            // Update or create content
            statsSection.innerHTML = `
                <div class="BorderGrid-cell">
                    <h2 class="h4 tmp-mb-3">Repository Statistics</h2>
                    <div class="ghp-repo-stats">
                        <div class="ghp-repo-stats-item">
                            <span class="ghp-repo-stats-label">Repository Size</span>
                            <span class="ghp-repo-stats-value">${sizeDisplay}</span>
                        </div>
                        <div class="ghp-repo-stats-item">
                            <span class="ghp-repo-stats-label">Total Files</span>
                            <span class="ghp-repo-stats-value">${fileCount}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Show the section
            statsSection.style.display = '';

        } catch (error) {
            // Repository info unavailable
        }
    }

    function removeRepoInfo() {
        const statsSection = document.getElementById('ghp-repo-stats-section');
        if (statsSection) {
            statsSection.style.display = 'none';
        }
    }
})();
