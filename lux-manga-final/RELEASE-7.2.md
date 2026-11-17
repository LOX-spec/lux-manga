# 7.2: Manga Arabia official chapter updates

Enabled the published https://www.mangaarabia.com/rss.xml feed in source management and Add Source. The feed currently contains10 chapter updates. The new button displays those titles inside LUX and opens chapters on the publisher site. This is a latest-update feed, not the complete catalogue or an in-app image reader. Media-edit references are excluded and no chapter images or protected assets are retrieved.

Toon Arab /rss.xml and /feed.xml returned406 without valid RSS. Its source remains external; no bypass was attempted.

QA: real published XML parsed into10 valid same-origin chapter links. Synthetic tests cover duplicates, foreign/edit URLs, 403/429/404 and offline failures. Build and UX checks pass.
