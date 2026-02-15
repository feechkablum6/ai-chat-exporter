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

    // Selector for the main card link wrapper
    // Based on provided HTML: <a class="avIL3e" ... href="/viewer/place?mid=...">
    // Inside is <div class="nrsimc zrqkEf">
    var cardLinks = container.querySelectorAll('a.avIL3e[href*="/viewer/place"]');

    cardLinks.forEach(function(linkEl) {
      var cardInner = linkEl.querySelector('.nrsimc');
      if (!cardInner) return;

      var data = extractPlaceData(linkEl);
      if (!data.title) return; // Skip if main data missing

      var newCard = renderPlaceCard(data);

      // The link element usually resides in a wrapper div managed by a controller.
      // We want to replace the top-most meaningful container of this card to avoid nesting issues.
      // In the provided HTML: div[jscontroller="L7HJxc"] wraps the <a>.
      // We can just replace the <a> tag itself, but we should make sure we don't leave empty wrapper garbage.
      // Replacing the <a> is safe enough.
      linkEl.replaceWith(newCard);
    });
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
    var imgEl = linkEl.querySelector('img.DRzC0d');
    if (imgEl) {
      data.imageSrc = imgEl.getAttribute('src') || imgEl.getAttribute('data-src');
    }

    // 2. Title
    var titleEl = linkEl.querySelector('.Vo3rib');
    if (titleEl) {
      data.title = normalizeText(titleEl.textContent);
    }

    // 3. Rating & Reviews
    // Rating: <span aria-label="Rated 4.8 out of 5.0">4.8</span>
    var ratingEl = linkEl.querySelector('.tZJLob span[aria-label^="Rated"]');
    if (ratingEl) {
      data.rating = normalizeText(ratingEl.textContent);
    }

    // Reviews: <span role="img" aria-label="656 reviews">(656)</span>
    var reviewsEl = linkEl.querySelector('.tZJLob span[role="img"]');
    if (!reviewsEl) {
       // Fallback: try finding text like "(123)"
       var spans = linkEl.querySelectorAll('.tZJLob span');
       for (var i = 0; i < spans.length; i++) {
         var t = spans[i].textContent.trim();
         if (t.startsWith('(') && t.endsWith(')')) {
           reviewsEl = spans[i];
           break;
         }
       }
    }
    if (reviewsEl) {
      data.reviews = normalizeText(reviewsEl.textContent);
    }

    // 4. Type/Category
    // It's usually in a .yenbH div, but hard to distinguish from address.
    // In "Nagornyy Park":
    // <div class="yenbH"><span>Park</span></div>
    // <div class="yenbH"><span>Barnaul...</span></div>
    // The structure is qVQqXe > Fe6VC (title) > bX9Mhc (rating+type row) > yenbH (address)

    var contentSide = linkEl.querySelector('.qVQqXe');
    if (contentSide) {
      // Find rows
      var rows = Array.from(contentSide.querySelectorAll('.yenbH'));

      // Filter out rows inside bX9Mhc if that's structural for rating
      // Actually, looking at HTML:
      // .bX9Mhc contains:
      //    .yenbH (rating block)
      //    .yenbH (Type: "Park")

      // Let's iterate all .yenbH and try to classify
      rows.forEach(function(row) {
        if (row.querySelector('.tZJLob')) return; // This is rating row

        var text = normalizeText(row.textContent);
        if (!text) return;

        // Heuristic: If it has digits and commas, likely address. If short alpha, likely type.
        // Or "Open" / "Closed" status
        if (text === 'Open' || text === 'Closed' || row.querySelector('.rA3FMd') || row.querySelector('.LNNYD')) {
           data.meta.push(text);
        } else if (/\d+/.test(text) && text.length > 10) {
           // Likely address (has zip or street number)
           data.meta.push(text);
        } else {
           // Likely Type (e.g. "Park", "Restaurant")
           // But could be short address "Main St".
           // Usually Type comes before address.
           if (!data.type) data.type = text;
           else data.meta.push(text);
        }
      });
    }

    // 5. Tags
    // .tvkKKe contains spans
    var tagsContainer = linkEl.querySelector('.tvkKKe');
    if (tagsContainer) {
      var tagSpans = tagsContainer.querySelectorAll('span');
      tagSpans.forEach(function(s) {
        var t = normalizeText(s.textContent);
        if (t && t !== '·') {
          data.tags.push(t);
        }
      });
    }

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
      // Simple representation of stars based on score
      var scoreNum = parseFloat(data.rating) || 0;
      var starStr = '★★★★★'.substring(0, Math.round(scoreNum));
      var emptyStarStr = '☆☆☆☆☆'.substring(0, 5 - Math.round(scoreNum));
      stars.textContent = starStr + emptyStarStr;
      ratingRow.appendChild(stars);

      if (data.reviews) {
        var reviews = document.createElement('span');
        reviews.className = 'ai-place-reviews';
        reviews.textContent = data.reviews;
        ratingRow.appendChild(reviews);
      }

      // Type can sit here or below
      if (data.type) {
         var typeSpan = document.createElement('span');
         typeSpan.className = 'ai-place-type';
         typeSpan.textContent = ' · ' + data.type;
         ratingRow.appendChild(typeSpan);
      }

      details.appendChild(ratingRow);
    } else if (data.type) {
       // If no rating, just show type
       var typeRow = document.createElement('div');
       typeRow.className = 'ai-place-meta';
       typeRow.textContent = data.type;
       details.appendChild(typeRow);
    }

    // Meta (Address, Open status)
    if (data.meta && data.meta.length > 0) {
      var metaDiv = document.createElement('div');
      metaDiv.className = 'ai-place-meta';
      metaDiv.textContent = data.meta.join(' · ');
      details.appendChild(metaDiv);
    }

    // Tags
    if (data.tags && data.tags.length > 0) {
      var tagsDiv = document.createElement('div');
      tagsDiv.className = 'ai-place-tags';
      tagsDiv.textContent = data.tags.join(' · ');
      details.appendChild(tagsDiv);
    }

    link.appendChild(details);
    card.appendChild(link);

    return card;
  }

  parser.processPlaceCards = processPlaceCards;
})();
