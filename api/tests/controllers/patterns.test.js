const app = require("../../app");
const request = require("supertest");
const User = require("../../models/users");
const { hashPassword } = require("../../utils/encryption_utils");
const { generateToken } = require("../../utils/jwt_token_utils");
require("../../mongodb_helper");


describe("TESTS FOR /patterns ENDPOINT", () => {
    describe("POST - savePattern", () => {
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
        
        test("When the user and pattern name are valid, a pattern is savec in the database", async () => {
            const response = await request(app)
                .post("/api/patterns")
                .set("Cookie", cookie)
                .send({
                    chestCircumference: 10,
                    armLength: 10,
                    armCircumference: 10,
                    bodyLength: 10,
                    shoulderWidth: 10,
                    preferredUnit: 10,
                    patternName: "Blue Jumper",
                });
            
            expect(response.body).toMatchObject({
                message: `Pattern ${response.body.pattern._id} has been created`,
                pattern: {
                    patternName: "Blue Jumper",
                    user: userId.toString(),
                    chestCircumference: 10,
                    armLength: 10,
                    armCircumference: 10,
                    bodyLength: 10,
                    shoulderWidth: 10,
                    preferredUnit: "10",
                },
            });
        });

        test("If the user is not logged in with a valid token, the server returns an authentication error", async () => {
            const response = await request(app)
                .post("/api/patterns")
                .send({
                    chestCircumference: 10,
                    armLength: 10,
                    armCircumference: 10,
                    bodyLength: 10,
                    shoulderWidth: 10,
                    preferredUnit: 10,
                    patternName: "Blue Jumper",
                });

            expect(response.body).toEqual({ message: "Could not verify token" });
        });

        test("If the user does not exist in the database, the server responds with an error", async () => {
            await User.findByIdAndDelete({ _id: userId });
           
            const response = await request(app)
              .post("/api/patterns")
              .set("Cookie", cookie)
              .send({
                chestCircumference: 10,
                armLength: 10,
                armCircumference: 10,
                bodyLength: 10,
                shoulderWidth: 10,
                preferredUnit: 10,
                patternName: "Blue Jumper",
              });


          expect(response.body).toEqual({ message: "User not found" });
        });

        test("If there is no pattern name, the server responds with an error and doesn't save a pattern in the dabatase", async () => {
            const response = await request(app)
                .post("/api/patterns")
                .set("Cookie", cookie)
                .send({
                    chestCircumference: 10,
                    armLength: 10,
                    armCircumference: 10,
                    bodyLength: 10,
                    shoulderWidth: 10,
                    preferredUnit: 10,
                   
                });
            expect(response.body).toEqual({ message: "Missing required field: patternName" });
        });
    });
});
