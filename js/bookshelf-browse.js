/**
 * AuthorKit Bookshelf - Browse Page JavaScript
 * Handles filtering, pagination, and book loading for the browse page
 */

let currentPage = 1;
let currentGenre = null;
let currentSearch = '';
let currentSort = 'latest';
let totalPages = 1;

/**
 * Initialize browse page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Get initial filters from URL
    currentGenre = getUrlParam('genre');
    currentSearch = getUrlParam('search') || '';
    currentSort = getUrlParam('sort') || 'latest';
    currentPage = parseInt(getUrlParam('page')) || 1;

    // Set initial filter states
    if (currentGenre) {
        const genreCheckbox = document.querySelector(`input[name="genre"][value="${currentGenre}"]`);
        if (genreCheckbox) {
            genreCheckbox.checked = true;
            document.querySelector('input[name="genre"][value="all"]').checked = false;
        }
    }

    if (currentSearch) {
        document.getElementById('search-input').value = currentSearch;
    }

    if (currentSort) {
        document.getElementById('sort-select').value = currentSort;
    }

    // Set up event listeners
    setupEventListeners();

    // Load initial books
    loadBooks();
});

/**
 * Set up event listeners for filters
 */
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce((e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        updateUrlParams({ search: currentSearch, page: currentPage });
        loadBooks();
    }, 500));

    // Genre checkboxes
    const genreCheckboxes = document.querySelectorAll('input[name="genre"]');
    genreCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.value === 'all') {
                // Uncheck all other genres
                genreCheckboxes.forEach(cb => {
                    if (cb.value !== 'all') cb.checked = false;
                });
                currentGenre = null;
            } else {
                // Uncheck "All Genres"
                document.querySelector('input[name="genre"][value="all"]').checked = false;

                // Get selected genre (only one allowed)
                const selectedGenres = Array.from(genreCheckboxes)
                    .filter(cb => cb.checked && cb.value !== 'all')
                    .map(cb => cb.value);

                // Uncheck all except the current one
                genreCheckboxes.forEach(cb => {
                    if (cb.value !== 'all' && cb.value !== e.target.value) {
                        cb.checked = false;
                    }
                });

                currentGenre = selectedGenres[0] || null;
            }

            currentPage = 1;
            updateUrlParams({ genre: currentGenre, page: currentPage });
            loadBooks();
        });
    });

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        updateUrlParams({ sort: currentSort, page: currentPage });
        loadBooks();
    });

    // Reset filters button
    const resetBtn = document.getElementById('reset-filters');
    resetBtn.addEventListener('click', () => {
        // Reset all filters
        currentGenre = null;
        currentSearch = '';
        currentSort = 'latest';
        currentPage = 1;

        // Reset UI
        document.getElementById('search-input').value = '';
        document.getElementById('sort-select').value = 'latest';
        document.querySelectorAll('input[name="genre"]').forEach(cb => {
            cb.checked = cb.value === 'all';
        });

        // Update URL and reload
        updateUrlParams({ genre: null, search: null, sort: null, page: null });
        loadBooks();
    });
}

/**
 * Load books from API
 */
async function loadBooks() {
    const grid = document.getElementById('books-grid');
    const resultsCount = document.getElementById('results-count');

    // Show loading state
    grid.innerHTML = '<div class="loading">Loading books...</div>';
    resultsCount.textContent = 'Loading...';

    try {
        // Build API URL
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            sort: currentSort
        });

        if (currentGenre) {
            params.append('genre', currentGenre);
        }

        if (currentSearch) {
            params.append('search', currentSearch);
        }

        const response = await fetch(`/api/bookshelf/books?${params.toString()}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load books');
        }

        // Update pagination info
        totalPages = data.pagination.pages;

        // Update results count
        const { total, page, limit } = data.pagination;
        const startNum = (page - 1) * limit + 1;
        const endNum = Math.min(page * limit, total);

        if (total === 0) {
            resultsCount.textContent = 'No books found';
        } else {
            resultsCount.textContent = `Showing ${startNum}-${endNum} of ${total} books`;
        }

        // Render books
        grid.innerHTML = '';

        if (data.books.length === 0) {
            grid.innerHTML = '<p class="no-books">No books found matching your filters. Try adjusting your search or genre selection.</p>';
        } else {
            data.books.forEach(book => {
                grid.appendChild(createBookCard(book));
            });
        }

        // Render pagination
        renderPagination(data.pagination);

        // Scroll to top of results
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Failed to load books:', error);
        grid.innerHTML = '<p class="error">Failed to load books. Please try again later.</p>';
        resultsCount.textContent = 'Error loading books';
    }
}

/**
 * Render pagination controls
 * @param {Object} pagination - Pagination data from API
 */
function renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    if (pagination.pages <= 1) {
        return; // No pagination needed
    }

    const { page, pages } = pagination;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '← Previous';
    prevBtn.disabled = page === 1;
    prevBtn.addEventListener('click', () => {
        if (page > 1) {
            currentPage = page - 1;
            updateUrlParams({ page: currentPage });
            loadBooks();
        }
    });
    paginationContainer.appendChild(prevBtn);

    // Page number buttons (show max 7 buttons)
    const maxButtons = 7;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(pages, startPage + maxButtons - 1);

    // Adjust start if we're near the end
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // First page + ellipsis if needed
    if (startPage > 1) {
        const firstBtn = createPageButton(1, page);
        paginationContainer.appendChild(firstBtn);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '10px';
            paginationContainer.appendChild(ellipsis);
        }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPageButton(i, page);
        paginationContainer.appendChild(pageBtn);
    }

    // Last page + ellipsis if needed
    if (endPage < pages) {
        if (endPage < pages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '10px';
            paginationContainer.appendChild(ellipsis);
        }

        const lastBtn = createPageButton(pages, page);
        paginationContainer.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = page === pages;
    nextBtn.addEventListener('click', () => {
        if (page < pages) {
            currentPage = page + 1;
            updateUrlParams({ page: currentPage });
            loadBooks();
        }
    });
    paginationContainer.appendChild(nextBtn);
}

/**
 * Create a page number button
 * @param {number} pageNum - Page number
 * @param {number} currentPage - Current active page
 * @returns {HTMLElement} Button element
 */
function createPageButton(pageNum, currentPage) {
    const btn = document.createElement('button');
    btn.className = 'page-btn';
    btn.textContent = pageNum;

    if (pageNum === currentPage) {
        btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
        window.currentPage = pageNum;
        updateUrlParams({ page: pageNum });
        loadBooks();
    });

    return btn;
}
