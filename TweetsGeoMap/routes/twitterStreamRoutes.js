"use strict";

var express = require('express');
var router = express.Router();


router.get('/', function(req, res) {
	return res.status(200).send("Hello! From Tweet Stream Team");
});

module.exports = router;
