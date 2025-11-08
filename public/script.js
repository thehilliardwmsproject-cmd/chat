const loginBox = document.getElementById("loginBox");
const chatControls = document.getElementById("chatControls");
const msgBox = document.getElementById("messages");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const chatSelect = document.getElementById("chatSelect");
const inviteCodeInput = document.getElementById("inviteCode");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const copyEmailBtn = document.getElementById("copyEmail");
const gifBtn = document.getElementById("gifBtn");
const gifPicker = document.getElementById("gifPicker");
const gifSearchBox = document.getElementById("gifSearchBox");
const gifSearchInput = document.getElementById("gifSearchInput");
const gifSearchBtn = document.getElementById("gifSearchBtn");

let username = "";
let password = "";
let isAdmin = false;
let joinedChats = ["general"];
let currentChat = "general";
let refreshInterval = null;

const GIPHY_API_KEY = "lBFRnLd5tt8QoWme2noaiIoq84dniwYd";

function setCookie(name,value,days){const d=new Date();d.setTime(d.getTime()+days*24*60*60*1000);document.cookie=name+"="+encodeURIComponent(value)+";expires="+d.toUTCString()+";path=/";}
function getCookie(name){return document.cookie.split("; ").reduce((r,v)=>{const parts=v.split("=");return parts[0]===name?decodeURIComponent(parts[1]):r;}, "");}

async function handleAuth(type){
    const u=document.getElementById("username").value.trim();
    const p=document.getElementById("password").value.trim();
    if(!u||!p) return alert("Enter username and password");
    const recaptchaToken = grecaptcha.getResponse();
    if(!recaptchaToken) return alert("Please complete reCAPTCHA");
    try{
        const res = await fetch("/"+type,{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({username:u,password:p,recaptchaToken})
        });
        if(res.ok){
            username=u; password=p; isAdmin=username==="admin";
            setCookie("username",username,365); setCookie("password",password,365);
            loginBox.style.display="none"; chatControls.style.display="block";
            updateChatDropdown(); startChat(currentChat);
        } else {
            const err = await res.json(); alert(err.error||type+" failed");
        }
    } catch(e){ alert("Server error"); }
}

loginBtn.onclick = ()=>handleAuth("login");
registerBtn.onclick = ()=>handleAuth("register");

copyEmailBtn.onclick = ()=>{ navigator.clipboard.writeText(document.getElementById("email").value); alert("Email copied!"); }

function updateChatDropdown(){
    chatSelect.innerHTML="";
    joinedChats.forEach(c=>{const opt=document.createElement("option"); opt.value=c; opt.textContent=c.charAt(0).toUpperCase()+c.slice(1); chatSelect.appendChild(opt);});
    chatSelect.value=currentChat;
}
chatSelect.onchange=()=>{currentChat=chatSelect.value; startChat(currentChat);}

async function loadMessages(){
    try{
        const res = await fetch(`/messages/${currentChat}`);
        if(!res.ok) return;
        const messages = await res.json(); msgBox.innerHTML="";
        messages.forEach(m=>{
            const div=document.createElement("div"); div.className="msg";
            if(m.text.startsWith("GIF:")){
                const img = document.createElement("img");
                img.src = m.text.replace("GIF:","");
                img.className = "chat-gif";
                div.innerHTML = `<b>${m.username}</b>: `; div.appendChild(img);
            } else div.innerHTML = `<b>${m.username}</b>: ${m.text} <span>${m.time}</span>`;
            msgBox.appendChild(div);
        });
        msgBox.scrollTop = msgBox.scrollHeight;
    } catch(e){ console.log(e); }
}

function startChat(chat){
    currentChat=chat;
    clearInterval(refreshInterval); loadMessages(); refreshInterval = setInterval(loadMessages,2000);
    if(chat.toLowerCase()==="general"){ messageInput.style.display=isAdmin?"block":"none"; sendBtn.style.display=isAdmin?"inline-block":"none"; }
    else { messageInput.style.display="block"; sendBtn.style.display="inline-block"; }
}

sendBtn.onclick = async ()=>{
    const text=messageInput.value.trim(); if(!text) return;
    try{
        const res = await fetch("/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password,text,chat:currentChat,isAdmin})});
        if(res.ok){ messageInput.value=""; loadMessages(); }
        else { const err = await res.json(); alert(err.error||"Error sending message"); }
    } catch(e){ alert("Server error"); }
}

// GIF
gifBtn.onclick = ()=>{ gifSearchBox.style.display = gifSearchBox.style.display==="none"?"flex":"none"; gifPicker.style.display = gifPicker.style.display==="none"?"flex":"flex"; }
gifSearchBtn.onclick = async ()=>{
    const query = gifSearchInput.value.trim(); if(!query) return;
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=8`);
    const data = await res.json(); gifPicker.innerHTML="";
    data.data.forEach(g=>{
        const img = document.createElement("img");
        img.src = g.images.fixed_height_small.url; img.className="chat-gif-thumbnail";
        img.onclick = ()=>{ messageInput.value = "GIF:"+g.images.original.url; gifPicker.innerHTML=""; gifSearchBox.style.display="none"; }
        gifPicker.appendChild(img);
    });
}

// Join/Leave
joinBtn.onclick = async ()=>{
    const code=inviteCodeInput.value.trim(); if(!code) return alert("Enter invite code");
    try{
        const res = await fetch("/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({inviteCode:code})});
        if(res.ok){ const data = await res.json(); if(!joinedChats.includes(data.chat)) joinedChats.push(data.chat); updateChatDropdown(); chatSelect.value=data.chat; startChat(data.chat); alert(`Joined ${data.chat}!`);}
        else alert("Invalid invite code");
    } catch(e){ alert("Server error"); }
}
leaveBtn.onclick = ()=>{
    if(currentChat==="general") return alert("Cannot leave General chat");
    joinedChats = joinedChats.filter(c=>c!==currentChat); if(joinedChats.length===0) joinedChats=["general"];
    currentChat=joinedChats[0]; updateChatDropdown(); startChat(currentChat);
}

// Init
if(getCookie("username") && getCookie("password")){
    username=getCookie("username"); password=getCookie("password"); isAdmin=username==="admin";
    loginBox.style.display="none"; chatControls.style.display="block"; updateChatDropdown(); startChat(currentChat);
} else { loginBox.style.display="block"; chatControls.style.display="none"; }
