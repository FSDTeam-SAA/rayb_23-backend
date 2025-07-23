const { Router } = require("express");
const instrumentController = require("./instrumentFamily.controller");

const router = Router();

//only admin can create
router.post("/create", instrumentController.createInstrument);

router.get("/", instrumentController.getAllInstrument);
router.put("/:instrumentId", instrumentController.updateInstrument);

const instrumentFamilyRouter = router;
module.exports = instrumentFamilyRouter;
