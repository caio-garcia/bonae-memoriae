const router = require("express").Router();
const bcrypt = require("bcrypt");
const UserModel = require("../models/User.model");
const generateToken = require("../config/jwt.config");
const isAuth = require("../middlewares/isAuth");
const attachCurrentUser = require("../middlewares/attachCurrentUser");

const saltRounds = 10;

// CREATE

router.post("/sign-up", async (req, res) => {
  try {
    const { password } = req.body;

    if (
      !password ||
      !password.match(
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[$*&@#])[0-9a-zA-Z$*&@#]{8,}$/
      )
    ) {
      return res
        .status(400)
        .json({ message: "Senha não tem os requisitos necessários." });
    }

    const salt = await bcrypt.genSalt(saltRounds);
    console.log(salt);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await UserModel.create({
      ...req.body,
      passwordHash: hashedPassword,
    });

    delete user._doc.passwordHash;

    return res.status(201).json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// LOGIN

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email: email });
    console.log(user);

    if (user.isActive === true) {
    }

    if (!user) {
      return res.status(400).json({ message: "E-mail não cadastrado" });
    }

    if (await bcrypt.compare(password, user.passwordHash)) {
      delete user._doc.passwordHash;

      const token = generateToken(user);

      return res.status(200).json({
        user: { ...user._doc },
        token: token,
      });
    } else {
      return res
        .status(401)
        .json({ message: "Email e senha não são correspondentes." });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

router.get("/my-profile", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const loggedInUser = req.currentUser;
    const user = await UserModel.findOne({ _id: loggedInUser._id }).populate(
      "albuns",
      "memories"
    );

    return res.status(200).json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// router.get("/:userId")

//SOFT DELETE

router.delete(
  "/delete-account",
  isAuth,
  attachCurrentUser,
  async (req, res) => {
    try {
      const loggedInUser = req.currentUser;

      await UserModel.findOneAndUpdate(
        { _id: loggedInUser },
        { isActive: false }
      );
    } catch (err) {
      console.log(err);
      return res.status(500).json(err);
    }
  }
);

module.exports = router;
