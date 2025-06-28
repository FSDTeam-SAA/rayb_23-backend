const express = require("express");
const { createBusiness } = require("./business.controller");
const router = express.Router();


// Create new business
router.post("/", createBusiness);