const { Router } = require("express");
const userRouter = require("../modules/user/user.router");
const authRouter = require("../modules/auth/auth.router");
const sendMessageRouter = require("../modules/contract/contract.router");
const businessRouter = require("../modules/business/business.router");
const savedBusinessRouter = require("../modules/savedBusiness/savedBusiness.router");
const { path } = require("../app");
const claimBussinessRouter = require("../modules/claimBussiness/claimBussiness.router");
const instrumentFamilyRouter = require("../modules/instrumentFamily/instrumentFamily.router");
const messageRouter = require("../modules/message/message.router");
const chatRouter = require("../modules/chat/chat.router");
const reviewRouter = require("../modules/review/review.router");

const router = Router();

const moduleRouter = [
  {
    path: "/user",
    router: userRouter,
  },
  {
    path: "/auth",
    router: authRouter,
  },
  {
    path: "/contract",
    router: sendMessageRouter,
  },
  {
    path: "/business",
    router: businessRouter,
  },
  { path: "/saved-business", router: savedBusinessRouter },
  {
    path: "/claim-bussiness",
    router: claimBussinessRouter,
  },

  {
    path: "/instrument-family",
    router: instrumentFamilyRouter,
  },
  {
    path:"/review",
    router:reviewRouter,
  },
  {
    path: "/message",
    router: messageRouter,
  },
  {
    path: "/chat",
    router: chatRouter,
  },
];

moduleRouter.forEach((route) => {
  router.use(route.path, route.router);
});

module.exports = router;
