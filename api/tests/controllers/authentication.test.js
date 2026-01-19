const app = require("../../app");
const request = require("supertest");
const User = require("../../models/users");
const { hashPassword, comparePasswords } = require("../../utils/hashing_utils");
require("../../mongodb_helper");

describe("TESTS FOR /authentication ENDPOINT", () => {
  describe("POST - signInUser", () => {
    let user;

    beforeEach(async () => {
      let encrypted_password = await hashPassword("password");

      user = new User({
        username: "AuthTestUser",
        email: "auth_test@email.com",
        password: encrypted_password,
      });

      await user.save();
    });
        
    afterEach(async () => {
      await User.deleteMany();
    });

    test("When a user exists in the database, and the request is built correctly, the user is signed-in successfully", async () => {
      const response = await request(app)
        .post("/api/authentication")
        .send({
          email: "auth_test@email.com",
          password: "password",
        });
            
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: "User signed-in successfully",
        signedInUser: {
          username: "AuthTestUser",
          email: "auth_test@email.com"
        }
      });
    });
      
    test("When the e-mail is unspecified, the user cannot sign-in", async () => {
      const response = await request(app)
        .post("/api/authentication")
        .send({
          password: "password",
        });
            
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Invalid e-mail or password",
      });
    });

    test("When the password is unspecified, the user cannot sign-in", async () => {
      const response = await request(app).post("/api/authentication").send({
        email: "auth_test@email.com",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Invalid e-mail or password",
      });
    });

    test("When the password is incorrect, the user cannot sign-in", async () => {
      const response = await request(app)
        .post("/api/authentication")
        .send({
          email: "auth_test@email.com",
          password: "incorrect_password",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Invalid e-mail or password",
      });
    });

    test("When the user does not exist, authentication fails", async () => {
      const response = await request(app).post("/api/authentication").send({
        email: "nonexistent@email.com",
        password: "password",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Invalid e-mail or password",
      });
    });
  });
  
  describe("POST - signOutUser", () => {
    let user;
    let token;
    let cookie;

    beforeEach(async () => {
      user = new User({
        username: "AuthTestUser",
        email: "auth_test@email.com",
        password: await hashPassword("password"),
      });
      await user.save();

      const response = await request(app)
        .post("/api/authentication")
        .send({ email: user.email, password: "password" });

      cookie = response.headers["set-cookie"];
    });

    afterEach(async () => {
      await User.deleteMany();
    });

    test("When the user attempts to sign out, the token cookie is cleared and response confirms sign-out", async () => {
      const response = await request(app)
        .post("/api/authentication/sign-out-user")
        .set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Signed out successfully",
      });

      // The cookie should be cleared
      const clearedCookie = response.headers["set-cookie"][0];
      expect(clearedCookie).toMatch(/ACCESS_TOKEN=;/);
      expect(clearedCookie).toMatch(/Expires=/);
    });
  });

  describe("PATCH - resetLoggedInUserPassword", () => {
    let user;
    let token;
    let cookie;

    beforeEach(async () => {
      user = new User({
        username: "AuthTestUser",
        email: "auth_test@email.com",
        password: await hashPassword("password"),
      });
      await user.save();

      const response = await request(app)
        .post("/api/authentication")
        .send({ email: user.email, password: "password" });

      cookie = response.headers["set-cookie"];
    });

    afterEach(async () => {
      await User.deleteMany();
    });

    test("When a signed-in user attempts to reset their passwords, they should succeed if they entered their old password correctly", async () => {
      const response = await request(app)
        .patch("/api/authentication/password-reset-authenticated-user")
        .send({ oldPassword: "password", newPassword: "newPassword" })
        .set("Cookie", cookie);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: "User password updated successfully",
      });
      
      //Check the password was update in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords("newPassword", updatedUser.password);
      expect(isPasswordChanged).toBeTruthy();
    });

    test("When a signed-in user attempts to reset their passwords, they should not succeed if they didn't enter their old password correctly", async () => {
      const response = await request(app)
        .patch("/api/authentication/password-reset-authenticated-user")
        .send({ oldPassword: "wrongPassword", newPassword: "newPassword" })
        .set("Cookie", cookie);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Password reset failed",
      });

      //Check the password didn't change in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords(
        "password",
        updatedUser.password
      );
      expect(isPasswordChanged).toBeTruthy();
    });
  });
});