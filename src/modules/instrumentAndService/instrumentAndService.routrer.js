const express = require("express");
const auth = require("../../middleware/auth");
const { user } = require("../user/user.constant");
const USER_ROLE = require("../user/user.constant");
const { createInstrumentAndService, getAllInstrumentAndServices, getAllInstrumentAndServicesByFamily, updateInstrumentAndService, deleteInstrumentAndService } = require("./instrumentAndService.controller");
const router = express.Router();

router.post("/create", auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.businessMan), createInstrumentAndService);
router.get("/", getAllInstrumentAndServices);
router.get("/:instrumentFamilyId", getAllInstrumentAndServicesByFamily);
router.put("/:id", auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.bussinessMan), updateInstrumentAndService); // Assuming update logic is similar to create
router.delete("/:id", auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.bussinessMan), deleteInstrumentAndService); // Assuming delete logic is similar to create
const instrumentAndServiceRouter = router;

module.exports = instrumentAndServiceRouter;
