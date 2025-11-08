// admin.js

const adminUsername = "admin";
const adminPassword = "admin123";

const msgBox = document.getElementById("messages");
const adminMessage = document.getElementById("adminMessage");
const sendAdmin = document.getElementById("sendAdmin");
const chatSelect = document.getElementById("chatSelect");
const newChatName = document.getElementById("newChatName");
const newInviteCode = document.getElementById("newInviteCode");
const createChat = document.getElementById("createChat");
const editChat = document.getElementById("editChat");
const deleteChat = document.getElementById("deleteChat");

let refreshInterval = null;

// ------------------ GENERAL CHAT ------------------

// Load General messages
async function loadMessages() {
  try {
    const res = await fetch("/messages/general");
    if (!res.ok) return;
    const messages = await res.json();
    msgBox.innerHTML = "";
    messages.forEach(m => {
      const div = document.createElement("div");
      div.className = "msg";
      div.innerHTML = `<b>${m.username}</b>: ${m.text} <span>${m.time}</span>`;
      msgBox.appendChild(div);
    });
    msgBox.scrollTop = msgBox.scrollHeight;
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

// Auto-refresh messages every 2 seconds
loadMessages();
refreshInterval = setInterval(loadMessages, 2000);

// Send message to General
sendAdmin.onclick = async () => {
  const text = adminMessage.value.trim();
  if (!text) return;

  try {
    const res = await fetch("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: adminUsername,
        password: adminPassword,
        text,
        chat: "general",
        isAdmin: true
      })
    });
    if (res.ok) {
      adminMessage.value = "";
      loadMessages();
    } else {
      alert("Failed to send message");
    }
  } catch {
    alert("Server error while sending message");
  }
};

// ------------------ CHAT MANAGEMENT ------------------

// Load chats into dropdown
async function loadChats() {
  try {
    const res = await fetch("/chats");
    const codes = await res.json();
    chatSelect.innerHTML = "";
    Object.keys(codes).forEach(chat => {
      const opt = document.createElement("option");
      opt.value = chat;
      opt.textContent = chat.charAt(0).toUpperCase() + chat.slice(1);
      chatSelect.appendChild(opt);
    });
  } catch {
    console.error("Cannot load chats");
  }
}
loadChats();

// Create new chat
createChat.onclick = async () => {
  const chat = newChatName.value.trim();
  const code = newInviteCode.value.trim();
  if (!chat || !code) return alert("Enter chat name and invite code");

  try {
    const res = await fetch("/chats");
    const codes = await res.json();
    if (codes[chat]) return alert("Chat already exists");
    codes[chat] = code;

    await fetch("/chats/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(codes)
    });

    alert("Chat created!");
    newChatName.value = "";
    newInviteCode.value = "";
    loadChats();
  } catch {
    alert("Error creating chat");
  }
};

// Delete selected chat
deleteChat.onclick = async () => {
  const chat = chatSelect.value;
  if (!chat || chat.toLowerCase() === "general") return alert("Cannot delete General chat");

  try {
    const res = await fetch("/chats");
    const codes = await res.json();
    delete codes[chat];

    await fetch("/chats/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(codes)
    });

    alert("Chat deleted!");
    loadChats();
  } catch {
    alert("Error deleting chat");
  }
};

// Edit selected chat
editChat.onclick = async () => {
  const chat = chatSelect.value;
  if (!chat) return alert("Select a chat");

  const newName = prompt("New chat name:", chat);
  if (!newName) return;
  const newCode = prompt("New invite code:");
  if (!newCode) return;

  try {
    const res = await fetch("/chats");
    const codes = await res.json();
    delete codes[chat];
    codes[newName] = newCode;

    await fetch("/chats/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(codes)
    });

    alert("Chat updated!");
    loadChats();
  } catch {
    alert("Error editing chat");
  }
};
