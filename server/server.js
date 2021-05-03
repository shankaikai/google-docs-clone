const mongoose = require("mongoose");
const Document = require("./Document");
require("dotenv").config();

const uri = process.env.MONGO_URI;

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("MongoDB connected!");
  })
  .catch((err) => console.log(err));

const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const defaultValue = "";

io.on("connection", (socket) => {
  console.log("client connected to socket!");
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    // socket.join puts the user into a room
    socket.join(documentId);

    // send the document data to the client
    socket.emit("load-document", document.data);

    // broadcast changes to all other users in the particular room
    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    // save our document
    socket.on("save-document", async (data) => {
      console.log("saving document");
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}
