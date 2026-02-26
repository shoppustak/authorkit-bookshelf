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
 * Track which books have been viewed (to avoid duplicate tracking)
 */
const viewedBooks = new Set();

/**
 * Intersection Observer for tracking book views
 * Tracks when a book card becomes visible in the viewport
 */
const viewObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const bookId = entry.target.dataset.bookId;

      // Only track once per book per session
      if (bookId && !viewedBooks.has(bookId)) {
        viewedBooks.add(bookId);
        trackBookView(bookId);
      }
    }
  });
}, {
  threshold: 0.5, // Book must be 50% visible
  rootMargin: '0px'
});

/**
 * Tracks a book view by sending to analytics API
 * @param {number} bookId - Book ID to track
 */
async function trackBookView(bookId) {
  try {
    await fetch('/api/bookshelf/track-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ book_id: bookId })
    });
  } catch (error) {
    // Silently fail - don't break the page if tracking fails
    console.debug('Failed to track view:', error);
  }
}

/**
 * Creates a book card element
 * @param {Object} book - Book data from API
 * @returns {HTMLElement} Book card element
 */
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.bookId = book.id; // For view tracking

    // Cover image wrapper
    const coverWrapper = document.createElement('div');
    coverWrapper.className = 'book-cover-wrapper';

    const coverImg = document.createElement('img');
    coverImg.src = book.cover.medium || book.cover.large || '/images/placeholder-book.jpg';
    coverImg.alt = book.title;
    coverImg.className = 'book-cover';
    coverImg.loading = 'lazy';
    coverWrapper.appendChild(coverImg);

    // View count badge overlay (if views > 0)
    if (book.view_count && book.view_count > 0) {
        const viewBadge = document.createElement('div');
        viewBadge.className = 'view-count-badge';
        viewBadge.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>${formatViewCount(book.view_count)}</span>
        `;
        coverWrapper.appendChild(viewBadge);
    }

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

    // Primary button - Amazon/Buy link (or other purchase link)
    const amazonLink = book.purchase_links.amazon_com || book.purchase_links.amazon_in;
    const otherLink = book.purchase_links.other;

    if (amazonLink || otherLink) {
        const buyBtn = document.createElement('a');
        buyBtn.href = amazonLink ? addAffiliateTag(amazonLink) : otherLink;
        buyBtn.textContent = amazonLink ? 'Buy on Amazon' : 'Buy Book';
        buyBtn.className = 'btn-buy';
        buyBtn.target = '_blank';
        buyBtn.rel = 'noopener noreferrer nofollow';
        actions.appendChild(buyBtn);
    }

    // Secondary button - View on Author's Site (eye icon)
    const authorSiteBtn = document.createElement('a');
    // Construct proper book URL - use source_post_id to link to actual book page
    const bookUrl = book.source_post_id
        ? `${book.author.site_url}/?p=${book.source_post_id}`
        : book.slug
            ? `${book.author.site_url}/book/${book.slug}/`
            : book.author.site_url;

    authorSiteBtn.href = bookUrl;
    authorSiteBtn.className = 'btn-view-site';
    authorSiteBtn.target = '_blank';
    authorSiteBtn.rel = 'noopener noreferrer';
    authorSiteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    authorSiteBtn.title = "View on author's site";
    actions.appendChild(authorSiteBtn);

    info.appendChild(actions);
    card.appendChild(info);

    // Attach Intersection Observer for view tracking
    viewObserver.observe(card);

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

/**
 * Formats view count for display
 * Converts large numbers to readable format (e.g., 1.2K, 5.3K)
 * @param {number} count - View count
 * @returns {string} Formatted count
 */
function formatViewCount(count) {
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
}
