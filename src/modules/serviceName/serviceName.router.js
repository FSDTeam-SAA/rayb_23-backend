const express = require ("express");
const { getAllServiceNames, createServiceName, deleteServiceName } = require("./serviceName.coltroller");
const router = express.Router();

router.post("/create", createServiceName);
router.get("/all", getAllServiceNames);
router.delete("/delete", deleteServiceName);