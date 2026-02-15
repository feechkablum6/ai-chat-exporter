/**
 * parser/places.js
 * Parsing and normalizing Google Maps Place cards in AI responses.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  var normalizeText = parser.normalizeText || function(t) { return t ? t.trim() : ''; };

  /**
   * Processes place cards in the container and replaces them with simplified HTML.
   */
  function processPlaceCards(container) {
    if (!container || !container.querySelectorAll) return;

    // 1. Find all potential place card links
    // We look for links that point to Google Maps or Place Viewer
    var links = container.querySelectorAll('a');
    var placeLinks = [];

    links.forEach(function(link) {
      var href = link.getAttribute('href') || '';
      // Common patterns for place cards in AI chat
      // href usually looks like /url?q=https://www.google.com/maps/place/...
      // or /viewer/place/...
      if (
        href.includes('/maps/place') ||
        href.includes('/viewer/place') ||
        (href.includes('/search?') && href.includes('place_id')) ||
        (href.includes('google.com/maps'))
      ) {
        // Additional check: valid place card usually has an image or significant text
        if (link.querySelector('img') || link.textContent.length > 10) {
          placeLinks.push(link);
        }
      }
    });

    placeLinks.forEach(function(linkEl) {
      // Prevent double processing
      if (linkEl.hasAttribute('data-ai-place-processed')) return;

      var data = extractPlaceData(linkEl);
      if (!data.title) return; // Skip if main data missing

      // Protect container from cleanup
      protectContainer(linkEl);

      var newCard = renderPlaceCard(data);
      linkEl.setAttribute('data-ai-place-processed', 'true');

      // Replace the link with our new card
      linkEl.replaceWith(newCard);
    });
  }

  /**
   * Removes 'role="navigation"' or similar attributes from parent containers
   * to prevent them from being removed by parser/clean.js
   */
  function protectContainer(element) {
    var parent = element.parentElement;
    // Traverse up a few levels to find the list container
    for (var i = 0; i < 6; i++) {
      if (!parent) break;

      var role = parent.getAttribute('role');
      if (role === 'navigation' || role === 'list' || role === 'listitem') {
        parent.removeAttribute('role');
      }

      if (parent.hasAttribute('jscontroller')) parent.removeAttribute('jscontroller');
      if (parent.hasAttribute('jsaction')) parent.removeAttribute('jsaction');

      parent = parent.parentElement;
    }
  }

  function extractPlaceData(linkEl) {
    var data = {
      url: linkEl.getAttribute('href'),
      title: '',
      imageSrc: '',
      rating: '',
      reviews: '',
      type: '',
      meta: [],
      tags: []
    };

    // 1. Image
    // Often lazy loaded with data-src. We want the largest one usually.
    var imgs = linkEl.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];
        var src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src && !src.includes('data:image/gif;base64') && src.length > 50) {
            // Likely a real image, not a spacer
            data.imageSrc = src;
            break;
        }
    }
    // Fallback if no large src found
    if (!data.imageSrc && imgs.length > 0) {
        data.imageSrc = imgs[0].getAttribute('src') || imgs[0].getAttribute('data-src');
    }

    // 2. Title
    // Try to find the largest text or specific headings
    var titleEl = linkEl.querySelector('[role="heading"], h3, .Vo3rib, .tit');
    if (titleEl) {
      data.title = normalizeText(titleEl.textContent);
    } else {
      // Fallback: look for bold text or large text
      var bold = linkEl.querySelector('b, strong, [style*="font-weight: bold"], [style*="font-weight:700"]');
      if (bold) {
          data.title = normalizeText(bold.textContent);
      }
    }

    // Fallback 2: First significant text line
    if (!data.title) {
        var text = linkEl.innerText || '';
        var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
        if (lines.length > 0) {
            data.title = lines[0]; // Assume first line is title
        }
    }

    // 3. Rating & Reviews
    // Look for aria-label "Rated X out of 5"
    var ratingEl = linkEl.querySelector('[aria-label*="Rated"], [aria-label*="Rating"], [aria-label*="stars"]');
    if (ratingEl) {
      var aria = ratingEl.getAttribute('aria-label');
      var match = aria.match(/([\d\.,]+)/);
      if (match) data.rating = match[1];
    } else {
       // Look for text content like "4.8" followed by stars char or image
       // Or class .tZJLob
       var scoreEl = linkEl.querySelector('.YDIN4c, .tZJLob span, span[aria-hidden="true"]');
       if (scoreEl && /^[\d\.,]+$/.test(scoreEl.textContent.trim())) {
         data.rating = scoreEl.textContent.trim();
       }
    }

    // Reviews count: usually "(656)"
    var allText = linkEl.textContent;
    var reviewsMatch = allText.match(/\(([\d\s,kK\+]+)\)/);
    if (reviewsMatch) {
      data.reviews = reviewsMatch[0];
    }

    // 4. Type and Metadata
    // Extract everything else
    var fullText = linkEl.innerText || '';
    var lines = fullText.split('\n');

    lines.forEach(function(line) {
      line = normalizeText(line);
      if (!line) return;
      if (line === data.title) return;
      if (data.rating && line.includes(data.rating)) return;
      if (data.reviews && line.includes(data.reviews)) return;
      if (line === '·') return;

      // Filter out obvious noise
      if (line === 'Open' || line === 'Closed' || line.includes('Opens') || line.includes('Closes')) {
         // Keep "Open/Closed" as meta?
         // data.meta.push(line);
         // Actually in screenshot "Open" is green. Maybe keep it.
         return;
      }

      // If looks like Type
      if (!data.type && /^[A-Z][a-z\s]+$/.test(line) && line.length < 30 && !/\d/.test(line)) {
          data.type = line;
      } else {
          // Address or tags
          if (!data.meta.includes(line)) {
             data.meta.push(line);
          }
      }
    });

    return data;
  }

  function renderPlaceCard(data) {
    var card = document.createElement('div');
    card.className = 'ai-place-card';

    var link = document.createElement('a');
    link.className = 'ai-place-link';
    link.href = data.url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    // Left: Image
    if (data.imageSrc) {
      var imgWrap = document.createElement('div');
      imgWrap.className = 'ai-place-image-wrapper';

      var img = document.createElement('img');
      img.className = 'ai-place-image';
      img.src = data.imageSrc;
      img.alt = data.title;
      img.referrerPolicy = 'no-referrer'; // Avoid 403 on Google images sometimes
      imgWrap.appendChild(img);
      link.appendChild(imgWrap);
    }

    // Right: Details
    var details = document.createElement('div');
    details.className = 'ai-place-details';

    // Title
    var title = document.createElement('div');
    title.className = 'ai-place-title';
    title.textContent = data.title;
    details.appendChild(title);

    // Rating Row
    if (data.rating) {
      var ratingRow = document.createElement('div');
      ratingRow.className = 'ai-place-rating-row';

      var score = document.createElement('span');
      score.className = 'ai-place-score';
      score.textContent = data.rating;
      ratingRow.appendChild(score);

      var stars = document.createElement('span');
      stars.className = 'ai-place-stars';
      var scoreNum = parseFloat(data.rating.replace(',', '.')) || 0;
      var starStr = '';
      for(var i=1; i<=5; i++) {
        starStr += (scoreNum >= i) ? '★' : '☆';
      }
      stars.textContent = starStr;
      ratingRow.appendChild(stars);

      if (data.reviews) {
        var reviews = document.createElement('span');
        reviews.className = 'ai-place-reviews';
        reviews.textContent = data.reviews;
        ratingRow.appendChild(reviews);
      }

      if (data.type) {
         var typeSpan = document.createElement('span');
         typeSpan.className = 'ai-place-type';
         typeSpan.textContent = ' · ' + data.type;
         ratingRow.appendChild(typeSpan);
      }

      details.appendChild(ratingRow);
    } else if (data.type) {
       var typeRow = document.createElement('div');
       typeRow.className = 'ai-place-meta';
       typeRow.textContent = data.type;
       details.appendChild(typeRow);
    }

    // Meta (Address, etc)
    // Filter out tags that look like meta
    var validMeta = data.meta.filter(function(m) {
      return m !== data.type && !data.tags.includes(m);
    });

    // Deduplicate
    validMeta = validMeta.filter(function(item, pos) {
        return validMeta.indexOf(item) == pos;
    });

    if (validMeta.length > 0) {
      var metaDiv = document.createElement('div');
      metaDiv.className = 'ai-place-meta';
      // Join with middot
      metaDiv.textContent = validMeta.join(' · ');
      details.appendChild(metaDiv);
    }

    link.appendChild(details);
    card.appendChild(link);

    return card;
  }

  parser.processPlaceCards = processPlaceCards;
})();
