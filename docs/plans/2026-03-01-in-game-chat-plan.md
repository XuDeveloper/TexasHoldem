# Chat Drawer & Game Log Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a responsive side-drawer chat interface on the Texas Hold'em game table that combines user chat messages with frontend-inferred system logs.

**Architecture:** Pure frontend approach. We will add a floating toggle button to show/hide a fixed chat drawer. Inside `game.js`, we will bind to the `chat-message` socket event for user messages. For system logs, we will diff incoming `game-state` socket payloads against a previously cached state to infer and append descriptive logs (e.g., changes in betting phases or declared winners). 

**Tech Stack:** Vanilla JavaScript, Vanilla CSS, Socket.IO Client.

---

### Task 1: Create the Chat Drawer DOM Structure

**Files:**
- Modify: `client/pages/game.js`

**Step 1: HTML Injection**
In `initGame()`, append the chat drawer markup and floating action button (FAB) to the document body.

```javascript
const chatHTML = `
    <!-- Floating Action Button -->
    <div id="chat-fab" class="chat-fab" style="display: none;">
        💬 <span id="chat-badge" class="unread-badge" style="display: none;">0</span>
    </div>

    <!-- Slide-out Drawer -->
    <div id="chat-drawer" class="chat-drawer">
        <div class="chat-header">
            <h3>🗨️ Game Chat</h3>
            <button id="close-chat-btn">×</button>
        </div>
        <ul id="chat-messages" class="chat-messages"></ul>
        <div class="quick-replies">
            <button class="quick-reply-btn">Nice hand!</button>
            <button class="quick-reply-btn">Hurry up!</button>
            <button class="quick-reply-btn">Are you bluffing?</button>
            <button class="quick-reply-btn">All in time 🔥</button>
        </div>
        <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off" />
            <button id="chat-send-btn">Send</button>
        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', chatHTML);
```

**Step 2: Bind UI Toggles**
Add click listeners to toggle the `open` class on the drawer, and reset the unread badge when opened.

```javascript
document.getElementById('chat-fab').addEventListener('click', () => {
    document.getElementById('chat-drawer').classList.add('open');
    document.getElementById('chat-badge').style.display = 'none';
    document.getElementById('chat-badge').textContent = '0';
});

document.getElementById('close-chat-btn').addEventListener('click', () => {
    document.getElementById('chat-drawer').classList.remove('open');
});
```

**Step 3: Show FAB on Join**
When the user successfully joins the room, show the FAB:
`document.getElementById('chat-fab').style.display = 'flex';`

**Step 4: Commit**
```bash
git add client/pages/game.js
git commit -m "feat: inject Chat Drawer markup and basic toggle logic"
```

---

### Task 2: Style the Chat Drawer

**Files:**
- Modify: `client/style.css`

**Step 1: Write CSS**

```css
/* Chat FAB */
.chat-fab {
    position: fixed;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 50px;
    height: 50px;
    background: #1a1a1a;
    border: 2px solid var(--accent-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
    font-size: 24px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
    transition: transform 0.2s, box-shadow 0.2s;
}
.chat-fab:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
}
.unread-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4444;
    color: white;
    font-size: 12px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 10px;
}

