(function () {
    const REPO_PER_PAGE = 30;

    function addPagination() {
        if (!window.location.search.includes('tab=repositories')) return;

        const repoTab = document.querySelector('a[data-tab-item="repositories"]');
        const counterLabel = repoTab?.querySelector('.Counter, [class*="CounterLabel"]');

        if (!counterLabel || document.querySelector('.custom-repo-pagination')) return;

        const repoCount = parseInt(counterLabel.textContent.replace(/,/g, '').trim());
        if (isNaN(repoCount) || repoCount <= REPO_PER_PAGE) return;

        const defaultPagination = document.querySelector('.paginate-container');
        if (defaultPagination) defaultPagination.style.display = 'none';

        const totalPages = Math.ceil(repoCount / REPO_PER_PAGE);
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = parseInt(urlParams.get('page')) || 1;

        const container = document.createElement('div');
        container.className = 'custom-repo-pagination d-flex flex-justify-center my-4 py-3';
        container.style.cssText = 'gap: 8px; border-top: 1px solid var(--color-border-muted);';

        const createBtn = (text, page, isActive = false, isDisabled = false) => {
            const btn = document.createElement(isDisabled ? 'span' : 'a');
            btn.textContent = text;
            btn.className = `btn btn-sm d-flex flex-items-center flex-justify-center ${isActive ? 'btn-primary' : ''} ${isDisabled ? 'disabled' : ''}`;
            btn.style.minWidth = '32px';
            if (!isDisabled) {
                btn.href = `${window.location.pathname}?tab=repositories&page=${page}`;
            }
            return btn;
        };

        const pages = [];
        const sidePages = 5;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - sidePages && i <= currentPage + sidePages)) {
                pages.push(i);
            }
        }

        container.appendChild(createBtn('Previous', currentPage - 1, false, currentPage === 1));

        let lastPage = 0;
        pages.forEach(page => {
            if (lastPage !== 0 && page - lastPage > 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'd-flex flex-items-center px-2';
                container.appendChild(ellipsis);
            }
            container.appendChild(createBtn(page, page, page === currentPage));
            lastPage = page;
        });

        container.appendChild(createBtn('Next', currentPage + 1, false, currentPage === totalPages));

        const profileFrame = document.querySelector('#user-profile-frame');
        if (profileFrame) profileFrame.appendChild(container);
    }

    let debounceFrame;
    const observer = new MutationObserver(() => {
        if (!window.location.search.includes('tab=repositories')) return;

        if (debounceFrame) cancelAnimationFrame(debounceFrame);
        debounceFrame = requestAnimationFrame(addPagination);
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();