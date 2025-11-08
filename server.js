const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
const PORT = 5000;

app.use(express.static("public"));
app.use(bodyParser.json());

const USERS_FILE = path.join(__dirname,"users.json");
const CHATS_DIR = path.join(__dirname,"chats");
const INVITE_CODES_FILE = path.join(__dirname,"invite_codes.json");
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

if(!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR);
if(!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "{}");
if(!fs.existsSync(INVITE_CODES_FILE)) fs.writeFileSync(INVITE_CODES_FILE, '{"general":"GENERALCODE123"}');

function loadUsers(){ return JSON.parse(fs.readFileSync(USERS_FILE,"utf-8")); }
function saveUsers(users){ fs.writeFileSync(USERS_FILE,JSON.stringify(users,null,2)); }

const users = loadUsers();
if(!users.admin){ users.admin={password:"admin123"}; saveUsers(users); console.log("Admin created: admin / admin123"); }

function ensureChat(chat){ const file = path.join(CHATS_DIR,`${chat}.txt`); if(!fs.existsSync(file)) fs.writeFileSync(file,""); return file; }

async function verifyRecaptcha(token){
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify",{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:`secret=${RECAPTCHA_SECRET}&response=${token}`
    });
    const data = await res.json();
    return data.success;
}

// Register
app.post("/register", async (req,res)=>{
    const {username,password,recaptchaToken} = req.body;
    if(!username||!password) return res.status(400).json({error:"Missing fields"});
    if(recaptchaToken){
        const valid = await verifyRecaptcha(recaptchaToken);
        if(!valid) return res.status(400).json({error:"reCAPTCHA verification failed"});
    }
    const users = loadUsers(); if(users[username]) return res.status(400).json({error:"User exists"});
    users[username]={password}; saveUsers(users); res.json({success:true});
});

// Login
app.post("/login", async (req,res)=>{
    const {username,password,recaptchaToken} = req.body;
    if(!username||!password) return res.status(400).json({error:"Missing fields"});
    if(recaptchaToken){
        const valid = await verifyRecaptcha(recaptchaToken);
        if(!valid) return res.status(400).json({error:"reCAPTCHA verification failed"});
    }
    const users = loadUsers(); if(!users[username]||users[username].password!==password) return res.status(401).json({error:"Invalid username/password"});
    res.json({success:true});
});

// Send message
app.post("/send",(req,res)=>{
    const {username,password,text,chat,isAdmin}=req.body;
    if(!username||!password||!text||!chat) return res.status(400).json({error:"Missing fields"});
    const users=loadUsers(); if(!users[username]||users[username].password!==password) return res.status(401).json({error:"Authentication failed"});
    if(chat==="general"&&!isAdmin) return res.status(403).json({error:"Only admin can send in General"});
    const file = ensureChat(chat); const time=new Date().toLocaleString();
    fs.appendFileSync(file, `${username} | ${time} | ${text}\n`);
    res.json({success:true});
});

// Get messages
app.get("/messages/:chat",(req,res)=>{
    const file=ensureChat(req.params.chat);
    const lines = fs.readFileSync(file,"utf-8").split("\n").filter(Boolean);
    const messages = lines.map(l=>{
        const [user,time,...rest]=l.split(" | ");
        return {username:user, time, text:rest.join(" | ")};
    });
    res.json(messages);
});

// Join chat
app.post("/join",(req,res)=>{
    const {inviteCode}=req.body;
    const codes = JSON.parse(fs.readFileSync(INVITE_CODES_FILE,"utf-8"));
    const chatName = Object.keys(codes).find(c=>codes[c]===inviteCode);
    if(!chatName) return res.status(400).json({error:"Invalid invite code"});
    ensureChat(chatName); res.json({chat:chatName});
});

app.listen(PORT, "0.0.0.0", ()=>console.log(`Server running on http://0.0.0.0:${PORT}`));
