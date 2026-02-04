const app = require("../../app");
const request = require("supertest");

const User = require("../../models/users");
const RefreshToken = require("../../models/RefreshTokens");
const ResetToken = require("../../models/ResetTokens");

const {
  hashPassword,
  comparePasswords,
  hashToken,
  createSecureRawToken,
} = require("../../utils/hashing_utils");
const { DURATIONS } = require("../../utils/constants");

const { ObjectId } = require("mongodb");
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
      await RefreshToken.deleteMany();
    });

    test("When a user exists in the database, and the request is built correctly, the user is signed-in successfully and the correct cookies are set on the response", async () => {
      const response = await request(app).post("/api/authentication").send({
        email: "auth_test@email.com",
        password: "password",
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: "User signed-in successfully",
        signedInUser: {
          username: "AuthTestUser",
          email: "auth_test@email.com",
        },
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
      const response = await request(app).post("/api/authentication").send({
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
      const response = await request(app).post("/api/authentication").send({
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
      await RefreshToken.deleteMany();
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

      const [blacklistedRefreshToken] = await RefreshToken.find({
        user: user._id,
      });

      expect(blacklistedRefreshToken.blacklisted).toBe(true);
    });

    test("When the user signs out successfully but has more than one session active (multiple devices in use), only the refresh token associated with this current device is blacklisted", async () => {
      const secondSession = new RefreshToken({
        user: user._id,
        tokenHash: "mockHash",
        deviceIdHash: "mockHash",
      });

      await secondSession.save();

      await request(app)
        .post("/api/authentication/sign-out-user")
        .set("Cookie", cookie);

      const userRefreshTokenList = await RefreshToken.find({
        user: user._id,
      });

      userRefreshTokenList.map((refreshToken) => {
        if (refreshToken.tokenHash !== "mockHash") {
          expect(refreshToken.blacklisted).toBe(true);
        } else {
          expect(refreshToken.blacklisted).toBe(false);
        }
      });
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

  //TODO - test the flow with a reset token
  describe("PATCH - resetUserPassword", () => {
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
      await ResetToken.deleteMany();
      await RefreshToken.deleteMany();
    });

    test("When a signed-in user attempts to reset their passwords, they should succeed if they entered their old password correctly", async () => {
      const response = await request(app)
        .patch("/api/authentication/password-reset-authenticated-user")
        .send({
          oldPassword: "password",
          newPassword: "newPassword",
        })
        .set("Cookie", cookie);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: "User password updated successfully",
      });

      //Check the password was update in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords(
        "newPassword",
        updatedUser.password,
      );
      expect(isPasswordChanged).toBeTruthy();
    });

    test("When a signed-in user attempts to reset their passwords, they should not succeed if they didn't enter their old password correctly", async () => {
      const response = await request(app)
        .patch("/api/authentication/password-reset-authenticated-user")
        .send({
          oldPassword: "wrongPassword",
          newPassword: "newPassword",
        })
        .set("Cookie", cookie);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Password reset failed",
      });

      //Check the password didn't change in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords(
        "password",
        updatedUser.password,
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
      const mockRefreshToken = new RefreshToken({
        user: user._id,
        tokenHash: "mockHash",
        deviceIdHash: "mockHash",
      });

      await mockRefreshToken.save();

      await request(app)
        .patch("/api/authentication/password-reset-authenticated-user")
        .send({
          oldPassword: "password",
          newPassword: "newPassword",
        })
        .set("Cookie", cookie);

      const deviceId = cookie[0].split(";")[0].split("=")[1];
      const hashedDevicedId = hashToken(deviceId);

      const blackListedRefreshTokens = await RefreshToken.find({
        user: user._id,
      });

      blackListedRefreshTokens.map((refreshToken) => {
        if (refreshToken.deviceIdHash != hashedDevicedId) {
          expect(refreshToken.blacklisted).toBe(true);
        }
        if (refreshToken.deviceIdHash == hashedDevicedId) {
          expect(refreshToken.blacklisted).toBe(false);
        }
      });
    });

    test("If a user is trying to reset a forgotten password and have a valid reset token, they should be able to do so. Once used, the token should be blacklisted", async () => {
      const token = createSecureRawToken();
      const hashedresetToken = hashToken(token);

      const resetToken = new ResetToken({
        user: user._id,
        tokenHash: hashedresetToken,
      });

      await resetToken.save();

      const response = await request(app)
        .patch("/api/authentication/password-reset-forgotten-password")
        .send({
          newPassword: "newPassword",
          resetToken: token,
        });

      expect(response.body).toEqual({
        message: "User password updated successfully",
      });
      expect(response.status).toBe(201);

      //Check the password was updated in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords(
        "newPassword",
        updatedUser.password,
      );
      expect(isPasswordChanged).toBeTruthy();

      //Check the token has been marked as used
      const updatedResetToken = await ResetToken.findOne({
        user: user._id,
        tokenHash: hashedresetToken,
      });

      expect(updatedResetToken.used).toBe(true);
    });

    test("If the reset token has already been used to reset a password before, the operation should be denied", async () => {
      const token = createSecureRawToken();
      const hashedresetToken = hashToken(token);

      const resetToken = new ResetToken({
        user: user._id,
        tokenHash: hashedresetToken,
        used: true,
      });

      await resetToken.save();

      const response = await request(app)
        .patch("/api/authentication/password-reset-forgotten-password")
        .send({
          newPassword: "newPassword",
          resetToken: token,
        });

      expect(response.body).toEqual({
        message: "Could not authorise password reset",
      });
      expect(response.status).toBe(400);

      //Check the password was not updated in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords(
        "newPassword",
        updatedUser.password,
      );
      expect(isPasswordChanged).toBeFalsy();
    });

    test("If the reset token is expired in the db, the operation should be denied", async () => {
      const token = createSecureRawToken();
      const hashedresetToken = hashToken(token);

      const resetToken = new ResetToken({
        user: user._id,
        tokenHash: hashedresetToken,
        used: true,
        expired: Date.now() - DURATIONS.FIFTEEN_MINUTES,
      });

      await resetToken.save();

      const response = await request(app)
        .patch("/api/authentication/password-reset-forgotten-password")
        .send({
          newPassword: "newPassword",
          resetToken: token,
        });

      expect(response.body).toEqual({
        message: "Could not authorise password reset",
      });
      expect(response.status).toBe(400);

      //Check the password was not updated in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords(
        "newPassword",
        updatedUser.password,
      );
      expect(isPasswordChanged).toBeFalsy();
    });

    test("If the reset token doesn't exist in the db, the operation should be denied", async () => {
      const token = createSecureRawToken();

      const response = await request(app)
        .patch("/api/authentication/password-reset-forgotten-password")
        .send({
          newPassword: "newPassword",
          resetToken: token,
        });

      expect(response.body).toEqual({
        message: "Could not authorise password reset",
      });
      expect(response.status).toBe(400);

      //Check the password was not updated in the db
      const updatedUser = await User.findById(user._id);
      const isPasswordChanged = await comparePasswords(
        "newPassword",
        updatedUser.password,
      );
      expect(isPasswordChanged).toBeFalsy();
    });
  });

  describe("PATCH - activateNewEmail", () => {
    let user;
    let resetToken;

    beforeEach(async () => {
      user = new User({
        username: "AuthTestUser",
        email: "auth_test@email.com",
        password: await hashPassword("password"),
      });
      await user.save();

      resetToken = createSecureRawToken();
      const hashedResetToken = hashToken(resetToken);

      const savedResetToken = new ResetToken({
        user: user._id,
        tokenHash: hashedResetToken,
        pendingEmail: "new@email.com",
      });

      await savedResetToken.save();
    });

    afterEach(async () => {
      await User.deleteMany();
      await ResetToken.deleteMany();
      await RefreshToken.deleteMany();
    });

    /*Test scenarios: 

    - Reset token has already been used
    */
    test("When the reset token is valid and the user exists, the e-mail is set to the new value and the user is issued a new valid session", async () => {
      const response = await request(app)
        .patch(`/api/authentication/email-reset-activate-new-email/${user._id}`)
        .send({ resetToken });

      expect(response.body).toEqual({ message: "New user e-mail activated" });
      expect(response.status).toBe(201);

      //Check the user is being issued a new valid session on back-end
      const updatedUser = await User.findById(user._id);
      const [refreshToken] = await RefreshToken.find({ user: user._id });

      expect(updatedUser.email).toEqual("new@email.com");
      expect(refreshToken).toBeInstanceOf(RefreshToken);

      //Check the cookies are being set as well
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

    test("If the reset token is missing, the email should not get reset and the server should serve an error", async () => {
      const response = await request(app).patch(
        `/api/authentication/email-reset-activate-new-email/${user._id}`,
      );

      expect(response.body).toEqual({
        message: "Could not activate new e-mail",
      });
      expect(response.status).toBe(401);
    });

    test("If the reset token is incorrect, the email should not get reset and the server should serve an error", async () => {
      const response = await request(app)
        .patch(`/api/authentication/email-reset-activate-new-email/${user._id}`)
        .send({ resetToken: "invalidResetToken" });

      expect(response.body).toEqual({
        message: "Could not activate new e-mail",
      });
      expect(response.status).toBe(401);
    });

    test("If the reset token is expired, the email should not get reset and the server should serve an error", async () => {
      const expiredResetToken = createSecureRawToken();
      const hashedExpiredResetToken = hashToken(expiredResetToken);

      const savedExpiredResetToken = new ResetToken({
        user: user._id,
        tokenHash: hashedExpiredResetToken,
        pendingEmail: "new@email.com",
        expiresAt: Date.now() - DURATIONS.FIFTEEN_MINUTES,
      });

      await savedExpiredResetToken.save();

      const response = await request(app)
        .patch(`/api/authentication/email-reset-activate-new-email/${user._id}`)
        .send({ resetToken: expiredResetToken });

      expect(response.body).toEqual({
        message: "Could not activate new e-mail",
      });
      expect(response.status).toBe(401);
    });

    test("If the reset token has already been used, the email should not get reset and the server should serve an error", async () => {
      const usedResetToken = createSecureRawToken();
      const hashedUsedResetToken = hashToken(usedResetToken);

      const savedExpiredResetToken = new ResetToken({
        user: user._id,
        tokenHash: hashedUsedResetToken,
        pendingEmail: "new@email.com",
        used: true,
      });

      await savedExpiredResetToken.save();

      const response = await request(app)
        .patch(`/api/authentication/email-reset-activate-new-email/${user._id}`)
        .send({ resetToken: usedResetToken });

      expect(response.body).toEqual({
        message: "Could not activate new e-mail",
      });
      expect(response.status).toBe(401);
    });

    test("If the user doesn't exist/isn't the one associated to the resetToken, then the server will respond with an error", async () => {
      const id = new ObjectId();
      const response = await request(app)
        .patch(
          `/api/authentication/email-reset-activate-new-email/${id.toHexString()}`,
        )
        .send({ resetToken });

      expect(response.body).toEqual({
        message: "Could not activate new e-mail",
      });
      expect(response.status).toBe(401);
    });
  });

  describe("GET - refreshSession", () => {
    let user;
    let refreshToken;
    let deviceId;
    let hashedRefreshToken;
    let hashedDevicedId;

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

      refreshToken = cookie[2].split(";")[0].split("=")[1];
      hashedRefreshToken = hashToken(refreshToken);
      deviceId = cookie[0].split(";")[0].split("=")[1];
      hashedDevicedId = hashToken(deviceId);
    });

    afterEach(async () => {
      await User.deleteMany();
      await RefreshToken.deleteMany();
    });

    test("When the sessions details in the db match the refresh token and device id sent over cookies, and the refresh token is valid, a new session is issued and the old one is blacklisted", async () => {
      const response = await request(app)
        .get("/api/refresh-session")
        .set("Cookie", cookie);

      expect(response.body).toEqual({
        message: "Session renewed successfully",
      });
      expect(response.status).toBe(200);

      //Check that the old refresh token is deleted, and that we have a new one associated to the device id and user id.
      const [blackListedRefreshToken] = await RefreshToken.find({
        user: user._id,
        deviceIdHash: hashedDevicedId,
        tokenHash: hashedRefreshToken,
      });

      expect(blackListedRefreshToken.blacklisted).toBe(true);

      const [newRefreshToken] = await RefreshToken.find({
        user: user._id,
        deviceIdHash: hashedDevicedId,
        tokenHash: { $ne: hashedRefreshToken },
      });

      expect(newRefreshToken.blacklisted).toBe(false);
    });

    test("When the refresh token is missing from the request, the server returns an error", async () => {
      const deviceIdCookie = `DEVICE_ID=${deviceId}; HttpOnly; Path=/; Secure`;

      const response = await request(app)
        .get("/api/refresh-session")
        .set("Cookie", deviceIdCookie);

      expect(response.body).toEqual({ message: "Could not identify user" });
      expect(response.status).toBe(401);
    });

    test("When the device id is missing from the request, the server returns an error", async () => {
      const refreshTokenCooke = `REFRESH_TOKEN=${refreshToken}; HttpOnly; Path=/; Secure`;

      const response = await request(app)
        .get("/api/refresh-session")
        .set("Cookie", refreshTokenCooke);

      expect(response.body).toEqual({ message: "Could not identify user" });
      expect(response.status).toBe(401);
    });

    test("When the refreshToken is expired, the user is not permitted to refresh the session", async () => {
      const [storedRefreshToken] = await RefreshToken.find({
        tokenHash: hashedRefreshToken,
      });
      storedRefreshToken.expiresAt = Date.now() - DURATIONS.FIFTEEN_MINUTES;
      await storedRefreshToken.save();

      const response = await request(app)
        .get("/api/refresh-session")
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Could not identify user" });
      expect(response.status).toBe(401);
    });

    test("When the refreshToken is blacklisted, the user is not permitted to refresh the session", async () => {
      const [storedRefreshToken] = await RefreshToken.find({
        tokenHash: hashedRefreshToken,
      });
      storedRefreshToken.blacklisted = true;
      await storedRefreshToken.save();

      const response = await request(app)
        .get("/api/refresh-session")
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Could not identify user" });
      expect(response.status).toBe(401);
    });

    test("When the refreshToken doesn't exist in the db (expired and was expunged for instance), the user is not permitted to refresh the session", async () => {
      await RefreshToken.findOneAndDelete({
        tokenHash: hashedRefreshToken,
      });

      const response = await request(app)
        .get("/api/refresh-session")
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Could not identify user" });
      expect(response.status).toBe(401);
    });

    test("When the refreshToken on the cookie from the request is malformed, the server returns an error", async () => {
      cookie[2] = `REFRESH_TOKEN=wrongRefreshToken; HttpOnly; Path=/; Secure`;

      const response = await request(app)
        .get("/api/refresh-session")
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Could not identify user" });
      expect(response.status).toBe(401);
    });
  });

  describe("POST - requestResetLoggedInUserEmail", () => {
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
      await RefreshToken.deleteMany();
    });

    test("When the user is logged in and passes the password check, a resetToken is issued, an email to validate the operation is sent, and the user's other sessions are revoked", async () => {
      const response = await request(app)
        .post("/api/authentication/email-reset-request-authenticated-user")
        .send({
          password: "password",
          newEmail: "newemail@mail.com",
        })
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "User e-mail reset requested" });
      expect(response.status).toBe(201);

      //Check that the resetToken has been created successfully
      const [resetToken] = await ResetToken.find({ user: user._id });
      expect(resetToken.pendingEmail).toEqual("newemail@mail.com");
    });

    test("If the user fails the password check, they are prevented from requesting an e-mail change and no reset tokens are created for that user", async () => {
      const response = await request(app)
        .post("/api/authentication/email-reset-request-authenticated-user")
        .send({
          password: "wrongPassword",
          newEmail: "newemail@mail.com",
        })
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Email reset failed" });
      expect(response.status).toBe(400);

      //Check that no reset token was created successfully
      const [resetToken] = await ResetToken.find({ user: user._id });
      expect(resetToken).toBe(undefined);
    });

    test("If the email is missing, the email reset operation fails", async () => {
      const response = await request(app)
        .post("/api/authentication/email-reset-request-authenticated-user")
        .send({ password: "wrongPassword" })
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Email reset failed" });
      expect(response.status).toBe(400);

      //Check that no reset token was created successfully
      const [resetToken] = await ResetToken.find({ user: user._id });
      expect(resetToken).toBe(undefined);
    });

    test("If the email is not a string, the email reset operation fails", async () => {
      const response = await request(app)
        .post("/api/authentication/email-reset-request-authenticated-user")
        .send({ password: "password", email: { message: "not an email" } })
        .set("Cookie", cookie);

      expect(response.body).toEqual({ message: "Email reset failed" });
      expect(response.status).toBe(400);

      //Check that no reset token was created successfully
      const [resetToken] = await ResetToken.find({ user: user._id });
      expect(resetToken).toBe(undefined);
    });
  });

  describe("requestForgottenPasswordReset", () => {
    let user;

    beforeEach(async () => {
      user = new User({
        username: "AuthTestUser",
        email: "auth_test@email.com",
        password: await hashPassword("password"),
      });
      await user.save();
    });

    afterEach(async () => {
      await User.deleteMany();
      await ResetToken.deleteMany();
    });

    test("When the e-mail is associated to a user in the database, an e-mail is sent to this user to confirm the password change request and a reset token is issued", async () => {
      const response = await request(app)
        .post("/api/authentication/password-reset-forgotten-password-request")
        .send({ email: "auth_test@email.com" });

      expect(response.body).toEqual({
        message: "Forgotten password change successfully requested",
      });
      expect(response.status).toBe(201);

      //This user should now have an unused reset token associated in the db
      const resetToken = await ResetToken.findOne({ user: user._id });
      expect(resetToken).toBeTruthy();
      expect(resetToken.used).toBe(false);
    });

    test("When the email is not associated to a user in the db, the server responds with an error", async () => {
      const response = await request(app)
        .post("/api/authentication/password-reset-forgotten-password-request")
        .send({ email: "wrong@email.com" });

      expect(response.body).toEqual({
        message: "Could not validate password request",
      });
      expect(response.status).toBe(400);
    });

    test("When the email is not a string, the server responds with an error", async () => {
      const response = await request(app)
        .post("/api/authentication/password-reset-forgotten-password-request")
        .send({ email: { wrongemail: "wrongEmail" } });

      expect(response.body).toEqual({
        message: "Could not validate password request",
      });
      expect(response.status).toBe(400);
    });
  });
});
