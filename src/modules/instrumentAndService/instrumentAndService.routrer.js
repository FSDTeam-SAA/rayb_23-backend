const express = require("express");
const auth = require("../../middleware/auth");
const { user } = require("../user/user.constant");
const USER_ROLE = require("../user/user.constant");
const { createInstrumentAndService, getAllInstrumentAndServices } = require("./instrumentAndService.controller");
const router = express.Router();

router.post("/create", auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.bussinessMan), createInstrumentAndService);
router.get("/", getAllInstrumentAndServices);

const instrumentAndServiceRouter = router;

module.exports = instrumentAndServiceRouter;
