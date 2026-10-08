# NOCAP

A Chrome extension that analyzes YouTube captions and displays a credibility widget. Version 1.3 adds a settings popup and a browser-wide toggle for the widget.

## Current implementation

- Extract captions from the YouTube page without an API key.
- Skip analysis for detected music videos, games, and trailers.
- Apply keyword-based penalties for selected conspiracy or pseudoscience terms.
- Fetch Wikipedia context through the service worker and add it to the analysis prompt.
- Run model inference in the browser.
- Synchronize the enabled state through the Storage API.
- Provide a popup with website and rating links.
- Publish a free landing page through GitHub Actions and GitHub Pages.

The model runs locally, but Wikipedia context retrieval makes network requests. Retrieved context and keyword checks do not guarantee that an analysis is correct.

Version 1.2 addressed unstyled widget flashes, navigation issues, and closing behavior during dragging. The paid-feature interface was removed.

## Planned work

- Extract video frames with canvas and evaluate lightweight ONNX models through WebGL or WebGPU for possible deepfake detection.
- Incorporate channel reputation into analysis.
- Package the extension for other Chromium browsers, including Edge and Whale.
