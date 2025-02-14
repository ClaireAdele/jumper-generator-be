const app = require("../../app");
const request = require("supertest");
const User = require("../../models/users");
const { hashPassword } = require("../../utils/encryption_utils");
const { generateToken } = require("../../utils/jwt_token_utils");
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
            
            expect(response.body).toEqual({
                message: "Invalid e-mail or password",
            });
        });
    });
});