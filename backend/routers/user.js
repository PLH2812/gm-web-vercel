const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth").auth;
const checkStatus = require("../middleware/checkUserStatus");
const Group = require("../models/Group");

const router = express.Router();

router.post("/api/users/register", async (req, res) => {
  // Create a new user
  try {
    const user = new User(req.body);
    const unavailable = await User.findOne({email: user.email});
    if (!unavailable){
      user.role = process.env.ROLE_USER;
      user.status = process.env.USER_STATUS_ACTIVE;
      await user.save();
      const token = await user.generateAuthToken();
      res.status(201).send({ token });
    } else {
      res.status(400).send({error: 'Người dùng đã tồn tại!'});
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post('/api/users/login', checkStatus, async(req, res) => {
    //Login a registered user
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).send({error: 'Đăng nhập thất bại!'});
        }
        const token = await user.generateAuthToken();
        res.send({ token });
    } catch (error) {
        res.status(400).send(error);
    }
});

router.get('/api/users/me', auth, async(req, res) => {
    // View logged in user profile
    const data = {
      _id: req.user._id,
      email: req.user.email,
      name: req.user.name
    };
    res.send(data);
})

router.patch('/api/users/me', auth, async(req, res) => {
    // Update user profile
    try {
      const data = req.body;
      req.user.email = data.email;
      req.user.name = data.name;
      await req.user.save();
      res.status(200).send({ message: "Cập nhật thành cồng!"});
    } catch (error) {
      res.status(500).send(error);
    }
})

router.post("/api/users/me/logout", auth, async (req, res) => {
    // Log user out of the application
    try {
      req.user.tokens = req.user.tokens.filter(token => {
        return token.token != req.token;
      });
      await req.user.save();
      res.status(200).send({ message: "Đăng xuất thành cồng!"});
    } catch (error) {
      res.status(500).send(error);
    }
});

router.post('/api/users/me/logoutall', auth, async(req, res) => {
  // Log user out of all devices
  try {
      req.user.tokens.splice(0, req.user.tokens.length);
      await req.user.save();
      res.status(200).send({ message: "Đăng xuất thành cồng!"});
  } catch (error) {
      res.status(500).send(error);
  }
});

// Group activities start
router.get('/api/users/me/groups', auth, async(req, res) => {
  try {
    const myGroups = await Group.getMyGroups(req.user._id);
    res.status(200).send(myGroups);
  } catch (error) {
    res.status(500).send(error);
  }
})

router.post('/api/users/me/createGroup', auth, async (req, res) => {
  try {
    const group = new Group(req.body);
    group.setGroupOwner(req.user._id, req.user.name);
    res.status(200).send({ message: "Tạo nhóm thành công!"});
  } catch (error) {
    res.status(500).send(error);
  }
})

router.delete('/api/users/me/deleteGroup/:_id', auth, async (req, res) => {
  try {
    const myGroups = await Group.getMyGroups(req.user._id);
    const group = myGroups.find(g => g.id === req.params['_id']);
    if (!group){
      res.status(400).send({ error: "Bạn không phải chủ nhóm!"});
    } else {
      group = Group.findByIdAndDelete(req.params['_id']);
      res.status(200).send({ message: "Xoá nhóm thành công!"});
    }
  } catch (error) {
    res.status(500).send(error);
  }
})

router.patch('/api/users/me/addUser/:userId/toGroup/:groupId', auth, async (req, res) => {
  try {
    const myGroups = await Group.getMyGroups(req.user._id);
    const group = myGroups.find(g => g.id === req.params['groupId']);
    if (!group){
      res.status(400).send({ error: "Bạn không phải chủ nhóm!"});
    } else {
      const member = await User.findOne({_id: req.params['userId']});
      if (!member) {
        res.status(404).send({error: "Không tìm thấy người dùng này!"});
      } else {
        const memberInfo = ({userId: member._id, name: member.name});
        group.member = group.member.concat(memberInfo);
        group.save();
        res.status(200).send({message: "Thêm thành công!"});
      }
      res.status(200).send({ message: "Xoá nhóm thành công!"});
    }
  } catch (error) {
    res.status(500).send(error);
  }
})

router.patch('/api/users/me/removeUser/:userId/fromGroup/:groupId', auth, async (req, res) => {
  try {
    const myGroups = await Group.getMyGroups(req.user._id);
    const group = myGroups.find(g => g.id === req.params['groupId']);
    if (!group){
      res.status(400).send({ error: "Bạn không phải chủ nhóm!"});
    } else {
      const member = await User.findOne({_id: req.params['userId']});
      if (!member) {
        res.status(404).send({error: "Không tìm thấy người dùng này!"});
      } else {
        group.members = group.members.filter(function(mem) { return mem.userId != member._id; }); 
        group.save();
        res.status(200).send({message: "Đã xoá người dùng khỏi nhóm!"});
      }
    }
  } catch (error) {
    res.status(500).send(error);
  }
})

module.exports = router;