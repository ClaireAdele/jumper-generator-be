const app = require("../../app");
const request = require("supertest");
const User = require("../../models/users");
const { hashPassword, comparePasswords, hashToken, createSecureRawToken } = require("../../utils/hashing_utils");
const { DURATIONS } = require("../../utils/constants");
const RefreshToken = require("../../models/RefreshToken");
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

    test("When a user exists in the database, and the request is built correctly, the user is signed-in successfully and the correct cookies are set on the response", async () => {
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

      // The cookies should be set correctly
      const deviceId = response.headers["set-cookie"][0];
      expect(deviceId).toMatch(/DEVICE_ID=/);
      expect(deviceId).toMatch(/Expires=/);

      const accessCookie = response.headers["set-cookie"][1];
      expect(accessCookie).toMatch(/ACCESS_TOKEN=/);
      expect(accessCookie).toMatch(/Expires=/);

      const refreshCookie = response.headers["set-cookie"][2];
      expect(refreshCookie).toMatch(/REFRESH_TOKEN=/);
      expect(refreshCookie).toMatch(/Expires=/);
    });

    test("When a user exists in the database, and the request is built correctly, a refresh token is stored correctly in the database, with the correct associated session information", async () => {
      const response = await request(app).post("/api/authentication").send({
        email: "auth_test@email.com",
        password: "password",
      });

      const [savedRefreshToken] = await RefreshToken.find({ user: user._id });

      //The refresh token should exist in the database and be registered to that use
      expect(savedRefreshToken).toBeTruthy();

      // The information sent back as cookies should match the session data in the database
      const deviceId = response.headers["set-cookie"][0]
        .split(";")[0]
        .split("=")[1];
      
      const refreshToken = response.headers["set-cookie"][2]
        .split(";")[0]
        .split("=")[1];
      
      const hashedDeviceId = hashToken(deviceId);
      const hashedRefreshToken = hashToken(refreshToken);

      expect(savedRefreshToken.tokenHash).toEqual(hashedRefreshToken);
      expect(savedRefreshToken.deviceIdHash).toEqual(hashedDeviceId);
    });

    test("When a user exists in the database, and their device has been logged-in from before, the refresh token created in the db uses this device id instead of generating a new one", async () => {
      const deviceId = createSecureRawToken();
      const hashedDeviceId = hashToken(deviceId); 

      const cookie = `DEVICE_ID=${deviceId}; HttpOnly; Path=/; Secure`;

      await request(app)
        .post("/api/authentication")
        .send({
          email: "auth_test@email.com",
          password: "password",
        })
        .set("Cookie", cookie);

      const [savedRefreshToken] = await RefreshToken.find({ user: user._id });

      //The refresh token should exist in the database and be registered to that user
      expect(savedRefreshToken).toBeTruthy();
      //The device id associated to the new session should be the same as the one we received from cookies
      expect(savedRefreshToken.deviceIdHash).toEqual(hashedDeviceId);
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
    let accessTokenCookie;
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
      accessTokenCookie = response.headers["set-cookie"][1];
    });

    afterEach(async () => {
      await User.deleteMany();
    });

    test("When the user attempts to sign out, the ACCESS_TOKEN and REFRESH_TOKEN cookies are cleared and response confirms sign-out", async () => {
      const response = await request(app)
        .post("/api/authentication/sign-out-user")
        .set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Signed out successfully",
      });

      // The cookie should be cleared
      const clearedAccessCookie = response.headers["set-cookie"][0];
      expect(clearedAccessCookie).toMatch(/ACCESS_TOKEN=;/);
      expect(clearedAccessCookie).toMatch(/Expires=/);

      const clearedRefreshCookie = response.headers["set-cookie"][1];
      expect(clearedRefreshCookie).toMatch(/REFRESH_TOKEN=;/);
      expect(clearedRefreshCookie).toMatch(/Expires=/);
    });

    test("When the user signs out successfully, the refresh token associated with the device they log-out from is blacklisted", async () => {
      await request(app)
        .post("/api/authentication/sign-out-user")
        .set("Cookie", cookie);

      const [ blacklistedRefreshToken ] = await RefreshToken.find({ user: user._id });

      expect(blacklistedRefreshToken.blacklisted).toBe(true);
    });

    test("When there is no active session, the user cannot log-out", async () => {
      const response = await request(app)
        .post("/api/authentication/sign-out-user")
        .set("Cookie", accessTokenCookie);
      
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          message: "No active session found",
        });
    });
  });

  describe("PATCH - resetLoggedInUserPassword", () => {
    let user;
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

    test("When the request is missing the newPassword or the oldPassword, it fails", async () => {
      const response = await request(app)
        .patch("/api/authentication/password-reset-authenticated-user")
        .set("Cookie", cookie);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Password reset failed",
      });
    });

    test("Once a user has sent a request to reset their password, they should get logged out of every other session", async () => {
      //TODO - to properly test this I need to create one extra refreshToken in DB for that device.
      const mockRefreshToken = new RefreshToken({
        user: user._id,
        tokenHash: "mockHash",
        deviceIdHash: "mockHash",
      });

      await mockRefreshToken.save();

      await request(app)
        .patch("/api/authentication/password-reset-authenticated-user")
        .send({ oldPassword: "password", newPassword: "newPassword" })
        .set("Cookie", cookie);
      
      const deviceId = cookie[0]
        .split(";")[0]
        .split("=")[1];
      const hashedDevicedId = hashToken(deviceId);

      const blackListedRefreshTokens = await RefreshToken.find({
        user: user._id,
      });

      blackListedRefreshTokens.map((refreshToken) => {
        if (refreshToken.deviceIdHash != hashedDevicedId) {
          expect(refreshToken.blacklisted).toBe(true);
        }
      });
    })

    //TODO: WRITE A TEST TO CHECK THAT THERE ARE NO MORE REFRESH TOKENS FOR THIS USER IN DB AFTER THE RESET
  });
});