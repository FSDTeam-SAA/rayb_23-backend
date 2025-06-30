const { Router } = require("express");
const userRouter = require("../modules/user/user.router");
const authRouter = require("../modules/auth/auth.router");
const sendMessageRouter = require("../modules/contract/contract.router");
const businessRouter = require("../modules/business/business.router");
const savedBusinessRouter = require("../modules/savedBusiness/savedBusiness.router");
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
    router:businessRouter,
  },
  {
    path: "/saved-business",
    router: savedBusinessRouter,
  }
];

moduleRouter.forEach((route) => {
  router.use(route.path, route.router);
});

module.exports = router;
