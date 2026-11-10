---
"@webmcp-agents/core": patch
---

- core: the cursor never presses out of sight. A control outside the viewport is scrolled to the middle and the press waits until it is there, the cursor waiting at the viewport's edge meanwhile (it used to click mid-scroll, before the control was visible; a tool that navigates left the page with nothing seen).
- core: a control in a sticky or fixed box (a header, a drawer) that is already in view no longer scrolls the page.
- core: after a click the cursor fades out as soon as the control it pressed is no longer under it (a drawer opened over it, the list shifted, it was removed or hidden), instead of resting on the wrong spot for `linger` ms. A control hidden mid-move no longer sends the cursor to the page's corner.
- core: a `requireConfirmation` call always shows where to confirm. The cursor returns to the parked control once the person goes quiet (scrolling to one they were never shown), waits at the viewport's edge with the prompt when the control is out of view, and moves to the control the tool's `target` resolves to when that changes while it waits. The call fails with `unavailable`, instead of waiting for ever, when CSS hides its only control.
- core: a `requireConfirmation` call no longer waits for ever. After 10 s without the person's click it fails with `needs_user`. A call the person starts themself (one that begins within a second of their click elsewhere: a button or chip that runs a tool, the devtools) cancels a waiting confirmation, which answers `cancelled`.
- core: an agent's own call made while a `requireConfirmation` call waits no longer takes the "click to confirm" prompt along to its own control, and the cursor returns to the waiting control (prompt and ring) when that call is done. It used to stay where the other call left it, with nothing pointing at the confirmation.
- core: a control pressed while the cursor had yielded gets the ring for a moment.
- core: calls never wait on frames that are not drawn: a background tab runs them at once, and a move no frame finished lands by timer.
- core: a press no longer releases the cursor from a newer call's move that began within its 70 ms, and the cursor's nodes are put back when a router swaps the whole `<body>`.
- core: moving the pointer no longer makes the cursor yield; a click, a scroll, a touch or a key still does. Someone who started a call and moved the mouse off the button used to see no cursor at all. `yieldToUser: { moveThreshold: 6 }` brings the old behaviour back.

Bundle budgets raised to 10 KB (visuals) and 17.5 KB (whole package).
