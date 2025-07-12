const express = require ("express");
const { createInstrumentName, getAllInstrumentName, updateInstrumentName, deleteInstrumentName } = require("./instrumentName.controller");
const router = express.Router();

router.post("/create", createInstrumentName);
router.get("/get-all", getAllInstrumentName);
router.put("/update-instrumentName", updateInstrumentName);
router.delete("/delete", deleteInstrumentName);

const instrumentNameRouter = router;
module.exports = instrumentNameRouter;