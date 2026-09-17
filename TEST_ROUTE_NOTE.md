# Temporary multi-partner test route

A frozen snapshot of the `multi-partner-admin-v1` branch is published under `/multi-partner-test/` for isolated browser testing. The production `/PWA/consolidated-v1/` files are not modified by the test snapshot.

Test Companion: `/multi-partner-test/PWA/consolidated-v1/`

Test Admin: `/multi-partner-test/PWA/admin/`

Do not use the Admin-generated Companion link in WhatsApp during the first test pass because the current admin snapshot still embeds the production Companion URL. Use the Test Companion URL above manually until the portability tweak is merged into the snapshot.
