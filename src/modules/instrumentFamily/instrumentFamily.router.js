const express = require('express');
const { createInstrumentFamily, getAllInstrumentFamilies, deleteInstrumentFamily } = require('./instrumentFamily.controller');

const router = express.Router();

router.post ("/create", createInstrumentFamily);
router.get ("/all", getAllInstrumentFamilies);
router.delete ("/:id", deleteInstrumentFamily);

const instrumentFamilyRouter = router;
module.exports = instrumentFamilyRouter;