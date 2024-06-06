const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");

require("dotenv").config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

const db = require("knex")({
  client: process.env.DB_CLIENT,
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
});
function verifyToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).json({ message: "Failed to authenticate token" });
    req.user = decoded;
    next();
  });
}

// 在需要验证的路由前使用此中间件
app.use("/api/posts", verifyToken);

app.post("/api/users/register", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await db("users").insert(
      {
        username: req.body.username,
        password: hashedPassword,
        email: req.body.email,
      },
      "id"
    );
    res
      .status(201)
      .json({ message: "User registered successfully", userId: user[0] });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const user = await db("users")
      .where({ username: req.body.usernameOrEmail })
      .orWhere({ email: req.body.usernameOrEmail })
      .first();
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ token, userId: user.id, username: user.username });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const postId = await db("posts").insert(
      {
        title: req.body.title,
        content: req.body.content,
        user_id: req.user.id, // 假设使用中间件解析JWT并设置req.user
      },
      "id"
    );
    res
      .status(201)
      .json({ message: "Post created successfully", postId: postId[0] });
  } catch (error) {
    res.status(500).json({ error: "Post creation failed" });
  }
});

// 设置multer的存储配置，使用时间戳作为文件名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images"); // 确保这个目录存在
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const extension = file.originalname.split(".").pop(); // 获取文件扩展名
    cb(null, `${timestamp}.${extension}`); // 文件名直接使用时间戳加上扩展名
  },
});

// ... 使用multer、创建路由和启动服务器的代码不变 ...

// 创建multer实例
const upload = multer({ storage });

// 首先，检查并创建存储目录
const uploadDirectory = "./public/images";
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

// 使用multer中间件处理图片上传
app.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file was uploaded.");
    }
    res
      .status(200)
      .json({
        message: "Image uploaded successfully",
        filePath: req.file.path,
      });
  } catch (error) {
    res.status(500).send("Error uploading image: " + error.message);
  }
});

// 启动服务器
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
