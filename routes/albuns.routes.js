const router = require("express").Router();
const AlbumModel = require("../models/Album.model");
const MemoryModel = require("../models/Memory.model");
const UserModel = require("../models/User.model");

const isAuth = require("../middlewares/isAuth");
const attachCurrentUser = require("../middlewares/attachCurrentUser");

// CREATE

router.post("/create-album", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const loggedInUser = req.currentUser;

    const createdAlbum = await AlbumModel.create({
      ...req.body,
      owner: loggedInUser._id,
    });

    await UserModel.findOneAndUpdate(
      { _id: loggedInUser._id },
      { $push: { albuns: createdAlbum._id } }
    );

    return res.status(201).json(createdAlbum);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// READ ALL

router.get("/my-albuns", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const loggedInUser = req.currentUser;

    const userAlbuns = await AlbumModel.find(
      { owner: loggedInUser._id },
      { memories: 0 }
    );

    return res.status(200).json(userAlbuns);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// READ DETAILS
router.get("/:albumId", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const loggedInUser = req.currentUser;

    const { albumId } = req.params;

    const foundAlbum = await AlbumModel.findOne({ _id: albumId }).populate(
      "memories"
    );

    const owner = await UserModel.findOne({ _id: foundAlbum.owner });

    if (
      !owner.albunsRestrictions &&
      !owner.friends.includes(loggedInUser._id)
    ) {
      return res.status(401).json({
        message: "Os álbuns desse usuário são restritos aos seus amigos.",
      });
    }

    return res.status(200).json(foundAlbum);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// EDIT

router.patch("/edit/:albumId", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const { albumId } = req.params;
    const loggedInUser = req.currentUser;

    const body = { ...req.body };

    delete body.memories;

    const album = await AlbumModel.findOne({ _id: albumId });

    if (album.owner !== loggedInUser._id) {
      return res
        .status(401)
        .json({ message: "Você não pode alterar esse album." });
    }

    const updatedAlbum = await AlbumModel.findOneAndUpdate(
      { _id: albumId },
      { ...body },
      { new: true, runValidators: true }
    );
    return res.status(200).json(updatedAlbum);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// DELETE

router.delete(
  "/delete/:albumId",
  isAuth,
  attachCurrentUser,
  async (req, res) => {
    try {
      const { albumId } = req.params;
      const loggedInUser = req.currentUser;

      const album = await AlbumModel.findOne({ _id: albumId });

      if (album.owner !== loggedInUser._id) {
        return res
          .status(401)
          .json({ message: "Você não pode deletar esse album." });
      }

      const deletedAlbum = await AlbumModel.deleteOne({
        _id: req.params.albumId,
      });

      await MemoryModel.updateMany(
        { albuns: albumId },
        { $pull: { albuns: albumId } }
      );

      await UserModel.findOneAndUpdate(
        { _id: loggedInUser._id },
        { $pull: { albuns: albumId } },
        { runValidators: true }
      );

      return res.status(200).json(deletedAlbum);
    } catch (err) {
      console.log(err);

      return res.status(500).json(err);
    }
  }
);

module.exports = router;
