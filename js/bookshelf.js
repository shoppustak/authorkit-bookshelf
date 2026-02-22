/**
 * AuthorKit Bookshelf - Shared JavaScript
 * Common functions used across bookshelf pages
 */

/**
 * AuthorKit Amazon Affiliate Tag
 * All Amazon buy links use this tag for revenue attribution
 */
const AMAZON_AFFILIATE_TAG = 'authorkit-20'; // Update with actual tag

/**
 * Creates a book card element
 * @param {Object} book - Book data from API
 * @returns {HTMLElement} Book card element
 */
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    // Cover image wrapper
    const coverWrapper = document.createElement('div');
    coverWrapper.className = 'book-cover-wrapper';

    const coverImg = document.createElement('img');
    coverImg.src = book.cover.medium || book.cover.large || '/images/placeholder-book.jpg';
    coverImg.alt = book.title;
    coverImg.className = 'book-cover';
    coverImg.loading = 'lazy';
    coverWrapper.appendChild(coverImg);
    card.appendChild(coverWrapper);

    // Book info container
    const info = document.createElement('div');
    info.className = 'book-info';

    // Title
    const title = document.createElement('h3');
    title.className = 'book-title';
    title.textContent = book.title;
    info.appendChild(title);

    // Author
    const author = document.createElement('p');
    author.className = 'book-author';
    author.textContent = `by ${book.author.name || 'Unknown Author'}`;
    info.appendChild(author);

    // Genres
    if (book.genres && book.genres.length > 0) {
        const genresContainer = document.createElement('div');
        genresContainer.className = 'book-genres';

        book.genres.forEach(genre => {
            const badge = document.createElement('span');
            badge.className = 'genre-badge';
            badge.textContent = formatGenreName(genre);
            genresContainer.appendChild(badge);
        });

        info.appendChild(genresContainer);
    }

    // Rating
    if (book.rating && book.rating > 0) {
        const ratingContainer = document.createElement('div');
        ratingContainer.className = 'book-rating';

        const stars = document.createElement('span');
        stars.className = 'stars';
        stars.textContent = getStarRating(book.rating);
        ratingContainer.appendChild(stars);

        const ratingText = document.createElement('span');
        ratingText.textContent = `${book.rating} (${book.review_count || 0} reviews)`;
        ratingContainer.appendChild(ratingText);

        info.appendChild(ratingContainer);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'book-actions';

    // View on Author's Site button
    const viewSiteBtn = document.createElement('a');
    viewSiteBtn.href = book.author.site_url;
    viewSiteBtn.className = 'btn-view-site';
    viewSiteBtn.textContent = "View on Author's Site";
    viewSiteBtn.target = '_blank';
    viewSiteBtn.rel = 'noopener noreferrer';
    actions.appendChild(viewSiteBtn);

    // Buy on Amazon button (prefer .com, fallback to .in)
    const amazonLink = book.purchase_links.amazon_com || book.purchase_links.amazon_in;
    if (amazonLink) {
        const buyBtn = document.createElement('a');
        buyBtn.href = addAffiliateTag(amazonLink);
        buyBtn.className = 'btn-buy';
        buyBtn.textContent = 'Buy on Amazon';
        buyBtn.target = '_blank';
        buyBtn.rel = 'noopener noreferrer nofollow';
        actions.appendChild(buyBtn);
    }

    info.appendChild(actions);
    card.appendChild(info);

    return card;
}

/**
 * Formats genre slug to readable name
 * @param {string} slug - Genre slug (e.g., 'science-fiction')
 * @returns {string} Formatted genre name (e.g., 'Science Fiction')
 */
function formatGenreName(slug) {
    const genreMap = {
        'action-adventure': 'Action & Adventure',
        'childrens': "Children's Books",
        'fantasy': 'Fantasy',
        'historical-fiction': 'Historical Fiction',
        'horror': 'Horror',
        'literary-fiction': 'Literary Fiction',
        'mystery-crime': 'Mystery & Crime',
        'non-fiction': 'Non-Fiction',
        'poetry': 'Poetry',
        'romance': 'Romance',
        'science-fiction': 'Science Fiction',
        'self-help': 'Self-Help',
        'thriller-suspense': 'Thriller & Suspense',
        'young-adult': 'Young Adult',
        'other': 'Other'
    };

    return genreMap[slug] || slug;
}

/**
 * Converts numeric rating to star symbols
 * @param {number} rating - Rating from 0 to 5
 * @returns {string} Star symbols
 */
function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) +
           (hasHalfStar ? '½' : '') +
           '☆'.repeat(emptyStars);
}

/**
 * Adds Amazon affiliate tag to URL
 * @param {string} url - Amazon product URL
 * @returns {string} URL with affiliate tag
 */
function addAffiliateTag(url) {
    if (!url) return '';

    try {
        const urlObj = new URL(url);

        // Only add tag to Amazon domains
        if (!urlObj.hostname.includes('amazon.')) {
            return url;
        }

        // Add or replace tag parameter
        urlObj.searchParams.set('tag', AMAZON_AFFILIATE_TAG);

        return urlObj.toString();
    } catch (error) {
        console.error('Invalid URL:', url);
        return url;
    }
}

/**
 * Gets URL query parameters
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value
 */
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Updates URL query parameters without page reload
 * @param {Object} params - Object of parameters to update
 */
function updateUrlParams(params) {
    const urlParams = new URLSearchParams(window.location.search);

    Object.keys(params).forEach(key => {
        if (params[key]) {
            urlParams.set(key, params[key]);
        } else {
            urlParams.delete(key);
        }
    });

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
