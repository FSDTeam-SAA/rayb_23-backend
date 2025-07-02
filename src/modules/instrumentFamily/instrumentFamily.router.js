const express = require('express');
const { createInstrumentFamily, getAllInstrumentFamilies, deleteInstrumentFamily } = require('./instrumentFamily.controller');
const auth = require('../../middleware/auth');
const USER_ROLE = require('../user/user.constant');

const router = express.Router();

router.post ("/create",auth(USER_ROLE.user, USER_ROLE.admin, USER_ROLE.bussinessMan), createInstrumentFamily);
router.get ("/all", getAllInstrumentFamilies);
router.put("/:id", auth(USER_ROLE.admin),)
router.delete ("/:id", auth( USER_ROLE.admin),deleteInstrumentFamily);

const instrumentFamilyRouter = router;
module.exports = instrumentFamilyRouter;