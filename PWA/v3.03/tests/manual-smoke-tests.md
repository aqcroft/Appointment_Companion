# Manual smoke tests

## Launch and person context

- [x] Fresh localhost load displays “Who are you talking to?”
- [x] Creating a named person opens the compact profile hub and persists locally
- [x] Appointment opens from the profile hub
- [x] Active person remains visible in the top bar
- [x] Profile progress reflects selected visible services
- [x] A saved summary appears in activity and reopens as a read-only snapshot
- [ ] Confirm likely-duplicate warning with two intentionally equal names
- [ ] Verify the three most recent people on a populated real device

## Appointment

- [x] Homeowner selection and Energy/Mobile cards reveal their compact selectors
- [x] Tenant selection removes Boiler Cover entirely and uses a three-service overview denominator
- [x] Empty legacy `actual` usage resolves to UW/database rather than an empty bill source
- [x] Live central tariff data renders 1/2/3-service indicative values
- [x] Energy + 2 Go Unlimited visibly produces Service count 3, Energy tariff 3-service, Welcome Bonus £50, UW Mobile £26 and Mobile intro benefit £39
- [x] Summary repeats those rule outputs
- [x] Partner summary preserves first-year hero, basket strip, effective Current/UW/Saving total and expandable detail
- [x] Upgrade preview is available without changing saved appointment state
- [ ] Complete a realistic monthly Direct Debit appointment
- [ ] Complete annual and split electricity/gas routes on a phone-sized viewport
- [ ] Exercise E7 direct figures, split helper, standard comparison and EV launch/return
- [ ] Exercise Broadband packages, phone, Wi-Fi and free-month offer around an April boundary
- [ ] Exercise Cashback Card assumptions and both manual adjustment types

## Sharing

- [x] Share modal states that private/admin data is excluded
- [x] Fresh-load customer hash view contains no Partner toolbar or admin controls
- [x] Customer view is visually distinct and remains usable at a 390px viewport
- [x] Customer view includes the same underlying basket figures and Upgrade preview
- [x] Customer view shows Service count 3, Energy tariff 3-service, Welcome Bonus £50 and the valid £39 Mobile benefit
- [x] Browser console contains no warning/error during tested launch, appointment, summary and share flow
- [ ] Test clipboard buttons and WhatsApp handoff on a physical phone
- [ ] Test valid basket URL and no-basket summary links

## Persistence, Cloud and deletion

- [ ] Reload a locally saved profile in an installed PWA
- [ ] Edit offline, close/reopen, reconnect and confirm Cloud acknowledgement
- [ ] Verify one-sided local/Cloud merge and genuine conflict review against the live endpoint
- [ ] Individual delete online
- [ ] Individual delete offline then reconnect
- [ ] Multi-select mixed local/Cloud deletion
- [ ] Delete the current active profile
- [ ] Validate a representative real v2.42 dataset and Cloud customer

## Unsaved work

- [ ] Allow autosave to finish, then navigate without a prompt
- [ ] Navigate during a deliberately delayed/failed local save and verify all three choices
- [ ] Confirm Save & leave persists, Leave without saving restores, and Cancel stays
- [ ] Confirm native reload/close protection appears only while truly dirty

## PWA

- [ ] Install from the production HTTPS URL
- [ ] Reopen offline after the V3 shell and EV tool have cached
- [ ] Deploy a cache version bump and verify update/old V3 cache cleanup
- [ ] Confirm network inspection shows no retired Appointment Companion donor request
