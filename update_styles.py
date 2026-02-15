import sys

new_css = """
        /* Google Maps Places Card Styles */
        .ai-place-card {
            margin: 16px 0;
            border: 1px solid #dadce0;
            border-radius: 8px;
            overflow: hidden;
            font-family: 'Google Sans', Roboto, sans-serif;
            background: #fff;
            max-width: 600px;
        }

        .ai-place-link {
            display: flex;
            text-decoration: none;
            color: inherit;
            overflow: hidden;
            align-items: flex-start;
        }

        .ai-place-link:hover {
            background-color: #f8f9fa;
        }

        .ai-place-image-wrapper {
            flex: 0 0 84px;
            width: 84px;
            height: 84px;
            margin: 12px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            overflow: hidden;
            position: relative;
        }

        .ai-place-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .ai-place-details {
            flex: 1;
            padding: 12px 12px 12px 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
            gap: 2px;
        }

        .ai-place-title {
            font-size: 16px;
            font-weight: 500;
            color: #202124;
            margin-bottom: 2px;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .ai-place-link:hover .ai-place-title {
            text-decoration: underline;
            color: #1a73e8;
        }

        .ai-place-rating-row {
            display: flex;
            align-items: center;
            font-size: 14px;
            color: #70757a;
            margin-bottom: 2px;
            line-height: 1.4;
        }

        .ai-place-score {
            color: #202124;
            font-weight: 500;
            margin-right: 4px;
        }

        .ai-place-stars {
            color: #fbbc04;
            letter-spacing: -1px;
            margin-right: 4px;
        }

        .ai-place-reviews {
            color: #70757a;
            margin-right: 4px;
        }

        .ai-place-type {
            color: #70757a;
        }

        .ai-place-meta {
            font-size: 14px;
            color: #70757a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
        }

        @media (max-width: 500px) {
            .ai-place-image-wrapper {
                flex: 0 0 72px;
                width: 72px;
                height: 72px;
            }
            .ai-place-title {
                font-size: 15px;
            }
        }
"""

with open('generator/styles.js', 'r') as f:
    content = f.read()

# Marker is </style>`;
marker = '</style>`;'

if marker not in content:
    print("Error: Marker not found")
    sys.exit(1)

# Split by the LAST occurrence of the marker to be safe (though likely unique)
parts = content.rsplit(marker, 1)

# Parts[0] is everything before </style>`;
# Parts[1] is everything after.

# Clean up Parts[1]: Should only contain the closure.
# Remove anything after })();
closure = '})();'
p1 = parts[1]
idx = p1.find(closure)
if idx != -1:
    p1 = p1[:idx + len(closure)]

final_content = parts[0] + new_css + marker + "\n" + p1

with open('generator/styles.js', 'w') as f:
    f.write(final_content)

print("Updated generator/styles.js successfully")
