const app = require("../../app");
const request = require("supertest");
const User = require("../../models/users");
const bcrypt = require("bcrypt");
const { generateToken } = require("../../utils/jwt_token_utils");
require("../../mongodb_helper");


describe("TESTS FOR /users ENDPOINT", () => {
  describe("POST - createNewUser", () => {
    beforeEach(async () => {
      await User.deleteMany({});
    });

    test("When the user is created with the required data, it's stored in the database and the server responds with 201", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({
          username: "testUser",
          email: "test@email.com",
          password: "password"
        })
      
      const [createdUser] = await User.find({ username: "testUser" });
      
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toEqual(`User ${createdUser._id} has been created`)
    });

    test("The password is encrypted in the database", async () => {
      const response = await request(app).post("/api/users").send({
        username: "testUser",
        email: "test@email.com",
        password: "password",
      });

      const [createdUser] = await User.find({ username: "testUser" });

      expect(createdUser.password).not.toBe("password");
      expect(await bcrypt.compare("password", createdUser.password)).toBe(true);
    });

    test("When required data is missing, the MongoDB error is caught by error handling middleware and thrown correctly with a 400", async () => {
      const response = await request(app).post("/api/users").send({
        password: "password",
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toEqual(
        "Mongoose error : User validation failed"
      );
    });

    test("When a user with the same username already exists in the database, the server throws a 400 error", async () => {
      await request(app).post("/api/users").send({
        username: "testUser",
        email: "test_test@email.com",
        password: "password",
      });

      const response = await request(app).post("/api/users").send({
        username: "testUser",
        email: "test@email.com",
        password: "password",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("This username is already is use");
    });

    test("When a user with the same email already exists in the database, the server throws a 400 error", async () => {
      await request(app).post("/api/users").send({
        username: "tes_testUser",
        email: "test@email.com",
        password: "password",
      });

      const response = await request(app).post("/api/users").send({
        username: "testUser",
        email: "test@email.com",
        password: "password",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("This e-mail address is already is use");
    });
  });
});

describe("TESTS FOR /users/me ENDPOINT", () => {
  describe("PUT - updateUser", () => {
    let token;
    let user;
    let userId;
    let cookie;

    beforeEach(async () => {
      user = new User({
        username: "testUser",
        email: "test@email.com",
        password: "password",
      });

      await user.save();
      token = generateToken(user._id);
      userId = user._id;
      cookie = `token=${token}; HttpOnly; Path=/; Secure`;
    });

    afterEach(async () => {
      await User.deleteMany();
    });

    test("When the token is valid, the correct user object is updated in the database", async () => {
      const response = await request(app)
        .put("/api/users/me")
        .set("Cookie", cookie)
        .send({
          username: "updatedTestUser",
          chestCircumference: 4,
          armLength: 3,
        });

      [user] = await User.find({ _id: userId });
      expect(response.statusCode).toBe(201);
      expect(user.username).toBe("updatedTestUser");
      expect(user.chestCircumference).toBe(4);
      expect(user.armLength).toBe(3);
    });

    test("When the token is valid, the server responds with a 201 and sends back a success message as well as the updated user data", async () => {
      const response = await request(app)
        .put("/api/users/me")
        .set("Cookie", cookie)
        .send({
          username: "updatedTestUser",
          chestCircumference: 4,
          armLength: 3,
        });

      [user] = await User.find({ _id: userId });
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(`User ${user._id} has been updated`);
      expect(response.body.updatedUser).toEqual({
        username: "updatedTestUser",
        email: "test@email.com",
        chestCircumference: 4,
        armLength: 3,
      });
    });

    test("When a user with the same username already exists in the database, the server throws a 400 error", async () => {
      const response = await request(app)
        .put("/api/users/me")
        .set("Cookie", cookie)
        .send({
          username: "testUser",
          email: "test@email.com",
          password: "password",
          chestCircumference: 4,
          armLength: 3,
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("This username is already is use");
    });

    test("When the token is missing, we get an auth error", async () => {
      const response = await request(app).put("/api/users/me").send({
        username: "updatedTestUser",
      });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe("Could not verify token");
    });

    test("When the token is invalid, an auth error is thrown", async () => {
      const response = await request(app)
        .put("/api/users/me")
        .set("Cookie", "Bearer invalidToken")
        .send({ username: "updatedTestUser" });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe("Could not verify token");
    });

    test("If the user has been deleted from the database, an error is thrown", async () => {
      await User.findByIdAndDelete({ _id: userId });

      const response = await request(app)
        .put("/api/users/me")
        .set("Cookie", cookie)
        .send({
          username: "updatedTestUser",
          email: "test@email.com",
          password: "password",
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(
        "The user you attempted to update doesn't exist"
      );
    });
  });

  describe("GET - getSignedInUser", () => {
    let token;
    let testUser2;
    let testUserId2;
    let cookie;

    beforeEach(async () => {
      testUser2 = new User({
        username: "testUser2",
        email: "test2@email.com",
        password: "password",
      });

      await testUser2.save();
      token = generateToken(testUser2._id);
      testUserId2 = testUser2._id;
      cookie = `token=${token}; HttpOnly; Path=/; Secure`;
    });

    afterEach(async () => {
      await User.deleteMany();
    });

    test("When the token is valid, the server responds with a status code 200 and the logged-in user object", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        signedInUser: {
          username: "testUser2",
          email: "test2@email.com",
        },
      });
    });

    test("If the token is missing, the server responds with a status code 400 and an error", async () => {
      const response = await request(app).get("/api/users/me");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Could not verify token",
      });
    });

    test("If the user who's id is on the token does not exist, the server responds with a status code 404 and an error", async () => {
      await User.deleteOne({ _id: testUserId2 });
      const response = await request(app)
        .get("/api/users/me")
        .set("Cookie", cookie);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "User not found",
      });
    });
  });

  describe("DELETE - deleteAccount", () => {
    let token;
    let testUser3;
    let testUserId3;
    let cookie;

    beforeEach(async () => {
      testUser2 = new User({
        username: "testUser3",
        email: "test3@email.com",
        password: "password",
      });

      await testUser3.save();
      token = generateToken(testUser3._id);
      testUserId3 = testUser3._id;
      cookie = `token=${token}; HttpOnly; Path=/; Secure`;
    });

    afterEach(async () => {
      await User.deleteMany();
    });

    test("When the token is valid and the user exists, delete all user data from the database", async () => {
      const response = await request(app)
        .delete("/api/users/me")
        .set("Cookie", cookie);
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: "User successfully deleted" });
    });
  });
});
