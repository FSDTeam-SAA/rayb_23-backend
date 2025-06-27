const { mongoose } = require("mongoose");
const app = require("./src/app");
const config = require("./src/config");

async function main() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Database connected.....");

    app.listen(config.PORT, () => {
      console.log(`Server running on port http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
