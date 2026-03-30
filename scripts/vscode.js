(function () {
    const STYLES = `
        .btn-ghp-vscode {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 32px;
            padding: 0 12px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 6px;
            border: 1px solid #005f9e;
            background-color: #007acc;
            color: #ffffff !important;
            text-decoration: none;
            transition: background-color 0.2s;
            white-space: nowrap;
            gap: 6px;
        }
        .btn-ghp-vscode:hover {
            background-color: #006bb3;
            text-decoration: none;
        }
        .btn-ghp-vscode svg {
            flex-shrink: 0;
            width: 16px;
            height: 16px;
        }
        .btn-ghp-vscode span {
            display: inline;
        }
        @media (max-width: 768px) {
            .btn-ghp-vscode span {
                display: none;
            }
            .btn-ghp-vscode {
                padding: 0 8px;
            }
        }
        @media (max-width: 480px) {
            .btn-ghp-vscode span {
                display: none;
            }
            .btn-ghp-vscode {
                padding: 0 8px;
                margin-left: 4px;
            }
        }
        @media (max-width: 360px) {
            .btn-ghp-vscode span {
                display: none;
            }
            .btn-ghp-vscode {
                padding: 0 8px;
            }
        }
    `;

    function injectStyles() {
        if (document.getElementById('ghp-vscode-styles')) return;
        const style = document.createElement('style');
        style.id = 'ghp-vscode-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    function getRepoPath() {
        const match = window.location.pathname.match(/^\/([^\/]+\/[^\/]+)$/);
        return match ? match[1] : null;
    }

    function addVSCodeButton() {
        if (document.querySelector('.btn-ghp-vscode')) return;

        const repoPath = getRepoPath();
        if (!repoPath) return;

        const container = document.querySelector('.OverviewContent-module__Box_6__Y_Yb_');
        if (!container) return;

        const repoUrl = `${window.location.origin}/${repoPath}.git`;
        const vscodeUrl = `vscode://vscode.git/clone?url=${encodeURIComponent(repoUrl)}`;

        const btn = document.createElement('a');
        btn.href = vscodeUrl;
        btn.className = 'btn-ghp-vscode';
        btn.title = 'Open in VS Code';
        btn.innerHTML = `
            <svg fill="currentColor" viewBox="0 0 32 32">
                <path d="M30.865 3.448l-6.583-3.167c-0.766-0.37-1.677-0.214-2.276 0.385l-12.609 11.505-5.495-4.167c-0.51-0.391-1.229-0.359-1.703 0.073l-1.76 1.604c-0.583 0.526-0.583 1.443-0.005 1.969l4.766 4.349-4.766 4.349c-0.578 0.526-0.578 1.443 0.005 1.969l1.76 1.604c0.479 0.432 1.193 0.464 1.703 0.073l5.495-4.172 12.615 11.51c0.594 0.599 1.505 0.755 2.271 0.385l6.589-3.172c0.693-0.333 1.13-1.031 1.13-1.802v-21.495c0-0.766-0.443-1.469-1.135-1.802zM24.005 23.266l-9.573-7.266 9.573-7.266z"/>
            </svg>
            <span>VS Code</span>
        `;

        container.appendChild(btn);
    }

    injectStyles();
    addVSCodeButton();

    let debounceFrame;
    const observer = new MutationObserver(() => {
        if (debounceFrame) cancelAnimationFrame(debounceFrame);
        debounceFrame = requestAnimationFrame(addVSCodeButton);
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();