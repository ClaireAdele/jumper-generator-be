const app = require("../../app");
const request = require("supertest");
const User = require("../../models/users");
const { generateToken } = require("../../authUtils/jwt_token_utils");
require("../../mongodb_helper");


describe("TESTS FOR /users endpoint", () => {
  describe("POST - createNewUser", () => {
    beforeEach(async () => {
      await User.deleteMany({});
    });

    test("", async () => {
      const response = await request(app)
        .post("/users")
        .send({
          username: "testUser"
        })
      
      const [createdUser] = await User.find({ username: "testUser" });
      
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toEqual(`User ${createdUser._id} has been created`)
    });

    test("", async () => {

    });
  });

  describe("PUT - updateUser", () => {
    let token;
    let user;
    let userId;

    beforeEach(async () => {
      user = new User({ username: "testUser" });
      await user.save();
      token = generateToken(user._id);
      userId = user._id;
    });

    afterEach(async () => { 
      await User.deleteMany();
    })

    test("When the token is valid, the correct user object is updated in the database", async () => {
      const response = await request(app)
        .put("/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          username: "updatedTestUser",
          chestCircumference: 4,
          armLength: 3
        });
      
      [user] = await User.find({ _id: userId });
      expect(response.statusCode).toBe(201);
      expect(user.username).toBe("updatedTestUser");
      expect(user.chestCircumference).toBe(4);
      expect(user.armLength).toBe(3);
    });

    test("When the token is missing, we get an auth error", async () => {
      const response = await request(app)
        .put("/users")
        .send({
          username: "updatedTestUser"
        });

      expect(response.statusCode).toBe(401);
    });

    test("If the user has been deleted from the database, an error is thrown", async () => {
      await User.findByIdAndDelete({ _id: userId });

      const response = await request(app)
        .put("/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          username: "updatedTestUser",
        });

      expect(response.statusCode).toBe(500);
    });
  });
});
