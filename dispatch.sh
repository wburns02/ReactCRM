#!/bin/bash
# CRM Implementation Dispatcher
# Run from: C:\Users\Will\crm-work\ReactCRM (or WSL equivalent)

claude --dangerously-skip-permissions -p "
You are entering IMPLEMENTATION DISPATCHER MODE.

=== STEP 1: READ THE QUEUE ===
Read /analysis/implementation_queue.md completely.
This is your master task list with priorities and linked analysis.

=== STEP 2: IDENTIFY NEXT TASK ===
Find the FIRST unchecked item in P0 (Critical) section.
If P0 is complete, move to P1 (High Value).

=== STEP 3: LOAD CONTEXT ===
For the selected task, read ALL linked files:
- The module analysis file(s)
- The research file(s)
- Integration matrix if listed
- Automation opportunities if listed
- UX audit if listed
- Data model recommendations if listed

Understand the FULL context before writing any code.

=== STEP 4: PLAN ===
Create /implementation/[feature_name]/plan.md with:
- Requirements (from analysis)
- Technical approach
- Data model changes needed
- API endpoints to create/modify
- UI components to build
- Integration points
- Test scenarios

=== STEP 5: IMPLEMENT ===
Build the feature:
- Backend first (models, services, API)
- Frontend second (components, pages)
- Integration third (connect to other modules)
- Follow existing code patterns (read claude.md)

=== STEP 6: TEST ===
Write and run Playwright tests:
- Happy path
- Error cases
- Edge cases
- Integration with other modules

Loop until ALL tests pass. No fake tests.

=== STEP 7: EVIDENCE ===
Create /evidence/[feature_name]/ with:
- Screenshots of working feature
- Test results
- Implementation notes

=== STEP 8: COMMIT ===
Git commit with descriptive message:
'feat([module]): [Feature Name] - [brief description]'

=== STEP 9: UPDATE QUEUE ===
Edit /analysis/implementation_queue.md:
- Check off completed item: [x]
- Move to Completed section with commit hash
- Update Progress Tracker counts

=== STEP 10: CONTINUE ===
Return to STEP 2 and pick next item.
Continue until all P0 items are complete.
Then proceed to P1.

=== RULES ===
1. ONE ITEM AT A TIME - finish completely before moving on
2. READ ANALYSIS FIRST - don't skip the context
3. TEST EVERYTHING - Playwright verification required
4. UPDATE QUEUE - track your progress
5. COMMIT OFTEN - small, working increments
6. EVIDENCE BUNDLES - prove it works

=== BEGIN ===
Start now. Read implementation_queue.md. Pick first P0 item. Go.
"
