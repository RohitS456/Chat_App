const mongoose=require("mongoose");
const Chat=require("./Models/chats.js");

main().then(()=>{
    console.log("Connection successful");
}).catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/whatsapp');
}

let allChats=[
    {
        from:"Rohit",
        to:"Shreya",
        msg:"How are you :)",
        created_at:new Date()
    },
    {
        from:"Shreya",
        to:"Yuraj",
        msg:"Why you are not replying to my messages",
        created_at:new Date(),
    },
    {
        from:"Yuraj",
        to:"Priti",
        msg:"Please don't break-up with me!",
        created_at:new Date(),
    },
    {
        from:"Raj",
        to:"Nishi",
        msg:"I love you so much, Please",
        created_at:new Date(),
    },
];
Chat.insertMany(allChats);