/* Chat Drawer */
.chat-drawer {
    position: fixed;
    top: 0;
    right: -320px;
    width: 320px;
    height: 100vh;
    background: rgba(20, 20, 20, 0.95);
    border-left: 1px solid #333;
    display: flex;
    flex-direction: column;
    z-index: 2000;
    transition: right 0.3s ease;
    box-shadow: -5px 0 15px rgba(0,0,0,0.5);
}
.chat-drawer.open {
    right: 0;
}
.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
}
.chat-header h3 { margin: 0; color: var(--accent-color); }
.chat-header button {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 24px;
    cursor: pointer;
}
.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    list-style: none;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.chat-msg {
    padding: 8px 12px;
    border-radius: 8px;
    background: #2a2a2a;
    font-size: 14px;
    word-break: break-word;
}
.chat-msg span.author { font-weight: bold; color: var(--accent-color); margin-right: 5px; }
.sys-log {
    text-align: center;
    font-size: 12px;
    color: #888;
    font-style: italic;
    background: transparent;
    padding: 2px;
}
.quick-replies {
    display: flex;
    overflow-x: auto;
    padding: 10px;
    gap: 8px;
    border-top: 1px solid #333;
}
.quick-reply-btn {
    background: #333;
    border: 1px solid #444;
    color: #ccc;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 15px;
    cursor: pointer;
    white-space: nowrap;
}
.quick-reply-btn:hover { background: #444; color: #fff; }
.chat-input-area {
    display: flex;
    padding: 15px;
    background: #1a1a1a;
    gap: 10px;
}
.chat-input-area input {
    flex: 1;
    background: #333;
    border: 1px solid #444;
    color: white;
    padding: 10px;
    border-radius: 5px;
    outline: none;
}
.chat-input-area input:focus { border-color: var(--accent-color); }
.chat-input-area button {
    background: var(--accent-color);
    color: #000;
    border: none;
    padding: 0 15px;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
}
.chat-input-area button:hover { background: #ffd700; }
```

**Step 2: Commit**
```bash
git add client/style.css
git commit -m "style: implement visual design for Chat Drawer and Logs"
```

---

### Task 3: Implement Chat Sending and Receiving

**Files:**
- Modify: `client/pages/game.js`

**Step 1: Helper function to append message**
```javascript
function appendChatMessage(author, text, isSystem = false) {
    const list = document.getElementById('chat-messages');
    const li = document.createElement('li');
    if (isSystem) {
        li.className = 'sys-log';
        li.textContent = `[System] ${text}`;
    } else {
        li.className = 'chat-msg';
        li.innerHTML = `<span class="author">${author}:</span> ${text}`;
    }
    list.appendChild(li);
    list.scrollTop = list.scrollHeight;
}
```

**Step 2: Bind Chat Transmission**
```javascript
function sendChat(msg) {
    if (!msg.trim()) return;
    socket.emit('chat-message', { message: msg.trim() });
}

document.getElementById('chat-send-btn').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    sendChat(input.value);
    input.value = '';
});

document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('chat-send-btn').click();
});

document.querySelectorAll('.quick-reply-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        sendChat(e.target.textContent);
    });
});
```

**Step 3: Bind Socket Receiver**
Update `setupSocketHandlers()`:
```javascript
socket.on('chat-message', (data) => {
    appendChatMessage(data.name, data.message);
    
    // Increment unread badge if drawer is closed
    const drawer = document.getElementById('chat-drawer');
    if (!drawer.classList.contains('open')) {
        const badge = document.getElementById('chat-badge');
        let count = parseInt(badge.textContent) || 0;
        badge.textContent = count + 1;
        badge.style.display = 'block';
    }
});
```

**Step 4: Commit**
```bash
git add client/pages/game.js
git commit -m "feat: implement realtime chat messaging and quick replies"
```

---

### Task 4: Diff Game State for Local System Logs

**Files:**
- Modify: `client/pages/game.js`

**Step 1: Maintain Global Cache**
At the top level of `game.js`, declare:
`let previousGameState = null;`

**Step 2: Generate Diffs in `updateGameState()`**
Inside `socket.on('game-state', (state) => {...})`, add diff logic before updating the DOM:

```javascript
socket.on('game-state', (state) => {
    if (previousGameState) {
        // Log Phase Changes
        if (state.phase !== previousGameState.phase) {
            const phaseName = state.phase.charAt(0).toUpperCase() + state.phase.slice(1);
            appendChatMessage('System', `The ${phaseName} phase has begun.`, true);
        }

        // Log Action Completes (Find the player who acted last)
        // Check if current bet changed, or someone's status changed
        if (state.lastAction && 
            (!previousGameState.lastAction || 
            JSON.stringify(state.lastAction) !== JSON.stringify(previousGameState.lastAction))) {
             
             // Unfortunately game-state.lastAction doesn't explicitly store who did it in the schema,
             // but we will assume it was the previous active player.
             // Alternatively, just log the action:
             appendChatMessage('System', `Action applied: ${state.lastAction.type} ` + (state.lastAction.amount ? `$${state.lastAction.amount}` : ''), true);
        }
    }
    
    previousGameState = JSON.parse(JSON.stringify(state)); // Deep copy

    // ... existing updateDOM() ...
```

**Step 3: Handle Showdown events**
In `socket.on('game-result', (data) => {...})`:
```javascript
    if (data.winners && data.winners.length > 0) {
        data.winners.forEach(w => {
            appendChatMessage('System', `${w.name} wins $${w.amount} with ${w.handName}`, true);
        });
    }
```

**Step 4: Commit**
```bash
git add client/pages/game.js
git commit -m "feat: infer and append system logs based on game state diffs"
```
