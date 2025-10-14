# Thread and Brand Voice Management Plan

## Overview
This document outlines the plan for managing AI conversation threads and Brand Voice (system prompt) injection in Creative NodeFlow. The goal is to optimize context continuity, token efficiency, and user experience, while ensuring no existing functionality is broken during implementation.

---

## Plan Steps

1. **Analyze Current Thread Creation Logic**
   - Review how and where threads/message arrays are created and Brand Voice is injected (Starting Prompt, node flows, etc).

2. **Design Thread/Session Management Model**
   - Define how to persist and identify threads (e.g., threadId, sessionId, or node context).

3. **Implement Thread Creation on Starting Prompt**
   - Ensure a new thread is created only when a Starting Prompt is used, with Brand Voice as the first system message.

4. **Implement Message Appending for Follow-ups**
   - For subsequent prompts in the same flow, append messages to the existing thread without re-injecting Brand Voice.

5. **Handle Thread Reset/New Conversation**
   - Allow explicit thread reset (e.g., new Starting Prompt or user action) to start a new thread with Brand Voice.

6. **Test and Document Behavior**
   - Test multi-turn and single-turn flows; update documentation to clarify thread/Brand Voice handling.

---

## Detailed Implementation Guide

### 1. Thread/Session Model
- Introduce a `threadId` or `sessionId` to group related messages.
- Store message arrays (system, user, assistant) for each thread in memory or local storage.
- When a Starting Prompt is triggered, create a new thread with a unique ID and initialize the message array with the Brand Voice as the first system message.
- For follow-up prompts, append new messages to the existing thread's array.
- Only inject the Brand Voice at the start of a new thread.

### 2. Thread Creation and Reset
- On Starting Prompt or explicit reset, create a new thread:
  - `messages = [{ role: 'system', content: brandVoice }, { role: 'user', content: startingPrompt }]`
- Store this thread and its ID in the session context.
- For subsequent prompts, retrieve the thread by ID and append new messages.
- Provide a UI or API action to reset the thread (start over).

### 3. Message Appending
- When a user or node sends a follow-up prompt, append it to the current thread's message array.
- Do not re-inject the Brand Voice unless starting a new thread.
- When sending to OpenAI, always send the full message array for the thread.

### 4. Backward Compatibility
- Ensure that if no thread/session management is detected (e.g., for legacy nodes), the system falls back to stateless single-shot requests (current behavior).
- No existing functionality is modified until the new thread/session logic is explicitly used.

### 5. Testing
- Test both single-turn (stateless) and multi-turn (threaded) flows.
- Confirm that Brand Voice is only injected at the start of new threads.
- Validate that context is preserved across follow-ups in the same thread.

---

## No Breaking Changes
- This plan is additive and backward-compatible.
- Existing stateless prompt flows will continue to work as before.
- Thread/session management is only activated for new flows that opt in.

---

## Next Steps
- Implement the plan as described above.
- Update documentation and code comments as needed.

---

*Last updated: 2025-10-14*
